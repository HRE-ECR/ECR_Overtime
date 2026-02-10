import React from 'react'
import { format } from 'date-fns'

const pill = {
  available: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  backup: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  unavailable: 'bg-slate-500/20 text-slate-200 border-slate-500/30'
}

export default function ShiftCard({ shift, myResponse, onRespond, confirmedUsersCount }) {
  const date = new Date(shift.shift_date)
  const timeRange = `${shift.start_time?.slice(0,5)}–${shift.end_time?.slice(0,5)}`
  const spotsText = `${confirmedUsersCount}/${shift.spots_available} confirmed`

  return (
    <div className="rounded-3xl bg-slate-900/50 border border-slate-800 shadow-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-white font-extrabold text-lg leading-5">
              {format(date, 'EEE dd MMM')} · {timeRange}
            </div>
            <div className="text-slate-300 text-sm mt-1">
              {shift.department} · <span className="text-slate-200 font-semibold">{spotsText}</span>
            </div>
          </div>
          {myResponse ? (
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${pill[myResponse.status] || pill.unavailable}`}>
              {myResponse.status.toUpperCase()}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-slate-200">
              NO RESPONSE
            </span>
          )}
        </div>

        {shift.notes ? (
          <div className="mt-3 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
            {shift.notes}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => onRespond('available')}
            className="py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold active:scale-[0.99]"
          >
            Available
          </button>
          <button
            onClick={() => onRespond('backup')}
            className="py-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-100 font-extrabold active:scale-[0.99]"
          >
            Backup
          </button>
          <button
            onClick={() => onRespond('unavailable')}
            className="py-3 rounded-2xl bg-slate-700/40 border border-slate-600/50 text-slate-100 font-extrabold active:scale-[0.99]"
          >
            Unavail
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Tip: tap a button again to update your status. Changes sync instantly.
        </div>
      </div>
    </div>
  )
}
