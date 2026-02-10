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

// Export a nullable client so the app doesn't hard-crash on Pages if env is wrong.
export const supabase =
  isValidHttpUrl(supabaseUrl) && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const supabaseConfigError =
  !isValidHttpUrl(supabaseUrl)
    ? `Invalid VITE_SUPABASE_URL: "${supabaseUrl || '(empty)'}"`
    : !supabaseAnonKey
      ? 'Missing VITE_SUPABASE_ANON_KEY'
      : ''
