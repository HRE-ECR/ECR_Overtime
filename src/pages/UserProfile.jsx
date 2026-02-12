import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const TEAMS = ['Team1', 'Team2', 'Team3', 'Team4']
const BANDS = ['Band A', 'Band B']

function normalizeName(input) {
  let v = (input || '').trim()
  v = v.replace(/\s+/g, ' ')
  const m = v.match(/^([A-Za-z])\.?\s+(.+)$/)
  if (!m) return v
  const initial = m[1].toUpperCase()
  let surname = m[2].trim()
  surname = surname.split(' ').map(part =>
    part.split('-').map(seg => seg.length ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : seg).join('-')
  ).join(' ')
  return `${initial}. ${surname}`
}

function isValidName(v) {
  return /^[A-Z]\.\s+[A-Za-z][A-Za-z\s\-']+$/.test(v)
}

export default function UserProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [role, setRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [team, setTeam] = useState('')
  const [band, setBand] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    const userId = (await supabase.auth.getUser()).data?.user?.id

    const [{ data: p, error: pErr }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, role').eq('id', userId).single(),
      supabase.from('user_staffing').select('team, band').eq('user_id', userId).maybeSingle()
    ])

    if (pErr) setError(pErr.message)

    setRole(p?.role || '')
    setFullName(p?.full_name || '')
    setPhone(p?.phone || '')
    setTeam(s?.team || '')
    setBand(s?.band || '')

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setError('')
    setMessage('')

    const fixed = normalizeName(fullName)
    if (!isValidName(fixed)) {
      setError('Name must be in the format “J. Surname” (example: “J. Edwards”).')
      return
    }

    setSaving(true)
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fixed, phone: phone || null })
      .eq('id', userId)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    // Employees can set their own team/band. Managers do not need.
    if (role === 'employee') {
      const { error: sErr } = await supabase
        .from('user_staffing')
        .upsert({ user_id: userId, team: team || null, band: band || null }, { onConflict: 'user_id' })

      if (sErr) {
        setError(sErr.message)
        setSaving(false)
        return
      }
    }

    setMessage('Profile saved.')
    setFullName(fixed)
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">User Profile</h1>
      <p className="text-slate-300 text-sm mt-1">Set your display name (used in approvals and reports) and an optional contact number.</p>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {message ? <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">{message}</div> : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        {loading ? <div className="text-slate-300">Loading…</div> : (
          <div className="grid gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300">Display name (format: J. Surname)</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="J. Surname" type="text"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
              <div className="text-xs text-slate-400 mt-1">Tip: we’ll auto-format capitalization when you save.</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Contact number (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07…" type="tel"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            </div>

            {role === 'employee' ? (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Team</label>
                  <select value={team} onChange={(e) => setTeam(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white">
                    <option value="">(not set)</option>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Band</label>
                  <select value={band} onChange={(e) => setBand(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white">
                    <option value="">(not set)</option>
                    {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 text-xs text-slate-400">Team controls the rest-day filter on Available Shifts.</div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-3 text-slate-200 text-sm">
                You are a <b>manager</b>. Team/Band are not required.
              </div>
            )}

            <button disabled={saving} onClick={save} className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
