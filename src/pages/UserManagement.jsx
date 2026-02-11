import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [role, setRole] = useState('employee')

  const selected = useMemo(() => users.find(u => u.id === selectedId), [users, selectedId])

  const load = async () => {
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, role, department, created_at')
      .order('full_name', { ascending: true })

    if (err) setError(err.message)
    setUsers(data || [])

    if (!selectedId && (data || []).length) {
      setSelectedId(data[0].id)
      setRole(data[0].role)
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selected) setRole(selected.role)
  }, [selected])

  const save = async () => {
    setError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', selectedId)

    if (err) setError(err.message)
    else load()
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">User Management</h1>
      <p className="text-slate-300 text-sm mt-1">Select a user and change their role.</p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div>
      ) : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300">User</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white">
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.id} ({u.role})</option>
              ))}
            </select>
            <div className="text-xs text-slate-400 mt-2">{selected?.id}</div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white">
              <option value="new_user">new_user (awaiting approval)</option>
              <option value="employee">employee</option>
              <option value="manager">manager</option>
            </select>

            <button disabled={loading} onClick={save} className="mt-3 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
