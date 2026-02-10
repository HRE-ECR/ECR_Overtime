import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Field({ label, children }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-extrabold text-slate-200">{label}</div>
      {children}
    </div>
  )
}

export default function Admin({ profile }) {
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

  const isManager = profile?.role === 'manager'

  const load = async () => {
    setLoading(true)
    setError('')

    const [{ data: shiftData, error: e1 }, { data: respData, error: e2 }, { data: confData, error: e3 }] = await Promise.all([
      supabase.from('shifts').select('*').order('shift_date', { ascending: true }).order('start_time', { ascending: true }),
      supabase
        .from('shift_responses')
        .select('id, shift_id, user_id, status, updated_at, profiles(full_name, department)')
        .order('updated_at', { ascending: false }),
      supabase
        .from('shift_confirmations')
        .select('id, shift_id, user_id, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
    ])

    if (e1 || e2 || e3) setError(e1?.message || e2?.message || e3?.message || 'Failed to load')
    setShifts(shiftData || [])
    setResponses(respData || [])
    setConfirmations(confData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const { error: err } = await supabase.from('shifts').insert({
      ...form,
      spots_available: Number(form.spots_available)
    })
    if (err) setError(err.message)
    else {
      setForm((f) => ({ ...f, notes: '' }))
      load()
    }
  }

  const confirmUser = async (shiftId, userId) => {
    if (!isManager) return
    setError('')
    const { error: err } = await supabase.from('shift_confirmations').insert({ shift_id: shiftId, user_id: userId })
    if (err) setError(err.message)
    else load()
  }

  const unconfirm = async (confirmationId) => {
    if (!isManager) return
    setError('')
    const { error: err } = await supabase.from('shift_confirmations').delete().eq('id', confirmationId)
    if (err) setError(err.message)
    else load()
  }

  if (!isManager) {
    return (
      <div className="rounded-3xl bg-rose-500/10 border border-rose-500/30 p-6">
        <div className="text-white font-extrabold">Admin only</div>
        <div className="text-rose-100 text-sm mt-1">Your account is not set as a manager in the profiles table.</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">Admin Panel</h1>
      <p className="text-slate-300 text-sm mt-1">Post shifts, view responses, and confirm allocations.</p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Create Shift Post</div>
        <form onSubmit={createShift} className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                value={form.shift_date}
                onChange={(e) => setForm((f) => ({ ...f, shift_date: e.target.value }))}
                type="date"
                className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              />
            </Field>
            <Field label="Department">
              <input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                type="text"
                className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start">
              <input
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                type="time"
                className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              />
            </Field>
            <Field label="End">
              <input
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                type="time"
                className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              />
            </Field>
            <Field label="Spots">
              <input
                value={form.spots_available}
                onChange={(e) => setForm((f) => ({ ...f, spots_available: e.target.value }))}
                type="number"
                min="1"
                className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows="3"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              placeholder="e.g., Must be competent on XYZ, bring PPE..."
            />
          </Field>

          <button className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold active:scale-[0.99]">
            Post Shift
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="text-white font-extrabold">Allocation</div>
        {loading ? <div className="text-slate-300">Loading…</div> : null}

        {shifts.map((s) => (
          <div key={s.id} className="rounded-3xl bg-slate-900/50 border border-slate-800 p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-extrabold">{s.shift_date} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div>
                <div className="text-sm text-slate-300">{s.department} · {s.spots_available} spot(s)</div>
              </div>
              <button onClick={load} className="px-3 py-2 rounded-xl bg-slate-800/70 text-sm font-bold">Refresh</button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs font-extrabold text-slate-200">Responses</div>
                <div className="mt-2 grid gap-2">
                  {(responsesByShift[s.id] || []).length === 0 ? (
                    <div className="text-sm text-slate-400">No responses yet.</div>
                  ) : (
                    (responsesByShift[s.id] || []).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-100">
                          {r.profiles?.full_name || r.user_id}
                          <span className="text-xs text-slate-400"> · {r.status}</span>
                        </div>
                        <button
                          onClick={() => confirmUser(s.id, r.user_id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold text-xs"
                        >
                          Confirm
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div className="text-xs font-extrabold text-slate-200">Confirmed</div>
                <div className="mt-2 grid gap-2">
                  {(confirmedByShift[s.id] || []).length === 0 ? (
                    <div className="text-sm text-slate-400">No one confirmed.</div>
                  ) : (
                    (confirmedByShift[s.id] || []).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-100">{c.profiles?.full_name || c.user_id}</div>
                        <button
                          onClick={() => unconfirm(c.id)}
                          className="px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600/60 text-slate-100 font-extrabold text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
