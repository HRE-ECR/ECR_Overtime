import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ShiftHistory() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.from('audit_log').select('id, created_at, action, entity_type, entity_id, details').order('created_at', { ascending: false }).limit(200)
    if (err) setError(err.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Shift History Log</h1>
          <p className="text-slate-300 text-sm mt-1">Audit of shift changes and OT decisions.</p>
        </div>
        <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
      </div>
      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}
      <div className="mt-5 grid gap-2">
        {rows.map(r => (
          <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
            <div className="text-white font-extrabold">{r.action}</div>
            <div className="text-sm text-slate-300">{r.entity_type} · {r.entity_id}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
