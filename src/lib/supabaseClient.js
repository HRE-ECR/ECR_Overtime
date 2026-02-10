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

// A safe stub so code never crashes with `supabase === null`
function createStub() {
  const unsub = () => {}
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: unsub } } }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithOtp: async () => ({ data: null, error: { message: supabaseConfigError || 'Supabase not configured' } }),
      signOut: async () => ({ error: null })
    },
    // Basic stubs so accidental calls don't hard-crash
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: supabaseConfigError || 'Supabase not configured' } }) }) }),
      insert: async () => ({ data: null, error: { message: supabaseConfigError || 'Supabase not configured' } }),
      upsert: async () => ({ data: null, error: { message: supabaseConfigError || 'Supabase not configured' } }),
      delete: () => ({ eq: async () => ({ data: null, error: { message: supabaseConfigError || 'Supabase not configured' } }) }),
      order: () => ({})
    })
  }
}

// If configured: real client. If not: stub (prevents `supabase.auth` crash)
export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createStub()
