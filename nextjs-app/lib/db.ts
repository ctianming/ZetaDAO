import { createClient } from '@supabase/supabase-js'

// Note: during `next build`, env vars might be absent in this workspace.
// Provide local fallbacks to prevent build-time crashes; real values must be configured in runtime env.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
)
