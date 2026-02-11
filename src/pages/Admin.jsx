import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Admin({ profile }) {
  const isManager = profile?.role === 'manager'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pending, setPending] = useState([])
  const [users, setUsers] = useState([])

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

    // Pending approvals: role = 'new_user'
    const { data: pendingData, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, department, created_at')
      .eq('role', 'new_user')
      .order('created_at', { ascending: false })

    // Approved + managers list (employee/manager) (and optionally show all non-null roles)
    const { data: usersData, error: uErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, department, created_at')
      .in('role', ['employee', 'manager'])
      .order('role', { ascending: false })
      .order('created_at', { ascending: false })

    if (pErr || uErr) {
      setError(pErr?.message || uErr?.message || 'Failed to load profiles (check RLS policies).')
    }

    setPending(pendingData || [])
    setUsers(usersData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRole = async (userId, role) => {
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (err) setError(err.message)
    else load()
  }

  const createShift = async (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      ...form,
      spots_available: Number(form.spots_available)
    }

    const { error: err } = await supabase.from('shifts').insert(payload)
    if (err) setError(err.message)
    else {
      setForm((f) => ({ ...f, notes: '' }))
    }
  }

  if (!isManager) {
    return (
      <div className="rounded-3xl bg-rose-500/10 border border-rose-500/30 p-6">
        <div className="text-white font-extrabold">Admin only</div>
        <div className="text-rose-100 text-sm mt-1">
          Your profile role must be <b>manager</b> to access approvals.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Admin Panel</h1>
          <p className="text-slate-300 text-sm mt-1">
            Approve users and manage shift posts.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">
          {error}
        </div>
      ) : null}

      {/* Pending Approvals */}
      <div className="mt-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Awaiting Approval</div>

        <div className="mt-3 grid gap-2">
          {loading ? <div className="text-slate-300">Loading…</div> : null}

          {!loading && pending.length === 0 ? (
            <div className="text-slate-400">No pending users.</div>
          ) : null}

          {pending.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3"
            >
              <div>
                <div className="text-slate-100 font-semibold">
                  {u.full_name || u.id}
                </div>
                <div className="text-xs text-slate-400">
                  {u.department || '—'} · {u.id}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRole(u.id, 'employee')}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold text-xs"
                >
                  Approve employee
                </button>
                <button
                  onClick={() => setRole(u.id, 'manager')}
                  className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 font-extrabold text-xs"
                >
                  Make manager
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Users */}
      <div className="mt-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Approved Users</div>

        <div className="mt-3 grid gap-2">
          {!loading && users.length === 0 ? (
            <div className="text-slate-400">No approved users.</div>
          ) : null}

          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3"
            >
              <div>
                <div className="text-slate-100 font-semibold">
                  {u.full_name || u.id}
                </div>
                <div className="text-xs text-slate-400">
                  Role: <b className="text-slate-200">{u.role}</b> · {u.department || '—'} · {u.id}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setRole(u.id, 'employee')}
                  className="px-3 py-2 rounded-xl bg-slate-700/40 border border-slate-600/50 text-slate-100 font-extrabold text-xs"
                >
                  Set employee
                </button>
                <button
                  onClick={() => setRole(u.id, 'manager')}
                  className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 font-extrabold text-xs"
                >
                  Set manager
                </button>
                <button
                  onClick={() => setRole(u.id, 'new_user')}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-100 font-extrabold text-xs"
                  title="Revoke access (moves them back to Awaiting Approval)"
                >
                  Revoke (new_user)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Shift Post */}
      <div className="mt-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Create Shift Post</div>

        <form onSubmit={createShift} className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.shift_date}
              onChange={(e) => setForm((f) => ({ ...f, shift_date: e.target.value }))}
              type="date"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              required
            />
            <input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              type="text"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              type="time"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              required
            />
            <input
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              type="time"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              required
            />
            <input
              value={form.spots_available}
              onChange={(e) => setForm((f) => ({ ...f, spots_available: e.target.value }))}
              type="number"
              min="1"
              className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              required
            />
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows="3"
            className="px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
            placeholder="Notes (optional)"
          />

          <button className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold">
            Post Shift
          </button>
        </form>
      </div>
    </div>
  )
}
