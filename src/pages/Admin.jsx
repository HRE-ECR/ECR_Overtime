import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Admin({ profile }) {
  const isManager = profile?.role === 'manager'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [responses, setResponses] = useState([])
  const [confirmations, setConfirmations] = useState([])

  const [form, setForm] = useState({
    shift_date: new Date().toISOString().slice(0, 10),
    start_time: '07:00',
    end_time: '19:00',
    spots_available: 1,
    department: profile?.department || 'Depot',
    notes: ''
  })

  const load = async () => {
    setLoading(true)
    setError('')

    // Shifts
    const { data: shiftData, error: e1 } = await supabase
      .from('shifts')
      .select('*')
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Responses WITH embedded profiles (requires FK user_id -> profiles.id)
    const { data: respData, error: e2 } = await supabase
      .from('shift_responses')
      .select('id, shift_id, user_id, status, updated_at, profile:profiles(full_name, department)')
      .order('updated_at', { ascending: false })

    // Confirmations WITH embedded profiles (requires FK user_id -> profiles.id)
    const { data: confData, error: e3 } = await supabase
      .from('shift_confirmations')
      .select('id, shift_id, user_id, created_at, profile:profiles(full_name, department)')
      .order('created_at', { ascending: false })

    if (e1 || e2 || e3) {
      setError(e1?.message || e2?.message || e3?.message || 'Failed to load')
    }

    setShifts(shiftData || [])
    setResponses(respData || [])
    setConfirmations(confData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const responsesByShift = useMemo(() => {
    const map = {}
    for (const r of responses) {
      map[r.shift_id] = map[r.shift_id] || []
      map[r.shift_id].push(r)
    }
    return map
  }, [responses])

  const confirmedByShift = useMemo(() => {
    const map = {}
    for (const c of confirmations) {
      map[c.shift_id] = map[c.shift_id] || []
      map[c.shift_id].push(c)
    }
    return map
  }, [confirmations])

  const createShift = async (e) => {
    e.preventDefault()
    if (!isManager) return

    setError('')
    const { error: err } = await supabase
      .from('shifts')
      .insert({ ...form, spots_available: Number(form.spots_available) })

    if (err) setError(err.message)
    else {
      setForm((f) => ({ ...f, notes: '' }))
      load()
    }
  }

  const confirmUser = async (shiftId, userId) => {
    if (!isManager) return
    const { error: err } = await supabase
      .from('shift_confirmations')
      .insert({ shift_id: shiftId, user_id: userId })
    if (err) setError(err.message)
    else load()
  }

  const cancelConfirmation = async (shiftId, userId) => {
    if (!isManager) return
    const { error: err } = await supabase
      .from('shift_confirmations')
      .delete()
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
    if (err) setError(err.message)
    else load()
  }

  const deleteShift = async (shiftId) => {
    if (!isManager) return
    if (!confirm('Delete this posted shift? This will also remove related responses/confirmations.')) return

    const { error: err } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)

    if (err) setError(err.message)
    else load()
  }

  if (!isManager) {
    return (
      <div className="rounded-3xl bg-rose-500/10 border border-rose-500/30 p-6">
        <div className="text-white font-extrabold">Admin only</div>
        <div className="text-rose-100 text-sm mt-1">Set your role to manager in the profiles table.</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Admin Panel</h1>
          <p className="text-slate-300 text-sm mt-1">Post shifts, confirm allocations, and cancel confirmations.</p>
        </div>
        <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Create Shift Post</div>
        <form onSubmit={createShift} className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.shift_date} onChange={(e) => setForm((f) => ({ ...f, shift_date: e.target.value }))} type="date" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} type="text" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} type="time" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            <input value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} type="time" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            <input value={form.spots_available} onChange={(e) => setForm((f) => ({ ...f, spots_available: e.target.value }))} type="number" min="1" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows="3" className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" placeholder="Notes (optional)" />
          <button className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold">Post Shift</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="text-white font-extrabold">Posts</div>
        {loading ? <div className="text-slate-300">Loading…</div> : null}

        {shifts.map((s) => (
          <div key={s.id} className="rounded-3xl bg-slate-900/50 border border-slate-800 p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-extrabold">{s.shift_date} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)} · {s.department}</div>
                <div className="text-sm text-slate-300 mt-1">Spots: {s.spots_available} {s.notes ? `· ${s.notes}` : ''}</div>
              </div>
              <button onClick={() => deleteShift(s.id)} className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-100 font-extrabold text-xs">Delete shift</button>
            </div>

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs font-extrabold text-slate-200">Responses</div>
                <div className="mt-2 grid gap-2">
                  {(responsesByShift[s.id] || []).length === 0 ? <div className="text-sm text-slate-400">No responses yet.</div> : null}
                  {(responsesByShift[s.id] || []).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-100">
                        {r.profile?.full_name || r.user_id}
                        <span className="text-xs text-slate-400"> · {r.status}</span>
                      </div>
                      <button onClick={() => confirmUser(s.id, r.user_id)} className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold text-xs">Confirm</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs font-extrabold text-slate-200">Confirmed</div>
                <div className="mt-2 grid gap-2">
                  {(confirmedByShift[s.id] || []).length === 0 ? <div className="text-sm text-slate-400">No one confirmed.</div> : null}
                  {(confirmedByShift[s.id] || []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-100">{c.profile?.full_name || c.user_id}</div>
                      <button onClick={() => cancelConfirmation(s.id, c.user_id)} className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-100 font-extrabold text-xs">Cancel</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
