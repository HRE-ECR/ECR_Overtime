import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ShiftCard from '../components/ShiftCard'

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00Z')
  const b = new Date(isoB + 'T00:00:00Z')
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export default function AvailableShifts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [counts, setCounts] = useState({})

  const [showOnlyRest, setShowOnlyRest] = useState(() => {
    const v = localStorage.getItem('oh_showOnlyRest')
    return v === null ? true : v === '1'
  })

  const [myTeam, setMyTeam] = useState('')
  const [baseDate, setBaseDate] = useState('2026-02-02')
  const [pattern, setPattern] = useState([])

  // Notes modal
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesShiftId, setNotesShiftId] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  const myReqByShift = useMemo(() => {
    const map = {}
    for (const r of myRequests) map[r.shift_id] = r
    return map
  }, [myRequests])

  const loadRoster = async () => {
    const userId = (await supabase.auth.getUser()).data?.user?.id
    const [{ data: cfg }, { data: staff }] = await Promise.all([
      supabase.from('roster_config').select('base_date').eq('id', 1).maybeSingle(),
      supabase.from('user_staffing').select('team').eq('user_id', userId).maybeSingle()
    ])

    const team = staff?.team || ''
    setMyTeam(team)
    setBaseDate(cfg?.base_date || '2026-02-02')

    if (team) {
      const { data } = await supabase
        .from('team_roster_pattern')
        .select('day_index, roster_type')
        .eq('team', team)
        .order('day_index', { ascending: true })
      setPattern(data || [])
    } else {
      setPattern([])
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')

    const userId = (await supabase.auth.getUser()).data?.user?.id
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: shiftData, error: sErr }, { data: myData, error: mErr }, { data: cntData, error: cErr }] = await Promise.all([
      supabase.from('shifts')
        .select('id, shift_date, shift_type, start_time, end_time, spots_available, department, shift_status')
        .gte('shift_date', today)
        .eq('shift_status', 'active')
        .order('shift_date', { ascending: true })
        .order('shift_type', { ascending: true }),
      supabase.from('ot_requests')
        .select('id, shift_id, user_id, status, requested_at, decided_at, archived, notes')
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

    const map = {}
    for (const row of (cntData || [])) map[row.shift_id] = row

    setShifts(shiftData || [])
    setMyRequests(myData || [])
    setCounts(map)
    setLoading(false)
  }

  useEffect(() => {
    loadRoster()
    load()
  }, [])

  useEffect(() => {
    localStorage.setItem('oh_showOnlyRest', showOnlyRest ? '1' : '0')
  }, [showOnlyRest])

  const isRestDayForMyTeam = (shiftDateIso) => {
    if (!myTeam || !pattern?.length) return false
    const delta = daysBetween(baseDate, shiftDateIso)
    const idx = ((delta % 28) + 28) % 28
    const row = pattern.find(p => p.day_index === idx)
    return row?.roster_type === 'rest'
  }

  const visibleShifts = useMemo(() => {
    if (!showOnlyRest) return shifts
    if (!myTeam) return shifts
    return shifts.filter(s => isRestDayForMyTeam(s.shift_date))
  }, [shifts, showOnlyRest, myTeam, baseDate, pattern])

  const requestOt = async (shiftId) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { data: updated, error: upErr } = await supabase
      .from('ot_requests')
      .update({
        status: 'requested',
        requested_at: new Date().toISOString(),
        decided_at: null,
        decided_by: null,
        archived: false
      })
      .eq('shift_id', shiftId)
      .eq('user_id', userId)
      .select('id')

    if (upErr) {
      setError(upErr.message)
      return
    }

    if (!updated || updated.length === 0) {
      const { error: insErr } = await supabase
        .from('ot_requests')
        .insert({
          shift_id: shiftId,
          user_id: userId,
          status: 'requested',
          requested_at: new Date().toISOString(),
          archived: false
        })

      if (insErr) {
        setError(insErr.message)
        return
      }
    }

    load()
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

  const openNotes = (shiftId) => {
    const req = myReqByShift[shiftId]
    if (!req) {
      setError('Request the shift first to add notes.')
      return
    }
    setNotesShiftId(shiftId)
    setNotesText(req.notes || '')
    setNotesOpen(true)
  }

  const saveNotes = async () => {
    setError('')
    if (!notesShiftId) return
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const trimmed = (notesText || '').slice(0, 500)

    setNotesSaving(true)
    const { error: err } = await supabase
      .from('ot_requests')
      .update({ notes: trimmed })
      .eq('shift_id', notesShiftId)
      .eq('user_id', userId)

    if (err) setError(err.message)
    setNotesSaving(false)
    setNotesOpen(false)
    setNotesShiftId(null)
    load()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-white font-black text-2xl">Available Shifts</h1>
          <p className="text-slate-300 text-sm mt-1">Request overtime by tapping “Request OT”.</p>
          {myTeam ? (
            <p className="text-xs text-slate-400 mt-1">Roster filter uses your team: <span className="text-slate-200 font-bold">{myTeam}</span></p>
          ) : (
            <p className="text-xs text-amber-200 mt-1">Team not set yet — roster filtering is disabled until you set your team in User Profile.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadRoster} className="px-3 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Reload roster</button>
          <button onClick={load} className="px-3 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-white font-extrabold">Show only rest days</div>
          <div className="text-xs text-slate-400">Default ON. Turn OFF to show all overtime shifts.</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={showOnlyRest} onChange={(e) => setShowOnlyRest(e.target.checked)} />
          <div className={`w-14 h-8 rounded-full border ${showOnlyRest ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800/70 border-slate-700'} relative transition`}>
            <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition ${showOnlyRest ? 'translate-x-6' : ''}`}></div>
          </div>
        </label>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}

      <div className="mt-5 grid gap-4">
        {!loading && visibleShifts.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No shifts match the filter</div>
            <div className="text-sm mt-1">Try turning OFF “Show only rest days”.</div>
          </div>
        ) : null}

        {visibleShifts.map((s) => (
          <ShiftCard
            key={s.id}
            shift={s}
            myReq={myReqByShift[s.id]}
            counts={counts[s.id]}
            onRequest={() => requestOt(s.id)}
            onCancel={() => cancelRequest(s.id)}
            onNotes={() => openNotes(s.id)}
          />
        ))}
      </div>

      {notesOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-card p-5">
            <div className="text-white font-black text-xl">Notes</div>
            <div className="text-xs text-slate-400 mt-1">Max 500 characters. Saved to Supabase and included in reports.</div>

            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value.slice(0, 500))}
              rows={6}
              className="mt-3 w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"
              placeholder="Enter notes…"
            />
            <div className="text-xs text-slate-400 mt-1">{notesText.length}/500</div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => { setNotesOpen(false); setNotesShiftId(null) }}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-800/70 border border-slate-700 text-white font-extrabold">Cancel</button>
              <button disabled={notesSaving} onClick={saveNotes}
                className="flex-1 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">
                {notesSaving ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
