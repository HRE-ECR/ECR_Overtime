import React, { useEffect, useMemo, useState } from 'react'

function isIOS() { return /iphone|ipad|ipod/i.test(window.navigator.userAgent) }
function isStandalone() {
  const iosStandalone = window.navigator.standalone === true
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  return iosStandalone || displayModeStandalone
}
function isMobile() { return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent) }

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const show = useMemo(() => !dismissed && isMobile() && !isStandalone(), [dismissed])

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  if (!show) return null

  const primaryText = deferredPrompt ? 'Add to Home Screen' : (isIOS() ? 'Install on iPhone/iPad' : 'Install')

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    } else {
      alert('On iOS: tap Share, then “Add to Home Screen”.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 mt-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-navy-800 grid place-items-center"><span className="text-white font-black">+</span></div>
        <div className="flex-1">
          <div className="font-bold text-white">Install OvertimeHub</div>
          <div className="text-sm text-slate-200 mt-1">Fast, app-like experience with offline access.</div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleInstall} className="px-4 py-2 rounded-xl bg-white text-navy-900 font-extrabold">{primaryText}</button>
            <button onClick={() => setDismissed(true)} className="px-4 py-2 rounded-xl bg-slate-800/70 text-slate-100 font-semibold">Not now</button>
          </div>
        </div>
      </div>
    </div>
  )
}
