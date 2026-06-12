import { useEffect } from 'react'
import { isMatchWindow } from '../../lib/footballApi'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

export default function LiveMatchCard({ match, onRefresh }) {
  useEffect(() => {
    if (!match) return
    const kickoff = toDate(match.kickoff)
    if (!isMatchWindow(kickoff)) return
    const interval = setInterval(onRefresh, 60 * 1000)
    return () => clearInterval(interval)
  }, [match?.id])

  if (!match) return null

  const isPaused = match.status === 'PAUSED'
  const showScore = match.status === 'PAUSED' || match.status === 'FINISHED' || match.status === 'IN_PLAY'
  const homeScore = isPaused ? match.htHomeScore : match.homeScore
  const awayScore = isPaused ? match.htAwayScore : match.awayScore

  const statusLabel = {
    IN_PLAY: '⚽ En juego',
    PAUSED: '⏸ Medio Tiempo',
    FINISHED: '✅ Final',
  }[match.status] || match.status

  return (
    <div className="bg-gradient-to-br from-blue-950/60 to-bg border border-info/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1.5 bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {statusLabel}
        </span>
        {match.group && <span className="text-xs text-muted">{match.group}</span>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1 flex-1">
          {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" className="w-10 h-10 object-contain" />}
          <span className="text-xs text-subtle text-center">{match.homeTeam.shortName}</span>
        </div>

        <div className="text-center">
          {showScore && homeScore !== null ? (
            <div className="text-4xl font-black tracking-tight">
              {homeScore} <span className="text-muted">·</span> {awayScore}
            </div>
          ) : (
            <div className="text-sm text-muted">vs</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          {match.awayTeam.crest && <img src={match.awayTeam.crest} alt="" className="w-10 h-10 object-contain" />}
          <span className="text-xs text-subtle text-center">{match.awayTeam.shortName}</span>
        </div>
      </div>
    </div>
  )
}
