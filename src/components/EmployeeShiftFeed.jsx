import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ShiftCard from './ShiftCard'

const CACHE_KEY = 'overtimehub.cached.feed.v1'

export default function EmployeeShiftFeed({ profile }) {
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState([])
  const [responses, setResponses] = useState([])
  const [confirmedCounts, setConfirmedCounts] = useState({})
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const myResponseByShiftId = useMemo(() => {
    const map = {}
    for (const r of responses) map[r.shift_id] = r
    return map
  }, [responses])

  const load = async () => {
    setLoading(true)
    setError('')

    // Offline fallback: load last cached view
    if (!navigator.onLine) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached?.shifts) setShifts(cached.shifts)
        if (cached?.responses) setResponses(cached.responses)
        if (cached?.confirmedCounts) setConfirmedCounts(cached.confirmedCounts)
      } catch {
        // ignore
      }
      setLoading(false)
      return
    }

    const userId = (await supabase.auth.getUser()).data?.user?.id

    const [{ data: shiftData, error: shiftErr }, { data: respData, error: respErr }, { data: confirmAgg, error: confErr }] = await Promise.all([
      supabase
        .from('shifts')
        .select('id, shift_date, start_time, end_time, department, spots_available, notes, created_at')
        .gte('shift_date', new Date().toISOString().slice(0, 10))
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('shift_responses')
        .select('id, shift_id, user_id, status, updated_at')
        .eq('user_id', userId),
      // Use a lightweight aggregation view for confirmed counts
      supabase
        .from('shift_confirmations')
        .select('shift_id, user_id')
    ])

    if (shiftErr || respErr || confErr) {
      setError(shiftErr?.message || respErr?.message || confErr?.message || 'Failed to load data')
      setLoading(false)
      return
    }

    const counts = {}
    for (const c of (confirmAgg || [])) {
      counts[c.shift_id] = (counts[c.shift_id] || 0) + 1
    }

    setShifts(shiftData || [])
    setResponses(respData || [])
    setConfirmedCounts(counts)

    // cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        shifts: shiftData || [],
        responses: respData || [],
        confirmedCounts: counts,
        cachedAt: new Date().toISOString()
      }))
    } catch {
      // ignore
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const respond = async (shiftId, status) => {
    const userId = (await supabase.auth.getUser()).data?.user?.id
    if (!userId) return

    // Optimistic UI
    setResponses((prev) => {
      const existing = prev.find((r) => r.shift_id === shiftId)
      if (existing) {
        return prev.map((r) => (r.shift_id === shiftId ? { ...r, status, updated_at: new Date().toISOString() } : r))
      }
      return [{ id: 'temp', shift_id: shiftId, user_id: userId, status, updated_at: new Date().toISOString() }, ...prev]
    })

    const { error } = await supabase
      .from('shift_responses')
      .upsert({ shift_id: shiftId, user_id: userId, status }, { onConflict: 'shift_id,user_id' })

    if (error) {
      setError(error.message)
      // reload to reconcile
      load()
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Shift Feed</h1>
          <p className="text-slate-300 text-sm mt-1">
            Tap your availability for each overtime post. {profile?.full_name ? `Signed in as ${profile.full_name}.` : ''}
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm active:scale-[0.99]"
        >
          Refresh
        </button>
      </div>

      {offline ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
          You are offline. Showing your last cached feed.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        {loading ? (
          <div className="text-slate-300">Loading shifts…</div>
        ) : null}

        {!loading && shifts.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No overtime posted</div>
            <div className="text-sm mt-1">Check back later — managers will post slots here.</div>
          </div>
        ) : null}

        {shifts.map((s) => (
          <ShiftCard
            key={s.id}
            shift={s}
            myResponse={myResponseByShiftId[s.id]}
            confirmedUsersCount={confirmedCounts[s.id] || 0}
            onRespond={(status) => respond(s.id, status)}
          />
        ))}
      </div>
    </div>
  )
}
