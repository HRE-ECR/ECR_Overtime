import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayOfWeek(isoDate) {
  return new Date(isoDate + 'T00:00:00').getDay() // 0 Sunday
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

  const buildPreview = () => {
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
        department
      })
      items.push({
        shift_date: cur,
        shift_type: 'night',
        start_time: '19:00',
        end_time: '06:00',
        spots_available: Number(nightSlots),
        department
      })
      cur = addDays(cur, 1)
    }
    setPreview(items)
  }

  const publish = async () => {
    setMessage('')
    setLoading(true)

    const { error } = await supabase
      .from('shifts')
      .upsert(preview, { onConflict: 'shift_date,shift_type' })

    if (error) setMessage(error.message)
    else setMessage(`Published ${preview.length} shifts.`)

    setLoading(false)
  }

  return (
    <div>
      <div>
        <h1 className="text-white font-black text-2xl">Shift Planner</h1>
        <p className="text-slate-300 text-sm mt-1">Create a range of Day/Night overtime shifts quickly.</p>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-slate-100">{message}</div>
      ) : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="text-white font-extrabold">Quick Create</div>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300">Start date</label>
            <input value={start} onChange={(e) => setStart(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300">End date</label>
            <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300">Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} type="text" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Day slots</label>
              <input value={daySlots} onChange={(e) => setDaySlots(e.target.value)} type="number" min="0" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Night slots</label>
              <input value={nightSlots} onChange={(e) => setNightSlots(e.target.value)} type="number" min="0" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={buildPreview} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-white font-extrabold">Preview</button>
          <button disabled={loading || preview.length===0} onClick={publish} className="px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">{loading ? 'Publishing…' : 'Publish shifts'}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {preview.length ? (
          <div className="text-white font-extrabold">Preview ({preview.length})</div>
        ) : null}

        {preview.map((s) => (
          <div key={`${s.shift_date}-${s.shift_type}`} className="rounded-3xl bg-slate-900/40 border border-slate-800 p-4">
            <div>
              <div className="text-white font-extrabold">{s.shift_date} · {s.shift_type.toUpperCase()} · {s.department}</div>
              <div className="text-sm text-slate-300 mt-1">{s.start_time}–{s.end_time}{s.shift_type==='night' ? ' (+1)' : ''} · Slots: {s.spots_available}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
