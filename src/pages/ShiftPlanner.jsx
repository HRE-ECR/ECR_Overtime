import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayOfWeek(isoDate) {
  return new Date(isoDate + 'T00:00:00').getDay() // 0=Sun
}

function pretty(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ShiftPlanner() {
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10))
  const [department, setDepartment] = useState('Depot')
  const [daySlots, setDaySlots] = useState(4)
  const [nightSlots, setNightSlots] = useState(4)

  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)

  const invalidRange = useMemo(() => Boolean(start && end && start > end), [start, end])

  const buildPreview = () => {
    setMessage('')

    if (!start || !end) {
      setMessage('Choose a start and end date.')
      setPreview([])
      return
    }
    if (start > end) {
      setMessage('End date must be on or after start date.')
      setPreview([])
      return
    }

    const items = []
    let cur = start

    while (cur <= end) {
      const isSun = dayOfWeek(cur) === 0

      items.push({
        shift_date: cur,
        shift_type: 'day',
        start_time: '06:00',
        end_time: isSun ? '16:00' : '15:00',
        spots_available: Number(daySlots),
        department,
        shift_status: 'active'
      })

      items.push({
        shift_date: cur,
        shift_type: 'night',
        start_time: '19:00',
        end_time: '06:00',
        spots_available: Number(nightSlots),
        department,
        shift_status: 'active'
      })

      cur = addDays(cur, 1)
    }

    setPreview(items)

    // UX: show confirmation message and scroll preview into view
    setMessage(`Preview ready: ${items.length} shifts (${Math.round(items.length / 2)} days).`)
    setTimeout(() => {
      document.getElementById('oh-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const publish = async () => {
    setMessage('')

    if (!preview.length) {
      setMessage('Create a preview first.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('shifts').upsert(preview, { onConflict: 'shift_date,shift_type' })
    setMessage(error ? error.message : `Published ${preview.length} shifts.`)
    setLoading(false)
  }

  const clearPreview = () => {
    setPreview([])
    setMessage('Preview cleared.')
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">Shift Planner</h1>
      <p className="text-slate-300 text-sm mt-1">Quick create Day/Night overtime shifts by date range.</p>

      {message ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-slate-100">{message}</div>
      ) : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300">Start date</label>
            <input value={start} onChange={(e) => setStart(e.target.value)} type="date"
              className={`mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border text-white ${invalidRange ? 'border-rose-500/40' : 'border-slate-700'}`} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300">End date</label>
            <input value={end} onChange={(e) => setEnd(e.target.value)} type="date"
              className={`mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border text-white ${invalidRange ? 'border-rose-500/40' : 'border-slate-700'}`} />
            {invalidRange ? <div className="text-xs text-rose-200 mt-1">End date must be on/after start date.</div> : null}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300">Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} type="text"
              className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Day slots</label>
              <input value={daySlots} onChange={(e) => setDaySlots(e.target.value)} type="number" min="0"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Night slots</label>
              <input value={nightSlots} onChange={(e) => setNightSlots(e.target.value)} type="number" min="0"
                className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={buildPreview}
            className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-white font-extrabold">
            Preview
          </button>

          <button disabled={loading || preview.length === 0} onClick={publish}
            className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
            {loading ? 'Publishing…' : 'Publish shifts'}
          </button>

          <button disabled={preview.length === 0} onClick={clearPreview}
            className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-100 font-extrabold disabled:opacity-60">
            Clear
          </button>
        </div>
      </div>

      {/* Preview output */}
      <div id="oh-preview" className="mt-5">
        {preview.length ? (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800 shadow-card overflow-hidden">
            <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-white font-extrabold text-lg">Preview ({preview.length} shifts)</div>
                <div className="text-xs text-slate-400 mt-1">These items will be upserted on Publish (same date+type will be replaced).</div>
              </div>
              <div className="text-xs text-slate-300">
                Range: <span className="text-slate-100 font-bold">{pretty(start)}</span> → <span className="text-slate-100 font-bold">{pretty(end)}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {preview.map((s, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-extrabold">
                      {pretty(s.shift_date)} · {s.shift_type.toUpperCase()} · {s.department}
                    </div>
                    <div className="text-sm text-slate-300 mt-1">
                      {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}{s.shift_type === 'night' ? ' (+1)' : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-400">Slots</div>
                    <div className="text-white font-black text-lg">{s.spots_available}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No preview yet. Choose a range and press <b>Preview</b>.</div>
        )}
      </div>
    </div>
  )
}
