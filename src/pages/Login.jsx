import React, { useMemo, useState } from 'react'
import { supabase, isSupabaseReady, supabaseConfigError } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = useMemo(() => `${window.location.origin}${import.meta.env.BASE_URL}`, [])

  const signInWithPassword = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!isSupabaseReady) {
      setMessage(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setLoading(false)
  }

  const sendMagicLink = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!isSupabaseReady) {
      setMessage(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    })

    if (error) setMessage(error.message)
    else setMessage('Check your email for the magic link to sign in.')
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Welcome to OvertimeHub</h1>
        <p className="text-slate-300 text-sm mt-2">Sign in with your work email. Use password or Magic Link.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('password')}
            className={`px-4 py-3 rounded-2xl font-extrabold text-sm border ${mode==='password' ? 'bg-white text-navy-900 border-white' : 'bg-slate-950/40 text-slate-100 border-slate-700'}`}
          >Password</button>
          <button type="button" onClick={() => setMode('magic')}
            className={`px-4 py-3 rounded-2xl font-extrabold text-sm border ${mode==='magic' ? 'bg-white text-navy-900 border-white' : 'bg-slate-950/40 text-slate-100 border-slate-700'}`}
          >Magic Link</button>
        </div>

        <div className="mt-5 grid gap-2">
          <label className="text-sm font-bold text-slate-200">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="name@company.com"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20"
            autoComplete="email"
          />
        </div>

        {mode === 'password' ? (
          <form onSubmit={signInWithPassword} className="mt-4 grid gap-3">
            <label className="text-sm font-bold text-slate-200">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="Your password"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20"
              autoComplete="current-password"
            />
            <button disabled={loading} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold active:scale-[0.99] disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="text-xs text-slate-400">Forgot password? Use <b>Magic Link</b> to get in, then set a new password.</div>
          </form>
        ) : (
          <form onSubmit={sendMagicLink} className="mt-4 grid gap-3">
            <button disabled={loading} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold active:scale-[0.99] disabled:opacity-60">
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            <div className="text-xs text-slate-400">We’ll email you a one-time sign-in link. After signing in, you can set a password.</div>
          </form>
        )}

        {message ? (
          <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{message}</div>
        ) : null}
      </div>
    </div>
  )
}
