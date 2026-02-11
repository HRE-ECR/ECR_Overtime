import React from 'react'
import { format } from 'date-fns'

export default function ShiftCard({ shift, myReq, counts, onRequest, onCancel }) {
  const date = new Date(shift.shift_date)
  const title = `${format(date, 'EEE dd MMM')} · ${shift.shift_type.toUpperCase()}`
  const timeRange = `${shift.start_time?.slice(0,5)}–${shift.end_time?.slice(0,5)}${shift.shift_type === 'night' ? ' (+1)' : ''}`

  const status = myReq?.status || 'none'

  const requestedCount = counts?.requested || 0
  const approvedCount = counts?.approved || 0
  const declinedCount = counts?.declined || 0

  const overApproved = approvedCount > (shift.spots_available || 0)

  const chip = (label, cls) => (
    <span className={`px-3 py-1 rounded-full border text-xs font-black ${cls}`}>{label}</span>
  )

  return (
    <div className="rounded-3xl bg-slate-900/50 border border-slate-800 shadow-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-white font-extrabold text-lg leading-5">{title}</div>
            <div className="text-slate-300 text-sm mt-1">{timeRange} · {shift.department}</div>
            <div className="text-xs text-slate-400 mt-2">
              Slots: <span className="text-slate-200 font-bold">{shift.spots_available}</span> ·
              Requested: <span className="text-slate-200 font-bold">{requestedCount}</span> ·
              Approved: <span className={overApproved ? 'text-amber-200 font-bold' : 'text-slate-200 font-bold'}>{approvedCount}</span> ·
              Declined: <span className="text-slate-200 font-bold">{declinedCount}</span>
              {overApproved ? <span className="ml-2 text-amber-200 font-bold">(Over-approved)</span> : null}
            </div>
          </div>

          <div className="text-right">
            {status === 'approved' ? chip('APPROVED', 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100') : null}
            {status === 'requested' ? chip('REQUESTED', 'border-sky-500/30 bg-sky-500/10 text-sky-100') : null}
            {status === 'declined' ? chip('DECLINED', 'border-rose-500/30 bg-rose-500/10 text-rose-100') : null}
            {status === 'cancelled' ? chip('CANCELLED', 'border-slate-600/50 bg-slate-700/20 text-slate-200') : null}
            {status === 'none' ? chip('NOT REQUESTED', 'border-slate-700 text-slate-200') : null}
          </div>
        </div>

        {shift.notes ? (
          <div className="mt-3 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{shift.notes}</div>
        ) : null}

        <div className="mt-4 flex gap-2">
          {status === 'none' || status === 'declined' || status === 'cancelled' ? (
            <button onClick={onRequest} className="flex-1 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 font-extrabold">
              Request OT
            </button>
          ) : null}

          {(status === 'requested' || status === 'approved') ? (
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-100 font-extrabold">
              Cancel Request
            </button>
          ) : null}

          {status === 'approved' ? (
            <div className="text-xs text-slate-400 mt-1">Cancelling an approved OT will free up a slot for others.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
