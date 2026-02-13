import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const TEAMS = ['Team1', 'Team2', 'Team3', 'Team4']
const BANDS = ['Band A', 'Band B']

export default function UserManagement({ testMode, onTestModeChange }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [role, setRole] = useState('employee')

  const [team, setTeam] = useState('')
  const [band, setBand] = useState('')

  const selected = useMemo(() => users.find(u => u.id === selectedId), [users, selectedId])

  const load = async () => {
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('full_name', { ascending: true })

    if (err) setError(err.message)
    setUsers(data || [])

    if (!selectedId && (data || []).length) setSelectedId(data[0].id)

    setLoading(false)
  }

  const loadStaffing = async (userId) => {
    if (!userId) return
    const { data } = await supabase.from('user_staffing').select('team, band').eq('user_id', userId).maybeSingle()
    setTeam(data?.team || '')
    setBand(data?.band || '')
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selected) {
      setRole(selected.role)
      loadStaffing(selected.id)
    }
  }, [selectedId])

  const saveRole = async () => {
    setError('')
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', selectedId)
    if (err) setError(err.message)
    else load()
  }

  const saveStaffing = async () => {
    setError('')
    const { error: err } = await supabase
      .from('user_staffing')
      .upsert({ user_id: selectedId, team: team || null, band: band || null }, { onConflict: 'user_id' })

    if (err) setError(err.message)
    else loadStaffing(selectedId)
  }

  const labelForUser = (u) => {
    const name = u.full_name || u.id
    return `${name} (${u.role})`
  }

  const saveTestMode = async (value) => {
    setError('')
    const { error: err } = await supabase
      .from('app_settings')
      .upsert({ id: 1, test_mode_enabled: value }, { onConflict: 'id' })

    if (err) setError(err.message)
    else onTestModeChange?.(value)
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">User Management</h1>
      <p className="text-slate-300 text-sm mt-1">Change roles and set Team/Band.</p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div>
      ) : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300">User</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white">
              {users.map(u => (<option key={u.id} value={u.id}>{labelForUser(u)}</option>))}
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

            <button disabled={loading} onClick={saveRole} className="mt-3 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">Save role</button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <div className="text-white font-extrabold">Team & Band</div>
          <div className="text-xs text-slate-400 mt-1">Used for roster filtering and shown in approvals.</div>

          <div className="mt-3 grid md:grid-cols-2 gap-3">
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
          </div>

          <button disabled={loading || !selectedId} onClick={saveStaffing} className="mt-3 px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold disabled:opacity-60">Save team & band</button>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <div className="text-white font-extrabold">Test Functions</div>
          <div className="text-xs text-slate-400 mt-1">Enable to show Available Shifts and My shifts tabs to allow for testing.</div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-sm text-slate-200">Test mode is <span className={testMode ? 'text-emerald-200 font-bold' : 'text-slate-300 font-bold'}>{testMode ? 'ON' : 'OFF'}</span></div>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only" checked={testMode} onChange={(e) => saveTestMode(e.target.checked)} />
              <div className={`w-14 h-8 rounded-full border ${testMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800/70 border-slate-700'} relative transition`}>
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition ${testMode ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
