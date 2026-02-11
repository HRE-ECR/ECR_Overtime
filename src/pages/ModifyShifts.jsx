import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ModifyShifts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [showDeleted, setShowDeleted] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')

    const today = new Date().toISOString().slice(0, 10)

    let q = supabase
      .from('shifts')
      .select('id, shift_date, shift_type, start_time, end_time, department, spots_available, shift_status, deleted_at')
      .gte('shift_date', today)
      .order('shift_date', { ascending: true })
      .order('shift_type', { ascending: true })

    if (!showDeleted) q = q.eq('shift_status', 'active')

    const { data, error: err } = await q
    if (err) setError(err.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [showDeleted])

  const updateSlots = async (shiftId, newSlots) => {
    setError('')
    const slots = Number(newSlots)
    if (Number.isNaN(slots) || slots < 0) {
      setError('Slots must be 0 or greater.')
      return
    }

    const { error: err } = await supabase
      .from('shifts')
      .update({ spots_available: slots })
      .eq('id', shiftId)

    if (err) setError(err.message)
    else load()
  }

  const deleteShiftSoft = async (shiftId) => {
    setError('')
    if (!confirm('Delete this shift? Any requested/approved OT will be set to DECLINED.')) return

    const { error: err } = await supabase.rpc('delete_shift_and_decline', { p_shift_id: shiftId })
    if (err) setError(err.message)
    else load()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Modify Shifts</h1>
          <p className="text-slate-300 text-sm mt-1">Increase slots or delete shifts (soft delete).</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 flex items-center gap-2">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Show deleted
          </label>
          <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}

      <div className="mt-5 grid gap-3">
        {rows.map((s) => (
          <div key={s.id} className="rounded-3xl bg-slate-900/50 border border-slate-800 p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-extrabold">{s.shift_date} · {s.shift_type.toUpperCase()} · {s.department}</div>
                <div className="text-sm text-slate-300 mt-1">{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}{s.shift_type==='night' ? ' (+1)' : ''}</div>
                <div className="text-xs text-slate-400 mt-2">Status: {s.shift_status}{s.deleted_at ? ` · deleted_at: ${new Date(s.deleted_at).toLocaleString()}` : ''}</div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Slots</span>
                  <input
                    type="number"
                    min="0"
                    defaultValue={s.spots_available}
                    className="w-24 px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-700 text-white"
                    onKeyDown={(e) => { if (e.key === 'Enter') updateSlots(s.id, e.currentTarget.value) }}
                  />
                  <button onClick={(e) => updateSlots(s.id, e.currentTarget.parentElement.querySelector('input').value)} className="px-3 py-2 rounded-xl bg-white text-navy-900 font-extrabold text-xs">Save</button>
                </div>

                {s.shift_status !== 'deleted' ? (
                  <button onClick={() => deleteShiftSoft(s.id)} className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-100 font-extrabold text-xs">Delete shift</button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No shifts in range</div>
            <div className="text-sm mt-1">Use Shift Planner to publish new shifts.</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
