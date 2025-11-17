import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'
import { supabaseAdmin } from '@/lib/db'
import { auth as authConfig } from '@/lib/env'
import bcrypt from 'bcryptjs'

// Validate critical auth environment variables
if (!authConfig.secret || authConfig.secret === 'dev-secret') {
  console.error('❌ [NextAuth] NEXTAUTH_SECRET is not set or using default value!')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET must be set in production')
  }
}

if (!authConfig.googleClientId || !authConfig.googleClientSecret) {
  console.warn('⚠️  [NextAuth] Google OAuth credentials not configured. Google sign-in will be disabled.')
}

if (!authConfig.githubClientId || !authConfig.githubClientSecret) {
  console.warn('⚠️  [NextAuth] GitHub OAuth credentials not configured. GitHub sign-in will be disabled.')
}

// Helper: find existing user by OAuth identity (DO NOT auto-create)
async function findUserByOAuthIdentity(provider: string, accountId: string) {
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
  // DO NOT auto-create - require registration first
  return null
}

// Helper: create user & identity (used after registration)
async function createUserWithIdentity(provider: string, accountId: string, profile?: any) {
  if (!accountId) return null
  
  // Create base user row
  const baseUser = {
    uid: undefined,
    username: null,
    wallet_address: null, // Wallet is decoupled from account
    avatar_url: profile?.picture || profile?.avatar_url || null,
    bio: null,
  }
  const { data: newUser, error: userErr } = await supabaseAdmin
    .from('users')
    .insert(baseUser)
    .select('uid')
    .single()
  if (userErr || !newUser?.uid) throw new Error('Failed to create user')
  
  // Create identity
  await supabaseAdmin.from('user_identities').insert({ 
    user_uid: newUser.uid, 
    provider, 
    account_id: accountId 
  })
  
  return newUser.uid
}

// Build providers array dynamically based on available credentials
const providers: any[] = []

// Add Google provider only if credentials are configured
if (authConfig.googleClientId && authConfig.googleClientSecret) {
  providers.push(
    Google({
      clientId: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
      // Do NOT allow automatic account linking - require explicit registration
      allowDangerousEmailAccountLinking: false,
    })
  )
} else {
  console.log('ℹ️  [NextAuth] Skipping Google provider (credentials not configured)')
}

// Add GitHub provider only if credentials are configured
if (authConfig.githubClientId && authConfig.githubClientSecret) {
  providers.push(
    GitHub({
      clientId: authConfig.githubClientId,
      clientSecret: authConfig.githubClientSecret,
      // Do NOT allow automatic account linking - require explicit registration
      allowDangerousEmailAccountLinking: false,
    })
  )
} else {
  console.log('ℹ️  [NextAuth] Skipping GitHub provider (credentials not configured)')
}

// Always add Credentials provider (email/password auth only)
providers.push(
  Credentials({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        identifier: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.toString().toLowerCase().trim()
        const password = credentials?.password?.toString() || ''
        
        if (!identifier || !password) {
          console.log('[Auth] Missing identifier or password')
          return null
        }
        
        // Find by email in local auth table
        const { data: user, error: userError } = await supabaseAdmin
          .from('auth_local_users')
          .select('*')
          .eq('email', identifier)
          .maybeSingle()
        
        if (userError) {
          console.error('[Auth] Database error:', userError)
          return null
        }
        
        if (!user || !user.password_hash) {
          console.log('[Auth] User not found or no password hash')
          return null
        }
        
        if (!user.email_verified_at) {
          console.log('[Auth] Email not verified')
          return null
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash)
        if (!passwordMatch) {
          console.log('[Auth] Password mismatch')
          return null
        }
        
        // Map to primary user uid via identity (email provider)
        let uid: string | null = null
        const { data: ident } = await supabaseAdmin
          .from('user_identities')
          .select('user_uid')
          .eq('provider', 'email')
          .eq('account_id', user.email)
          .maybeSingle()
        
        if (ident?.user_uid) {
          uid = ident.user_uid
        } else {
          // Create user and identity if not exists
          uid = await createUserWithIdentity('email', user.email, { avatar_url: null })
        }
        
        if (!uid) {
          console.log('[Auth] Failed to get or create user uid')
          return null
        }
        
        console.log('[Auth] Credentials login successful for:', user.email)
        return { 
          id: uid as string, 
          name: user.username || user.email, 
          email: user.email 
        }
      },
    })
)

// 在生产环境中明确设置 AUTH_URL 环境变量
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.AUTH_URL = authConfig.url
  console.log('[Auth] Setting AUTH_URL from config:', authConfig.url)
}

export const nextAuthConfig: NextAuthConfig = {
  trustHost: true,
  basePath: '/api/auth',
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // If provider OAuth (google/github), check if user exists
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        const provider = account.provider
        const accountId = (profile as any)?.sub || (profile as any)?.id || ''
        const email = (profile as any)?.email || ''
        
        if (accountId) {
          // Check if identity exists
          const userUid = await findUserByOAuthIdentity(provider, accountId)
          
          if (userUid) {
            // User exists, login successful
            token.uid = userUid
            token.email = email
            console.log(`[Auth] ${provider} login successful for existing user`)
          } else {
            // User does not exist - require registration
            console.log(`[Auth] ${provider} account not registered, blocking login`)
            token.error = 'OAuthAccountNotLinked'
            token.errorMessage = `此 ${provider === 'google' ? 'Google' : 'GitHub'} 账号尚未注册，请先注册账号`
            // Do not set token.uid - this will prevent session creation
          }
        }
      }
      
      // Credentials user object has id = uid
      if (user?.id && !token.uid) {
        token.uid = user.id as string
      }
      
      // Preserve email
      if (!token.email && (user as any)?.email) {
        token.email = (user as any).email
      }
      
      return token
    },
    async session({ session, token }) {
      // Handle OAuth errors
      if ((token as any)?.error) {
        (session as any).error = (token as any).error
        (session as any).errorMessage = (token as any).errorMessage
        // Return session without uid to indicate failed auth
        return session
      }
      
      if (token?.uid) {
        (session as any).uid = token.uid
        
        // Hydrate username / profile
        try {
          const { data } = await supabaseAdmin
            .from('users')
            .select('username,avatar_url,bio,xp_total')
            .eq('uid', token.uid)
            .single()
          
          
        } catch (err) {
          console.error('[Auth] Failed to hydrate user profile:', err)
        }
      }
      
      return session
    },
  },
  secret: authConfig.secret,
}

export const { handlers, auth, signIn, signOut } = NextAuth(nextAuthConfig)



