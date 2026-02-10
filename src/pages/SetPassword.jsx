import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady, supabaseConfigError } from '../lib/supabaseClient'

export default function SetPassword() {
  const navigate = useNavigate()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setMsg('')

    if (!isSupabaseReady) {
      setMsg(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    if (pw1.length < 8) {
      setMsg('Password must be at least 8 characters.')
      return
    }

    if (pw1 !== pw2) {
      setMsg('Passwords do not match.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.updateUser({ password: pw1 })
    if (error) {
      setMsg(error.message)
      setLoading(false)
      return
    }

    const userId = data?.user?.id || (await supabase.auth.getUser()).data?.user?.id
    if (userId) {
      await supabase.from('profiles').update({ has_password: true }).eq('id', userId)
    }

    setLoading(false)
    navigate('/')
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Set a password</h1>
        <p className="text-slate-300 text-sm mt-2">This lets you sign in with email + password next time. You can still use Magic Link anytime.</p>

        <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="text-sm font-bold text-slate-200">New password</label>
          <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20"
            required autoComplete="new-password" />

          <label className="text-sm font-bold text-slate-200">Confirm password</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-white/20"
            required autoComplete="new-password" />

          <button disabled={loading} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold active:scale-[0.99] disabled:opacity-60">
            {loading ? 'Saving…' : 'Save password'}
          </button>
        </form>

        {msg ? (
          <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{msg}</div>
        ) : null}

        <button type="button" onClick={() => navigate('/')} className="mt-4 text-xs text-slate-400 underline">
          Skip for now (use Magic Links only)
        </button>
      </div>
    </div>
  )
}
