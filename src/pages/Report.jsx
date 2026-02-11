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

  const exportCsv = async () => {
    setMessage('')
    setLoading(true)

    const { data: shifts, error: sErr } = await supabase
      .from('shifts')
      .select('id, shift_date, shift_type, start_time, end_time, department, spots_available')
      .gte('shift_date', start)
      .lte('shift_date', end)
      .order('shift_date', { ascending: true })
      .order('shift_type', { ascending: true })

    const { data: reqs, error: rErr } = await supabase
      .from('ot_requests')
      .select('id, shift_id, user_id, status, requested_at, decided_at, profile:profiles(full_name)')
      .in('status', ['requested','approved','declined','cancelled'])

    const { data: counts, error: cErr } = await supabase
      .from('ot_shift_counts')
      .select('shift_id, requested, approved, declined')

    if (sErr || rErr || cErr) {
      setMessage(sErr?.message || rErr?.message || cErr?.message || 'Failed to export')
      setLoading(false)
      return
    }

    const countMap = {}
    for (const c of (counts || [])) countMap[c.shift_id] = c

    const shiftMap = {}
    for (const s of (shifts || [])) shiftMap[s.id] = s

    const rows = (reqs || []).map((r) => {
      const s = shiftMap[r.shift_id]
      const c = countMap[r.shift_id] || { requested: 0, approved: 0, declined: 0 }
      const overApproved = s ? Math.max(0, (c.approved || 0) - (s.spots_available || 0)) : 0
      return {
        shift_date: s?.shift_date || '',
        shift_type: s?.shift_type || '',
        start_time: s?.start_time || '',
        end_time: s?.end_time || '',
        department: s?.department || '',
        slots_available: s?.spots_available ?? '',
        requested_count: c.requested ?? '',
        approved_count: c.approved ?? '',
        declined_count: c.declined ?? '',
        over_approved_by: overApproved,
        user: r.profile?.full_name || r.user_id,
        request_status: r.status,
        requested_at: r.requested_at,
        decided_at: r.decided_at
      }
    })

    downloadText(`overtime_report_${start}_to_${end}.csv`, toCsv(rows))
    setMessage(`Exported ${rows.length} rows.`)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">Report</h1>
      <p className="text-slate-300 text-sm mt-1">Export OT to CSV (Excel compatible). Includes over-approval.</p>

      {message ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-slate-100">{message}</div> : null}

      <div className="mt-5 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300">Start date</label>
            <input value={start} onChange={(e) => setStart(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300">End date</label>
            <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white" />
          </div>
        </div>

        <button disabled={loading} onClick={exportCsv} className="mt-4 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
          {loading ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
    </div>
  )
}
