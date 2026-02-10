import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'

export default function Calendar({ profile }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const userId = (await supabase.auth.getUser()).data?.user?.id

    const { data, error: err } = await supabase
      .from('shift_confirmations')
      .select('id, created_at, shift:shifts(id, shift_date, start_time, end_time, department, notes)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return items
      .filter((x) => (x.shift?.shift_date || '') >= today)
      .sort((a, b) => (a.shift.shift_date > b.shift.shift_date ? 1 : -1))
  }, [items])

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">My Shifts</h1>
          <p className="text-slate-300 text-sm mt-1">A transparent log of shifts you’ve been confirmed for.</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700 font-extrabold text-sm active:scale-[0.99]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {loading ? <div className="text-slate-300">Loading…</div> : null}

        {!loading && upcoming.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/40 border border-slate-800 p-6 text-slate-200">
            <div className="font-extrabold text-white">No confirmed shifts</div>
            <div className="text-sm mt-1">When your manager confirms you, it will show here.</div>
          </div>
        ) : null}

        {upcoming.map((x) => {
          const s = x.shift
          const d = new Date(s.shift_date)
          return (
            <div key={x.id} className="rounded-3xl bg-slate-900/50 border border-slate-800 p-4 shadow-card">
              <div className="text-white font-extrabold">{format(d, 'EEE dd MMM yyyy')}</div>
              <div className="text-sm text-slate-300 mt-1">{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)} · {s.department}</div>
              {s.notes ? (
                <div className="mt-3 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
                  {s.notes}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-xs text-slate-400">
        Signed in as {profile?.full_name || profile?.id}
      </div>
    </div>
  )
}
