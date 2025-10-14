import GoogleProvider from 'next-auth/providers/google'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { cookies } from 'next/headers'
import { verifyMessage, type Address, type Hex } from 'viem'
import { supabaseAdmin } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Helper: find or create user & identity
async function findOrCreateUserIdentity(provider: string, accountId: string, profile?: any) {
  if (!accountId) return null
  // Try existing identity
  const { data: ident } = await supabaseAdmin
    .from('user_identities')
    .select('id,user_uid,provider,account_id')
    .eq('provider', provider)
    .eq('account_id', accountId)
    .maybeSingle()
  if (ident?.user_uid) {
    return ident.user_uid
  }
  // Create base user row
  const baseUser = {
    uid: undefined, // let DB default uuid via upsert? we inserted explicit
    username: null,
    wallet_address: provider === 'wallet' ? accountId : null,
    avatar_url: profile?.picture || profile?.avatar_url || null,
    bio: null,
  }
  // Insert user (uid generated in DB migration ensures NOT NULL after generation)
  const { data: newUser, error: userErr } = await supabaseAdmin
    .from('users')
    .insert(baseUser)
    .select('uid,wallet_address')
    .single()
  if (userErr || !newUser?.uid) throw new Error('Failed to create user')
  // Insert identity mapping
  await supabaseAdmin.from('user_identities').insert({ user_uid: newUser.uid, provider, account_id: accountId })
  return newUser.uid
}

async function getUserUidByWallet(address: string) {
  const { data } = await supabaseAdmin
    .from('user_identities')
    .select('user_uid')
    .eq('provider', 'wallet')
    .eq('account_id', address)
    .single()
  return data?.user_uid
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
  error: '/auth/error',
  signIn: '/auth/error',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
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
        // Map to primary user uid via identity (email provider)
  let uid: string | null = null
        const { data: ident } = await supabaseAdmin
          .from('user_identities')
          .select('user_uid')
          .eq('provider', 'email')
          .eq('account_id', user.email)
          .single()
        if (ident?.user_uid) uid = ident.user_uid
        if (!uid) {
          uid = await findOrCreateUserIdentity('email', user.email, { avatar_url: null })
        }
  if (!uid) return null
  return { id: uid as string, name: user.username || user.email, email: user.email }
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

          // Resolve uid via identity or create
          let uid = await getUserUidByWallet(address)
          let isNew = false
          if (!uid) {
            uid = await findOrCreateUserIdentity('wallet', address)
            isNew = true
          }
          return { id: uid, name: address as string, email: undefined as any, newWalletUser: isNew, walletAddress: address } as any
        } catch (e) {
          console.error('wallet authorize error', e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // If provider OAuth (google/github), handle identity
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        const provider = account.provider
  const accountId = (profile as any)?.sub || (profile as any)?.id || ''
        if (accountId) {
          // get or create identity
          let userUid: string | null = null
          const { data: existing } = await supabaseAdmin
            .from('user_identities')
            .select('user_uid')
            .eq('provider', provider)
            .eq('account_id', accountId)
            .maybeSingle()
          if (existing?.user_uid) {
            userUid = existing.user_uid
          } else {
            userUid = await findOrCreateUserIdentity(provider, accountId, profile)
          }
          token.uid = userUid
        }
      }
      // Credentials user object has id = uid now
      if (user?.id && !token.uid) token.uid = user.id as string
      if ((user as any)?.walletAddress) token.walletAddress = (user as any).walletAddress
      if ((user as any)?.newWalletUser) (token as any).newWalletUser = true
      if (!token.email && (user as any)?.email) token.email = (user as any).email
      if (!token.email && (profile as any)?.email) token.email = (profile as any).email
      return token
    },
    async session({ session, token }) {
      if (token?.uid) (session as any).uid = token.uid
      if (token?.walletAddress) (session as any).walletAddress = token.walletAddress
      if ((token as any)?.newWalletUser) (session as any).newWalletUser = true
      // hydrate username / profile
      try {
        if (token?.uid) {
          const { data } = await supabaseAdmin
            .from('users')
            .select('username,avatar_url,bio')
            .eq('uid', token.uid)
            .single()
          if (data?.username && session.user) session.user.name = data.username
          if (data?.avatar_url) (session as any).avatarUrl = data.avatar_url
          if (data?.bio) (session as any).bio = data.bio
        }
      } catch {}
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
}
