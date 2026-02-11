import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ShiftCard from '../components/ShiftCard'

export default function AvailableShifts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [counts, setCounts] = useState({})

  const myReqByShift = useMemo(() => {
    const map = {}
    for (const r of myRequests) map[r.shift_id] = r
    return map
  }, [myRequests])

  const load = async () => {
    setLoading(true)
    setError('')

    const userId = (await supabase.auth.getUser()).data?.user?.id
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: shiftData, error: sErr }, { data: myData, error: mErr }, { data: cnt, error: cErr }] = await Promise.all([
      supabase.from('shifts')
        .select('id, shift_date, shift_type, start_time, end_time, spots_available, department, notes, shift_status')
        .gte('shift_date', today)
        .eq('shift_status', 'active')
        .order('shift_date', { ascending: true })
        .order('shift_type', { ascending: true }),
      supabase.from('ot_requests')
        .select('id, shift_id, user_id, status, requested_at, decided_at, archived')
        .eq('user_id', userId)
        .eq('archived', false),
      supabase.from('ot_shift_counts')
        .select('shift_id, requested, approved, declined')
    ])

    if (sErr || mErr || cErr) {
      setError(sErr?.message || mErr?.message || cErr?.message || 'Failed to load')
      setLoading(false)
      return
    }

    const countsMap = {}
    for (const row of (cnt || [])) countsMap[row.shift_id] = row

    setShifts(shiftData || [])
    setMyRequests(myData || [])
    setCounts(countsMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const requestOt = async (shiftId) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { error: err } = await supabase
      .from('ot_requests')
      .upsert({
        shift_id: shiftId,
        user_id: userId,
        status: 'requested',
        requested_at: new Date().toISOString(),
        decided_at: null,
        decided_by: null,
        archived: false
      }, { onConflict: 'shift_id,user_id' })

    if (err) setError(err.message)
    else load()
  }

  const cancelRequest = async (shiftId) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { error: err } = await supabase
      .from('ot_requests')
      .update({ status: 'cancelled' })
      .eq('shift_id', shiftId)
      .eq('user_id', userId)

    if (err) setError(err.message)
    else load()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Available Shifts</h1>
          <p className="text-slate-300 text-sm mt-1">Request overtime by tapping “Request OT”.</p>
        </div>
        <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}

      <div className="mt-5 grid gap-4">
        {!loading && shifts.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No shifts posted</div>
            <div className="text-sm mt-1">Managers will publish overtime here.</div>
          </div>
        ) : null}

        {shifts.map((s) => (
          <ShiftCard
            key={s.id}
            shift={s}
            myReq={myReqByShift[s.id]}
            counts={counts[s.id]}
            onRequest={() => requestOt(s.id)}
            onCancel={() => cancelRequest(s.id)}
          />
        ))}
      </div>
    </div>
  )
}
