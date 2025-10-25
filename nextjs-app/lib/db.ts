import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

const isDev = process.env.NODE_ENV !== 'production'

const supabaseUrl = isDev
  ? requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
  : requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = isDev
  ? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key')
  : requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const serviceRoleKey = isDev
  ? requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
  : requireEnv('SUPABASE_SERVICE_ROLE_KEY')

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
