import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatTime(kickoff) {
  return toDate(kickoff).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(kickoff) {
  const d = toDate(kickoff)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })
}

function groupByDay(matches) {
  return matches.reduce((acc, m) => {
    const day = formatDay(m.kickoff)
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})
}

function MatchRow({ match }) {
  const isLive = match.status === 'IN_PLAY'
  const isHT = match.status === 'PAUSED'
  const isFT = match.status === 'FINISHED'
  const showScore = isLive || isHT || isFT

  let statusBadge = null
  if (isLive) statusBadge = <span className="text-xs font-bold text-danger animate-pulse">EN VIVO</span>
  else if (isHT) statusBadge = <span className="text-xs font-bold text-gold">MT</span>
  else if (isFT) statusBadge = <span className="text-xs font-bold text-muted">FT</span>

  return (
    <div className={`flex items-center gap-2 py-3 border-b border-border last:border-0 ${isLive ? 'bg-danger/5 rounded-lg px-2 -mx-2' : ''}`}>
      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <span className="text-sm font-medium text-right truncate">{match.homeTeam?.shortName}</span>
        {match.homeTeam?.crest
          ? <img src={match.homeTeam.crest} alt="" loading="lazy" className="w-6 h-6 object-contain shrink-0" />
          : <span className="text-base shrink-0">🏳️</span>}
      </div>

      {/* Center: score or time */}
      <div className="w-24 text-center shrink-0 flex flex-col items-center gap-0.5">
        {showScore ? (
          <>
            <span className={`text-lg font-black ${isLive || isHT ? 'text-white' : 'text-subtle'}`}>
              {isHT ? (match.htHomeScore ?? '?') : (match.homeScore ?? '?')} – {isHT ? (match.htAwayScore ?? '?') : (match.awayScore ?? '?')}
            </span>
            {statusBadge}
          </>
        ) : (
          <>
            <span className="text-sm text-gold font-medium">{formatTime(match.kickoff)}</span>
            {match.group && <span className="text-xs text-muted">{match.group}</span>}
          </>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {match.awayTeam?.crest
          ? <img src={match.awayTeam.crest} alt="" loading="lazy" className="w-6 h-6 object-contain shrink-0" />
          : <span className="text-base shrink-0">🏳️</span>}
        <span className="text-sm font-medium truncate">{match.awayTeam?.shortName}</span>
      </div>
    </div>
  )
}

export default function Matches() {
  const { matches, loading, liveMatch, refreshAll, refreshLiveMatch } = useMatches()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      if (liveMatch) await refreshLiveMatch(liveMatch)
      else await refreshAll()
      setSyncMsg('✓ Actualizado')
    } catch {
      setSyncMsg('Error al cargar. Revisa tu API key.')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 3000)
  }

  if (loading) return <Spinner className="pt-20" />

  const grouped = groupByDay(matches)

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Cargando...' : liveMatch ? '🔄 Actualizar marcador en vivo' : '🔄 Cargar / actualizar partidos'}
        </Button>
        {syncMsg && <p className="text-xs text-center text-win">{syncMsg}</p>}
      </div>

      {liveMatch && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-bold">
              {liveMatch.homeTeam?.shortName} {liveMatch.homeScore ?? '?'} – {liveMatch.awayScore ?? '?'} {liveMatch.awayTeam?.shortName}
            </p>
            <p className="text-xs text-muted">Partido en vivo</p>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([day, dayMatches]) => (
        <div key={day}>
          <p className="text-xs text-muted uppercase tracking-widest mb-1 capitalize">{day}</p>
          <div className="bg-card border border-border rounded-xl px-3">
            {dayMatches.map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </div>
      ))}

      {matches.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-subtle text-sm">Presiona el botón para cargar el calendario del Mundial</p>
        </div>
      )}
    </div>
  )
}
