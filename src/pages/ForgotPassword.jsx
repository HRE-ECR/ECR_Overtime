import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseReady, supabaseConfigError } from '../lib/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = useMemo(
    () => `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    []
  )

  const send = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!isSupabaseReady) {
      setMessage(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) setMessage(error.message)
    else setMessage('Password reset email sent. Check your inbox.')

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Reset password</h1>
        <p className="text-slate-300 text-sm mt-2">We’ll email you a password reset link.</p>

        <form onSubmit={send} className="mt-6 grid gap-3">
          <label className="text-sm font-bold text-slate-200">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20" />

          <button disabled={loading} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
            {loading ? 'Sending…' : 'Send reset email'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{message}</div>
        ) : null}

        <div className="mt-5 text-sm">
          <Link to="/" className="text-slate-200 underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
