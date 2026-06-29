import confetti from 'canvas-confetti'

// ── Fechas ─────────────────────────────────────────────────────────────
export function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

export function formatTime(kickoff) {
  return toDate(kickoff).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDay(kickoff) {
  const d = toDate(kickoff)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function groupByDay(matches) {
  return matches.reduce((acc, m) => {
    const day = formatDay(m.kickoff)
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})
}

// ── Partidos ───────────────────────────────────────────────────────────
export function formatStage(match) {
  const g = match.group?.replace('GROUP_', '')
  if (g && g.length <= 2) return `Grupo ${g}`
  const stages = {
    ROUND_OF_32: 'Dieciseisavos de final',
    LAST_32: 'Dieciseisavos de final',
    LAST_16: 'Octavos de final',
    QUARTER_FINALS: 'Cuartos de final',
    SEMI_FINALS: 'Semifinal',
    THIRD_PLACE: '3er lugar',
    FINAL: '🏆 Final',
  }
  return stages[match.stage] || ''
}

// ── Celebración ────────────────────────────────────────────────────────
export function fireConfetti() {
  const duration = 2500
  const end = Date.now() + duration
  const colors = ['#f59e0b', '#fbbf24', '#ffffff', '#4ade80']
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors })
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
