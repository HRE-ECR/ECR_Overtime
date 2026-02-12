import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function shiftLabel(type) {
  if (type === 'day') return '☀️ Day'
  if (type === 'night') return '🌙 Night'
  return type
}

export default function ApproveOT() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({})
  const [staffingMap, setStaffingMap] = useState({})

  const requestsByShift = useMemo(() => {
    const map = {}
    for (const r of requests) {
      map[r.shift_id] = map[r.shift_id] || []
      map[r.shift_id].push(r)
    }
    return map
  }, [requests])

  const load = async () => {
    setLoading(true)
    setError('')

    const today = new Date().toISOString().slice(0, 10)

    const [{ data: shiftData, error: sErr }, { data: reqData, error: rErr }, { data: cntData, error: cErr }] = await Promise.all([
      supabase.from('shifts')
        .select('id, shift_date, shift_type, start_time, end_time, spots_available, department, shift_status')
        .gte('shift_date', today)
        .eq('shift_status', 'active')
        .order('shift_date', { ascending: true })
        .order('shift_type', { ascending: true }),
      supabase.from('ot_requests')
        .select(`id, shift_id, user_id, status, requested_at, decided_at, decided_by,
                 requester:profiles!ot_requests_user_id_profiles_fkey(full_name),
                 approver:profiles!ot_requests_decided_by_profiles_fkey(full_name)`)
        .in('status', ['requested','approved','declined'])
        .order('requested_at', { ascending: true }),
      supabase.from('ot_shift_counts')
        .select('shift_id, requested, approved, declined')
    ])

    if (sErr || rErr || cErr) {
      setError(sErr?.message || rErr?.message || cErr?.message || 'Failed to load')
      setLoading(false)
      return
    }

    const countMap = {}
    for (const row of (cntData || [])) countMap[row.shift_id] = row

    // Load staffing for visible request user_ids
    const ids = Array.from(new Set((reqData || []).map(r => r.user_id).filter(Boolean)))
    let sMap = {}
    if (ids.length) {
      const { data: staff, error: stErr } = await supabase
        .from('user_staffing')
        .select('user_id, team, band')
        .in('user_id', ids)

      if (stErr) {
        setError(stErr.message)
      } else {
        for (const row of (staff || [])) sMap[row.user_id] = row
      }
    }

    setShifts(shiftData || [])
    setRequests(reqData || [])
    setCounts(countMap)
    setStaffingMap(sMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const decide = async (reqId, status) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { error: err } = await supabase
      .from('ot_requests')
      .update({ status, decided_at: new Date().toISOString(), decided_by: userId })
      .eq('id', reqId)

    if (err) setError(err.message)
    else load()
  }

  const nameClass = (status) => {
    if (status === 'approved') return 'text-emerald-300'
    if (status === 'declined') return 'text-rose-300'
    return 'text-slate-100'
  }

  const rowBorder = (status) => {
    if (status === 'approved') return 'border-emerald-500/30'
    if (status === 'declined') return 'border-rose-500/30'
    return 'border-slate-800'
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-white font-black text-2xl">Approve OT</h1>
          <p className="text-slate-300 text-sm mt-1">Requests are displayed first‑come‑first‑served (requested_at ascending).</p>
        </div>
        <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}

      <div className="mt-5 grid gap-4">
        {shifts.map((s) => {
          const list = (requestsByShift[s.id] || []).filter(r => r.status !== 'cancelled')
          const c = counts[s.id] || { requested: 0, approved: 0, declined: 0 }
          const over = c.approved > s.spots_available

          return (
            <div key={s.id} className="rounded-3xl bg-slate-900/50 border border-slate-800 p-4 shadow-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-white font-extrabold">{s.shift_date} · {shiftLabel(s.shift_type)} · {s.department}</div>
                  <div className="text-sm text-slate-300 mt-1">{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}{s.shift_type==='night' ? ' (+1)' : ''}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    Slots: <span className="text-slate-200 font-bold">{s.spots_available}</span> ·
                    Requested: <span className="text-slate-200 font-bold">{c.requested}</span> ·
                    Approved: <span className={over ? 'text-amber-200 font-bold' : 'text-slate-200 font-bold'}>{c.approved}</span> ·
                    Declined: <span className="text-slate-200 font-bold">{c.declined}</span>
                    {over ? <span className="ml-2 text-amber-200 font-bold">(Over-approved)</span> : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {list.length === 0 ? <div className="text-sm text-slate-400">No requests.</div> : null}

                {list.map((r) => {
                  const staff = staffingMap[r.user_id] || {}
                  const band = staff.band
                  const displayName = r.requester?.full_name || r.user_id
                  const approverName = r.approver?.full_name

                  return (
                    <div key={r.id} className={`rounded-2xl border ${rowBorder(r.status)} bg-slate-950/30 p-3`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className={`${nameClass(r.status)} font-extrabold break-words`}>{displayName}{band ? ` (${band})` : ''}</div>
                          <div className="text-xs text-slate-400 mt-1">Status: {r.status}</div>
                          {(r.status === 'approved' || r.status === 'declined') && approverName ? (
                            <div className="text-xs text-slate-300 mt-1">Approved by: <span className="text-slate-100 font-bold">{approverName}</span></div>
                          ) : null}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => decide(r.id, 'approved')} className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold text-xs">Approve</button>
                          <button onClick={() => decide(r.id, 'declined')} className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-100 font-extrabold text-xs">Decline</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
