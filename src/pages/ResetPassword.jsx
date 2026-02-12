import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady, supabaseConfigError } from '../lib/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isSupabaseReady) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    supabase.auth.getSession().then(({ data: s }) => { if (s?.session) setReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!isSupabaseReady) {
      setMessage(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    if (pw1.length < 8) { setMessage('Password must be at least 8 characters.'); return }
    if (pw1 !== pw2) { setMessage('Passwords do not match.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    if (error) { setMessage(error.message); setLoading(false); return }

    setLoading(false)
    setMessage('Password updated. You can sign in now.')
    setTimeout(() => navigate('/'), 700)
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Choose a new password</h1>
        <p className="text-slate-300 text-sm mt-2">{ready ? 'Enter your new password below.' : 'Open this page from the reset email link.'}</p>

        <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="text-sm font-bold text-slate-200">New password</label>
          <input value={pw1} onChange={(e) => setPw1(e.target.value)} type="password" required
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />

          <label className="text-sm font-bold text-slate-200">Confirm password</label>
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" required
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />

          <button disabled={loading || !ready} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        {message ? <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{message}</div> : null}
        <div className="mt-5 text-sm"><Link to="/" className="text-slate-200 underline">Back to sign in</Link></div>
      </div>
    </div>
  )
}
