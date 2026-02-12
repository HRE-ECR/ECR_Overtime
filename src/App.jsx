import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'

import { supabase, supabaseConfigError, isSupabaseReady } from './lib/supabaseClient'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AwaitingApproval from './pages/AwaitingApproval'

import AvailableShifts from './pages/AvailableShifts'
import MyShifts from './pages/MyShifts'
import UserProfile from './pages/UserProfile'

import ShiftPlanner from './pages/ShiftPlanner'
import ModifyShifts from './pages/ModifyShifts'
import ApproveOT from './pages/ApproveOT'
import UserManagement from './pages/UserManagement'
import Report from './pages/Report'
import ShiftHistory from './pages/ShiftHistory'

import InstallPrompt from './components/InstallPrompt'

function TopNav({ user, profile, onSignOut }) {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-semibold ${isActive ? 'bg-navy-800 text-white' : 'text-slate-200 hover:bg-slate-800/60'}`

  const isApproved = user && profile?.role && profile.role !== 'new_user'
  const isManager = profile?.role === 'manager'

  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-navy-950/85 border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-navy-800 grid place-items-center shadow-card"><span className="text-white font-black">OH</span></div>
          <div>
            <div className="text-white font-extrabold leading-4">OvertimeHub</div>
            <div className="text-xs text-slate-300">{profile?.department || 'Depot'}</div>
          </div>
        </div>
        {user ? (
          <button onClick={onSignOut} className="px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-sm font-semibold">Sign out</button>
        ) : null}
      </div>

      {isApproved ? (
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <NavLink to="/" className={linkClass} end>Available Shifts</NavLink>
          <NavLink to="/my" className={linkClass}>My Shifts</NavLink>
          <NavLink to="/profile" className={linkClass}>User Profile</NavLink>
          {isManager ? (
            <>
              <NavLink to="/planner" className={linkClass}>Shift Planner</NavLink>
              <NavLink to="/modify" className={linkClass}>Modify Shifts</NavLink>
              <NavLink to="/approve" className={linkClass}>Approve OT</NavLink>
              <NavLink to="/users" className={linkClass}>User Management</NavLink>
              <NavLink to="/report" className={linkClass}>Report</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ConfigErrorScreen() {
  return (
    <div className="max-w-2xl mx-auto mt-10 rounded-3xl bg-rose-500/10 border border-rose-500/30 p-6">
      <div className="text-white font-extrabold text-xl">Configuration error</div>
      <div className="text-rose-100 mt-2">{supabaseConfigError || 'Supabase is not configured correctly.'}</div>
      <div className="text-xs text-rose-200/80 mt-4">Fix: set GitHub Secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.</div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  const user = session?.user

  useEffect(() => {
    if (!isSupabaseReady) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadProfile() {
      if (!isSupabaseReady) { setProfile(null); return }
      if (!user) { setProfile(null); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, department')
        .eq('id', user.id)
        .single()

      if (ignore) return

      if (error) {
        setProfile({ id: user.id, full_name: user.email, role: 'new_user', department: '' })
      } else {
        setProfile({ ...data, role: data?.role || 'new_user' })
      }
    }

    loadProfile()
    return () => { ignore = true }
  }, [user])

  const onSignOut = async () => {
    if (!isSupabaseReady) return
    await supabase.auth.signOut()
    navigate('/')
  }

  const isManager = profile?.role === 'manager'

  const authedRoutes = useMemo(() => {
    if (!profile?.role || profile.role === 'new_user') {
      return (
        <Routes>
          <Route path="*" element={<AwaitingApproval email={user?.email} />} />
        </Routes>
      )
    }

    return (
      <Routes>
        <Route path="/" element={<AvailableShifts />} />
        <Route path="/my" element={<MyShifts />} />
        <Route path="/profile" element={<UserProfile />} />

        <Route path="/planner" element={isManager ? <ShiftPlanner /> : <AvailableShifts />} />
        <Route path="/modify" element={isManager ? <ModifyShifts /> : <AvailableShifts />} />
        <Route path="/approve" element={isManager ? <ApproveOT /> : <AvailableShifts />} />
        <Route path="/users" element={isManager ? <UserManagement /> : <AvailableShifts />} />
        <Route path="/report" element={isManager ? <Report /> : <AvailableShifts />} />
        <Route path="/history" element={isManager ? <ShiftHistory /> : <AvailableShifts />} />

        <Route path="*" element={<AvailableShifts />} />
      </Routes>
    )
  }, [profile, user, isManager])

  const publicRoutes = (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Login />} />
    </Routes>
  )

  if (!isSupabaseReady) return <ConfigErrorScreen />

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-slate-950 to-slate-950">
      <TopNav user={user} profile={profile} onSignOut={onSignOut} />
      <InstallPrompt />
      <main className="max-w-4xl mx-auto px-4 py-5">{user ? authedRoutes : publicRoutes}</main>
      <footer className="safe-bottom max-w-4xl mx-auto px-4 pb-8 text-xs text-slate-400">
        <div className="border-t border-slate-800 pt-4">v3.4 · User Profile · Team roster filter · Band + approver display</div>
      </footer>
    </div>
  )
}
