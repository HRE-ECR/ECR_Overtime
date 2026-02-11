import React from 'react'

export default function AwaitingApproval({ email }) {
  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">Awaiting Admin Approval</h1>
        <p className="text-slate-300 text-sm mt-2">
          Your account <span className="text-white font-semibold">({email || 'your email'})</span> is pending approval.
          <br />A manager must approve you before you can access overtime data.
        </p>
      </div>
    </div>
  )
}
