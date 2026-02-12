import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map(h => escape(r[h])).join(','))
  return lines.join('\n')
}

export default function Report() {
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const exportApprovedGrouped = async () => {
    setMessage('')
    setLoading(true)

    const { data, error } = await supabase
      .from('ot_requests')
      .select('status, profile:profiles(full_name), shift:shifts(shift_date, shift_type)')
      .eq('status', 'approved')

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const filtered = (data || []).filter((r) => {
      const d = r.shift?.shift_date
      return d && d >= start && d <= end
    })

    const groups = {}
    for (const r of filtered) {
      const key = `${r.shift.shift_date}|${r.shift.shift_type}`
      groups[key] = groups[key] || { date: r.shift.shift_date, shift: r.shift.shift_type, people: [] }
      const name = r.profile?.full_name || 'Unknown'
      if (!groups[key].people.includes(name)) groups[key].people.push(name)
    }

    const orderType = (t) => (t === 'day' ? 0 : 1)
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return orderType(a.shift) - orderType(b.shift)
    })

    const rows = sorted.map((g) => ({
      date: g.date,
      shift: g.shift,
      approved_people: g.people.join('; ')
    }))

    downloadText(`overtime_report_approved_${start}_to_${end}.csv`, toCsv(rows))
    setMessage(`Exported APPROVED grouped: ${rows.length} lines.`)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">Report</h1>
      <p className="text-slate-300 text-sm mt-1">Approved export grouped by date+shift.</p>
      {message ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-slate-100">{message}</div> : null}
      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-300">Start date</label><input value={start} onChange={(e)=>setStart(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"/></div>
          <div><label className="text-xs font-bold text-slate-300">End date</label><input value={end} onChange={(e)=>setEnd(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"/></div>
        </div>
        <button disabled={loading} onClick={exportApprovedGrouped} className="mt-4 px-4 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold disabled:opacity-60">{loading?'Working…':'Export APPROVED (Grouped)'}</button>
      </div>
    </div>
  )
}
