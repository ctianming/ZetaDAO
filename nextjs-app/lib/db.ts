import { createClient } from '@supabase/supabase-js'
import { db, isDev } from './env'

const supabaseUrl = isDev() 
  ? (db.supabaseUrl || 'http://localhost:54321')
  : db.supabaseUrl

const supabaseAnonKey = isDev()
  ? (db.supabaseAnonKey || 'public-anon-key')
  : db.supabaseAnonKey

const serviceRoleKey = isDev()
  ? (db.supabaseServiceKey || 'service-role-key')
  : db.supabaseServiceKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
