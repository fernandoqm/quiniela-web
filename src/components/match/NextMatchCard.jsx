import { useState, useEffect } from 'react'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatCountdown(kickoff) {
  const diff = toDate(kickoff) - Date.now()
  if (diff <= 0) return 'Iniciando...'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function formatTime(kickoff) {
  return toDate(kickoff).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

export default function NextMatchCard({ match }) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!match) return
    setCountdown(formatCountdown(match.kickoff))
    const id = setInterval(() => setCountdown(formatCountdown(match.kickoff)), 30000)
    return () => clearInterval(id)
  }, [match?.id])

  if (!match) return null

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" className="w-6 h-6 object-contain shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {match.homeTeam.shortName} vs {match.awayTeam.shortName}
          </p>
          <p className="text-xs text-muted">{match.group} · {formatTime(match.kickoff)}</p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-gold bg-gold/10 px-2.5 py-1 rounded-lg font-medium">
        {countdown}
      </span>
    </div>
  )
}
