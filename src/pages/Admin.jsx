import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Admin({ profile }) {
  const isManager = profile?.role === 'manager'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pending, setPending] = useState([])
  const [employees, setEmployees] = useState([])

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

    const { data: pendingData, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, department')
      .is('role', null)
      .order('created_at', { ascending: false })

    const { data: empData, error: eErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, department')
      .in('role', ['employee', 'manager'])
      .order('role', { ascending: false })

    if (pErr || eErr) setError(pErr?.message || eErr?.message || 'Failed to load profiles')

    setPending(pendingData || [])
    setEmployees(empData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (userId, role) => {
    setError('')
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (err) setError(err.message)
    else load()
  }

  const createShift = async (e) => {
    e.preventDefault()
    setError('')
    const { error: err } = await supabase.from('shifts').insert({ ...form, spots_available: Number(form.spots_available) })
    if (err) setError(err.message)
    else { setForm((f) => ({ ...f, notes: '' })); }
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
          <p className="text-slate-300 text-sm mt-1">Approve users and manage shift posts.</p>
        </div>
        <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}

      <div className="mt-6 grid gap-4">
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
          <div className="text-white font-extrabold">Awaiting Approval</div>
          <div className="mt-3 grid gap-2">
            {loading ? <div className="text-slate-300">Loading…</div> : null}
            {!loading && pending.length === 0 ? <div className="text-slate-400">No pending users.</div> : null}
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <div className="text-slate-100 font-semibold">{u.full_name || u.id}</div>
                  <div className="text-xs text-slate-400">{u.department || ''}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id, 'employee')} className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold text-xs">Approve employee</button>
                  <button onClick={() => approve(u.id, 'manager')} className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 font-extrabold text-xs">Make manager</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
          <div className="text-white font-extrabold">Existing Approved Users</div>
          <div className="mt-3 grid gap-2">
            {!loading && employees.length === 0 ? <div className="text-slate-400">No approved users.</div> : null}
            {employees.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <div className="text-slate-100 font-semibold">{u.full_name || u.id}</div>
                  <div className="text-xs text-slate-400">Role: {u.role}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id, 'employee')} className="px-3 py-2 rounded-xl bg-slate-700/40 border border-slate-600/50 text-slate-100 font-extrabold text-xs">Set employee</button>
                  <button onClick={() => approve(u.id, 'manager')} className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 font-extrabold text-xs">Set manager</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
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
      </div>
    </div>
  )
}
