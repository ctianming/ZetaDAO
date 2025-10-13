import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { cookies } from 'next/headers'
import { verifyMessage, type Address, type Hex } from 'viem'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: 'password',
      name: 'password',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.toLowerCase().trim()
        const password = credentials?.password || ''
        if (!identifier || !password) return null
        // Find by email or username in local auth table
        const { data: user } = await supabaseAdmin
          .from('auth_local_users')
          .select('*')
          .or(`email.eq.${identifier},username.eq.${identifier}`)
          .limit(1)
          .single()
        if (!user || !user.password_hash) return null
        if (!user.email_verified_at) return null
        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return null
        return { id: user.email, name: user.username || user.email, email: user.email }
      },
    }),
    CredentialsProvider({
      name: 'wallet',
      credentials: {
        address: { label: 'Address', type: 'text' },
        message: { label: 'Message', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const address = (credentials?.address || '').toLowerCase()
          const message = credentials?.message || ''
          const signature = credentials?.signature || ''
          if (!address || !message || !signature) return null

          // Verify nonce via cookie
          const nonceCookie = cookies().get('wallet_nonce')?.value
          if (!nonceCookie || !message.includes(nonceCookie)) return null

          const ok = await verifyMessage({ address: address as Address, message, signature: signature as Hex })
          if (!ok) return null

          // Upsert user record if not exists
          await supabaseAdmin.from('users').upsert({ wallet_address: address }, { onConflict: 'wallet_address' })

          return { id: address, name: address as string, email: undefined as any }
        } catch (e) {
          console.error('wallet authorize error', e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Attach walletAddress if present
      if (user?.id && /^0x[a-f0-9]{40}$/.test(user.id as string)) {
        token.walletAddress = user.id
      }
      // Attach email from provider
      if (!token.email && (user as any)?.email) token.email = (user as any).email
      if (!token.email && (profile as any)?.email) token.email = (profile as any).email
      // Preserve existing
      return token
    },
    async session({ session, token }) {
      if (token?.walletAddress) (session as any).walletAddress = token.walletAddress
      // hydrate username from DB if available
      try {
        let identifier: string | undefined = undefined
        if ((session as any).walletAddress) identifier = (session as any).walletAddress
        else if (token?.email) identifier = token.email as string
        if (identifier) {
          let query = supabaseAdmin.from('users').select('username,wallet_address,email').limit(1)
          if ((session as any).walletAddress) query = query.eq('wallet_address', (session as any).walletAddress)
          else query = query.eq('email', token.email as string)
          const { data } = await query.single()
          if (data?.username && session.user) session.user.name = data.username
        }
      } catch {}
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
}
