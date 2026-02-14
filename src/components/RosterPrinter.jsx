import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import html2pdf from 'html2pdf.js'

/**
 * Generates a PDF of the user's annual roster based on their team's pattern
 * Shows the full year with day/night/rest shifts color-coded
 */
export default function RosterPrinter({ userTeam, fullName }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generateRosterPDF = async () => {
    try {
      setError('')
      setGenerating(true)

      if (!userTeam) {
        setError('Please set your team in the profile to generate a roster.')
        setGenerating(false)
        return
      }

      // Fetch roster pattern
      const patternResult = await supabase
        .from('team_roster_pattern')
        .select('day_index, roster_type, start_time, end_time')
        .eq('team', userTeam)
        .order('day_index', { ascending: true })

      if (patternResult.error) {
        console.error('Pattern error:', patternResult.error)
        setError(`Failed to fetch roster pattern: ${patternResult.error.message}`)
        setGenerating(false)
        return
      }

      const pattern = patternResult.data || []

      if (!pattern || pattern.length === 0) {
        setError(`No roster pattern found for ${userTeam}. Please check your team assignment.`)
        setGenerating(false)
        return
      }

      // Fetch roster config - Use maybeSingle() instead of single()
      const configResult = await supabase
        .from('roster_config')
        .select('base_date')
        .eq('id', 1)
        .maybeSingle()

      if (configResult.error) {
        console.error('Config error:', configResult.error)
        setError(`Failed to fetch roster config: ${configResult.error.message}`)
        setGenerating(false)
        return
      }

      const config = configResult.data

      if (!config || !config.base_date) {
        setError('Roster configuration not found. Please contact your administrator.')
        setGenerating(false)
        return
      }

      const baseDate = new Date(config.base_date)
      const currentYear = new Date().getFullYear()

      // Create HTML content for PDF
      const htmlContent = generateHTML(
        pattern,
        baseDate,
        userTeam,
        fullName
      )

      // PDF options for A3 size
      const options = {
        margin: 5,
        filename: `${fullName || 'Roster'}_${currentYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { format: 'a3', orientation: 'landscape' }
      }

      html2pdf().set(options).from(htmlContent).save()

      setGenerating(false)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Error generating PDF: ' + err.message)
      setGenerating(false)
    }
  }

  return (
    <div className="mt-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-card p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-white font-extrabold text-lg">Export Annual Roster</h2>
          <p className="text-slate-300 text-sm mt-1">Generate a printable A3 calendar of your {new Date().getFullYear()} roster with color-coded shifts.</p>
          <div className="mt-2 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span className="text-slate-300">Day Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-slate-300">Night Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pink-400 rounded"></div>
              <span className="text-slate-300">Rest Day</span>
            </div>
          </div>
        </div>

        <button
          disabled={generating || !userTeam}
          onClick={generateRosterPDF}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:opacity-60 text-white font-extrabold text-sm whitespace-nowrap"
        >
          {generating ? 'Generating…' : 'Print This Year\'s Roster'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-100 text-sm">
          {error}
        </div>
      )}

      {!userTeam && (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-sm">
          Please set your team above before generating the roster.
        </div>
      )}
    </div>
  )
}

/**
 * Generates the HTML structure for the roster calendar
 */
function generateHTML(pattern, baseDate, team, fullName) {
  const rosterTypeInfo = {
    'day': { color: '#FCD34D', name: 'Day' },
    'night': { color: '#3B82F6', name: 'Night' },
    'rest': { color: '#F472B6', name: 'Rest' }
  }

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const daysBetween = (d1, d2) => Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))

  // Build HTML string for PDF
  let calendarHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8px; background: white; }
        .header { text-align: center; margin-bottom: 8px; }
        .header h1 { font-size: 18px; color: #1e293b; margin-bottom: 2px; }
        .header p { font-size: 10px; color: #64748b; margin-bottom: 6px; }
        .legend { display: flex; gap: 15px; justify-content: center; margin-bottom: 8px; font-size: 9px; }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-color { width: 12px; height: 12px; border-radius: 2px; }
        .months-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .month { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; background: #f8fafc; }
        .month-title { font-weight: bold; font-size: 9px; text-align: center; color: #1e293b; margin-bottom: 3px; border-bottom: 1px solid #94a3b8; padding-bottom: 2px; }
        .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; margin-bottom: 2px; }
        .weekday { font-size: 7px; font-weight: bold; text-align: center; color: #64748b; padding: 1px 0; }
        .days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; border-radius: 2px; color: #1e293b; border: 0.5px solid #cbd5e1; }
        .day.empty { background: white; border: none; }
        .day.today { font-weight: 900; font-size: 8px; border: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${fullName || 'Team'} - ${new Date().getFullYear()} Roster</h1>
        <p>Team: ${team} | Generated: ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background-color: #FCD34D;"></div>
          <span>Day</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #3B82F6;"></div>
          <span>Night</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #F472B6;"></div>
          <span>Rest</span>
        </div>
      </div>

      <div class="months-grid">
  `

  // Generate each month
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(new Date().getFullYear(), month, 1)
    const monthName = monthDate.toLocaleString('default', { month: 'short' })
    const daysCount = daysInMonth(monthDate)
    const firstDay = monthDate.getDay()

    calendarHTML += `<div class="month"><div class="month-title">${monthName}</div>`
    calendarHTML += '<div class="weekdays"><div class="weekday">S</div><div class="weekday">M</div><div class="weekday">T</div><div class="weekday">W</div><div class="weekday">T</div><div class="weekday">F</div><div class="weekday">S</div></div>'
    calendarHTML += '<div class="days">'

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += '<div class="day empty"></div>'
    }

    // Days of month
    for (let day = 1; day <= daysCount; day++) {
      const currentDate = new Date(new Date().getFullYear(), month, day)
      const delta = daysBetween(baseDate, currentDate)
      const dayIndex = ((delta % 28) + 28) % 28
      const rosterDay = pattern.find(p => p.day_index === dayIndex)

      const rosterType = rosterDay?.roster_type || 'rest'
      const info = rosterTypeInfo[rosterType]
      const isToday = currentDate.toDateString() === new Date().toDateString()

      calendarHTML += `
        <div class="day ${isToday ? 'today' : ''}" style="background-color: ${info.color};">
          ${day}
        </div>
      `
    }

    calendarHTML += '</div></div>'
  }

  calendarHTML += `
      </div>
    </body>
    </html>
  `

  // Create wrapper div with HTML content
  const htmlContent = document.createElement('div')
  htmlContent.innerHTML = calendarHTML
  return htmlContent
}