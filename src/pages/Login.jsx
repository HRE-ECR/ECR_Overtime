import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    })

    if (error) setMessage(error.message)
    else setMessage('Check your email for the magic link to sign in.')

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Welcome to OvertimeHub</h1>
        <p className="text-slate-300 text-sm mt-2">
          Sign in with your work email. You’ll receive a magic link.
        </p>

        <form onSubmit={signIn} className="mt-6 grid gap-3">
          <label className="text-sm font-bold text-slate-200">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="name@company.com"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20"
          />
          <button
            disabled={loading}
            className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
            {message}
          </div>
        ) : null}

        <div className="mt-5 text-xs text-slate-400">
          Admin access is controlled by your role in the Supabase <code>profiles</code> table.
        </div>
      </div>
    </div>
  )
}
