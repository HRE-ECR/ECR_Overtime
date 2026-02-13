import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'

function shiftLabel(type) {
  if (type === 'day') return '☀️ Day'
  if (type === 'night') return '🌙 Night'
  return type
}

export default function MyShifts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const [showApprovedOnly, setShowApprovedOnly] = useState(() => localStorage.getItem('oh_myApprovedOnly') === '1')

  const todayIso = new Date().toISOString().slice(0, 10)

  const load = async () => {
    setLoading(true)
    setError('')

    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { data, error: err } = await supabase
      .from('ot_requests')
      .select('id, shift_id, status, archived, requested_at, decided_at, shift:shifts(id, shift_date, shift_type, start_time, end_time, department)')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('requested_at', { ascending: false })

    if (err) setError(err.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { localStorage.setItem('oh_myApprovedOnly', showApprovedOnly ? '1' : '0') }, [showApprovedOnly])

  const visible = useMemo(() => showApprovedOnly ? rows.filter(r => r.status === 'approved') : rows, [rows, showApprovedOnly])

  const cancel = async (shiftId, status) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const msg = status === 'approved'
      ? 'Cancel an APPROVED OT request? This will free the slot for someone else.'
      : 'Cancel this OT request?'

    if (!confirm(msg)) return

    const { error: err } = await supabase
      .from('ot_requests')
      .update({ status: 'cancelled' })
      .eq('shift_id', shiftId)
      .eq('user_id', userId)

    if (err) setError(err.message)
    else load()
  }

  const archive = async (shiftId) => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { error: err } = await supabase
      .from('ot_requests')
      .update({ archived: true })
      .eq('shift_id', shiftId)
      .eq('user_id', userId)

    if (err) setError(err.message)
    else load()
  }

  const hideDeclinedCancelled = async () => {
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    if (!confirm('Hide ALL declined and cancelled items from your list?')) return

    const { error: err } = await supabase
      .from('ot_requests')
      .update({ archived: true })
      .eq('user_id', userId)
      .in('status', ['declined', 'cancelled'])

    if (err) setError(err.message)
    else load()
  }

  const tileClass = (status) => {
    if (status === 'approved') return 'border-emerald-500/30 bg-emerald-500/10'
    if (status === 'declined' || status === 'cancelled') return 'border-rose-500/30 bg-rose-500/10'
    return 'border-slate-800 bg-slate-900/50'
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white font-black text-2xl">My OT Requests</h1>
          <p className="text-slate-300 text-sm mt-1">Cancel (requested/approved) and hide items from your list.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={hideDeclinedCancelled} className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-100 font-extrabold text-sm">Hide declined/cancelled</button>
          <button onClick={load} className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm">Refresh</button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-white font-extrabold">Show approved only</div>
          <div className="text-xs text-slate-400">Toggle to hide requested/declined/cancelled items.</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={showApprovedOnly} onChange={(e) => setShowApprovedOnly(e.target.checked)} />
          <div className={`w-14 h-8 rounded-full border ${showApprovedOnly ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800/70 border-slate-700'} relative transition`}>
            <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition ${showApprovedOnly ? 'translate-x-6' : ''}`}></div>
          </div>
        </label>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">{error}</div> : null}
      {loading ? <div className="mt-5 text-slate-300">Loading…</div> : null}

      <div className="mt-5 grid gap-3">
        {!loading && visible.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No OT requests</div>
            <div className="text-sm mt-1">Try turning OFF “Show approved only”.</div>
          </div>
        ) : null}

        {visible.map((r) => {
          const s = r.shift
          const date = s ? new Date(s.shift_date) : null
          const title = s ? `${format(date, 'EEE d MMM')} · ${shiftLabel(s.shift_type)} · ${s.department}` : r.shift_id
          const timeRange = s ? `${s.start_time?.slice(0,5)}–${s.end_time?.slice(0,5)}${s.shift_type==='night' ? ' (+1)' : ''}` : ''
          const status = r.status
          const canCancel = status === 'requested' || status === 'approved'
          const isPast = s?.shift_date ? (s.shift_date < todayIso) : false

          return (
            <div key={r.id} className={`rounded-3xl border p-4 shadow-card ${tileClass(status)}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-white font-extrabold">{title}</div>
                  <div className="text-sm text-slate-200/90 mt-1">{timeRange}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-white">{(status || '').toUpperCase()}</div>
                  <div className="mt-2 flex flex-col gap-2 items-end">
                    {canCancel ? (
                      <button onClick={() => cancel(r.shift_id, status)} className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-100 font-extrabold text-xs">Cancel</button>
                    ) : null}
                    {isPast ? (
                      <button onClick={() => archive(r.shift_id)} className="px-3 py-2 rounded-xl bg-slate-700/30 border border-slate-600/40 text-slate-100 font-extrabold text-xs">Hide from history</button>
                    ) : null}
                  </div>
                  {!isPast ? <div className="mt-1 text-[11px] text-slate-200/70">Hide only after shift date.</div> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
