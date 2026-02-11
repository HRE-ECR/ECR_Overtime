import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidHttpUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export const isSupabaseReady = Boolean(isValidHttpUrl(supabaseUrl) && supabaseAnonKey)

export const supabaseConfigError =
  !isValidHttpUrl(supabaseUrl)
    ? `Invalid VITE_SUPABASE_URL: ${supabaseUrl || '(empty)'}`
    : !supabaseAnonKey
      ? 'Missing VITE_SUPABASE_ANON_KEY'
      : ''

export const supabase = isSupabaseReady ? createClient(supabaseUrl, supabaseAnonKey) : null
