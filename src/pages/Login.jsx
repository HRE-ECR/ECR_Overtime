import React,{useState} from 'react'
import {Link} from 'react-router-dom'
import {supabase,isSupabaseReady,supabaseConfigError} from '../lib/supabaseClient'

export default function Login(){
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[message,setMessage]=useState('')
  const[loading,setLoading]=useState(false)

  const signIn=async(e)=>{
    e.preventDefault();
    setMessage('')
    if(!isSupabaseReady){setMessage(supabaseConfigError||'Supabase is not configured.');return;}
    setLoading(true)
    const{error}=await supabase.auth.signInWithPassword({email,password})
    if(error) setMessage(error.message)
    setLoading(false)
  }

  return(
    <div className="max-w-md mx-auto mt-12">
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-6">
        <h1 className="text-2xl font-black text-white">OvertimeHub</h1>
        <p className="text-slate-300 text-sm mt-2">Sign in with email + password.</p>
        <form onSubmit={signIn} className="mt-6 grid gap-3">
          <label className="text-sm font-bold text-slate-200">Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"/>
          <label className="text-sm font-bold text-slate-200">Password</label>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required className="w-full px-4 py-3 rounded-2xl bg-slate-950/40 border border-slate-700 text-white"/>
          <button disabled={loading} className="mt-2 px-4 py-3 rounded-2xl bg-white text-navy-900 font-extrabold disabled:opacity-60">{loading?'Signing in…':'Sign in'}</button>
        </form>
        {message ? <div className="mt-4 text-sm text-slate-200 bg-slate-950/40 border border-slate-800 rounded-2xl p-3">{message}</div> : null}
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/register" className="text-slate-200 underline">Create account</Link>
          <Link to="/forgot" className="text-slate-300 underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
