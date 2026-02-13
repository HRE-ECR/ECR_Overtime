import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows, headers) {
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

  const exportApproved = async () => {
    setMessage('')
    setLoading(true)

    const { data: reqs, error: rErr } = await supabase
      .from('ot_requests')
      .select(`id, user_id, notes, status,
               requester:profiles!ot_requests_user_id_profiles_fkey(full_name),
               approver:profiles!ot_requests_decided_by_profiles_fkey(full_name),
               shift:shifts(shift_date, shift_type)`)
      .eq('status', 'approved')

    if (rErr) {
      setMessage(rErr.message)
      setLoading(false)
      return
    }

    const inRange = (reqs || []).filter(r => {
      const d = r.shift?.shift_date
      return d && d >= start && d <= end
    })

    const uids = Array.from(new Set(inRange.map(r => r.user_id).filter(Boolean)))
    let staffingMap = {}
    if (uids.length) {
      const { data: staff, error: sErr } = await supabase
        .from('user_staffing')
        .select('user_id, team, band')
        .in('user_id', uids)
      if (sErr) {
        setMessage(sErr.message)
        setLoading(false)
        return
      }
      for (const row of (staff || [])) staffingMap[row.user_id] = row
    }

    const headers = ['Date','Shift','Name','Team','Band','Approved by','Notes']

    const rows = inRange.map(r => {
      const d = new Date(r.shift.shift_date)
      return {
        'Date': format(d, 'EEE d MMM yyyy'),
        'Shift': r.shift.shift_type === 'day' ? 'Day' : 'Night',
        'Name': r.requester?.full_name || '',
        'Team': staffingMap[r.user_id]?.team || '',
        'Band': staffingMap[r.user_id]?.band || '',
        'Approved by': r.approver?.full_name || '',
        'Notes': (r.notes || '').slice(0, 500)
      }
    })

    downloadText(`overtime_report_approved_${start}_to_${end}.csv`, toCsv(rows, headers))
    setMessage(`Exported ${rows.length} approved rows.`)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-white font-black text-2xl">Report</h1>
      <p className="text-slate-300 text-sm mt-1">Export approved overtime to CSV (Excel compatible).</p>

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

        <button disabled={loading} onClick={exportApproved} className="mt-4 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
          {loading ? 'Working…' : 'Export APPROVED CSV'}
        </button>

        <div className="text-xs text-slate-400 mt-3">Columns: Date, Shift, Name, Team, Band, Approved by, Notes.</div>
      </div>
    </div>
  )
}
