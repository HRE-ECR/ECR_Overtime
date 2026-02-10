import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Calendar from './pages/Calendar'
import EmployeeShiftFeed from './components/EmployeeShiftFeed'
import InstallPrompt from './components/InstallPrompt'

function TopNav({ user, profile, onSignOut }) {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-semibold ${isActive ? 'bg-navy-800 text-white' : 'text-slate-200 hover:bg-slate-800/60'}`

  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-navy-950/85 border-b border-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-navy-800 grid place-items-center shadow-card">
            <span className="text-white font-black">OH</span>
          </div>
          <div>
            <div className="text-white font-extrabold leading-4">OvertimeHub</div>
            <div className="text-xs text-slate-300">{profile?.department || 'Your depot / department'}</div>
          </div>
        </div>
        {user ? (
          <button
            onClick={onSignOut}
            className="px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-sm font-semibold"
          >
            Sign out
          </button>
        ) : null}
      </div>
      {user ? (
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <NavLink to="/" className={linkClass} end>Feed</NavLink>
          <NavLink to="/calendar" className={linkClass}>My Shifts</NavLink>
          {profile?.role === 'manager' ? <NavLink to="/admin" className={linkClass}>Admin</NavLink> : null}
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const user = session?.user

  useEffect(() => {
    let ignore = false
    async function loadProfile() {
      if (!user) {
        setProfile(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, department')
        .eq('id', user.id)
        .single()
      if (!ignore) {
        if (error) {
          setProfile({ id: user.id, full_name: user.email, role: 'employee', department: '' })
        } else {
          setProfile(data)
        }
      }
    }
    loadProfile()
    return () => { ignore = true }
  }, [user])

  const onSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const routes = useMemo(() => {
    if (!user) {
      return (
        <Routes>
          <Route path="/*" element={<Login />} />
        </Routes>
      )
    }
    return (
      <Routes>
        <Route path="/" element={<EmployeeShiftFeed profile={profile} />} />
        <Route path="/calendar" element={<Calendar profile={profile} />} />
        <Route path="/admin" element={<Admin profile={profile} />} />
        <Route path="*" element={<EmployeeShiftFeed profile={profile} />} />
      </Routes>
    )
  }, [user, profile])

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-slate-950 to-slate-950">
      <TopNav user={user} profile={profile} onSignOut={onSignOut} />
      <InstallPrompt />
      <main className="max-w-3xl mx-auto px-4 py-5">
        {routes}
      </main>
      <footer className="safe-bottom max-w-3xl mx-auto px-4 pb-8 text-xs text-slate-400">
        <div className="border-t border-slate-800 pt-4">
          Offline friendly · PWA ready · Navy/Slate theme
        </div>
      </footer>
    </div>
  )
}
