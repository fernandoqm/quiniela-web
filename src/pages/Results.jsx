import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import TrophyIcon from '../components/ui/TrophyIcon'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useLeaderboard } from '../hooks/useLeaderboard'
import useAppStore from '../store/useAppStore'
import LeaderboardRow from '../components/leaderboard/LeaderboardRow'
import { getPointsLabel, getPointsColor } from '../lib/scoring'
import Spinner from '../components/ui/Spinner'

const PAGE_SIZE = 10

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatDate(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatStage(match) {
  const g = match.group?.replace('GROUP_', '')
  if (g && g.length <= 2) return `Grupo ${g}`
  const stages = {
    LAST_16: 'Octavos de final',
    QUARTER_FINALS: 'Cuartos de final',
    SEMI_FINALS: 'Semifinal',
    THIRD_PLACE: '3er lugar',
    FINAL: '🏆 Final',
  }
  return stages[match.stage] || ''
}

function fireConfetti() {
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

function MatchResults({ match, roomId, user, members, onUserWon }) {
  const { predictions, calculateAndSave } = usePredictions(roomId, match.id, { isFinished: true })
  const notifiedWin = useRef(false)

  useEffect(() => {
    if (match.homeScore === null || predictions.length === 0) return
    const hasUnscored = predictions.some((p) => p.points === null)
    if (hasUnscored) calculateAndSave(match)
  }, [predictions.length, match.homeScore])

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || 'Jugador'
  const sorted = [...predictions].sort((a, b) => (b.points || 0) - (a.points || 0))
  const topPoints = sorted[0]?.points ?? 0
  const winners = topPoints > 0 ? sorted.filter((p) => p.points === topPoints) : []

  useEffect(() => {
    if (!onUserWon || winners.length === 0 || notifiedWin.current) return
    if (winners.some((w) => w.userId === user?.uid)) {
      notifiedWin.current = true
      onUserWon()
    }
  }, [winners.length])

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {winners.length > 0 && (
        <div className="bg-win/15 border-b border-win/30 px-4 py-4 text-center">
          <TrophyIcon size={40} className="mx-auto mb-1" />
          <p className="text-xs text-win/70 mb-0.5">
            {match.homeTeam?.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam?.shortName} · FT
          </p>
          <p className="text-win font-black text-lg">
            {winners.length === 1
              ? `¡${getAlias(winners[0].userId)} ganó!`
              : `¡${winners.map((w) => getAlias(w.userId)).join(' y ')} ganaron!`}
          </p>
          <p className="text-xs text-win/70 mt-1">
            Predijeron {winners[0].homeScore}–{winners[0].awayScore} · {getPointsLabel(winners[0].points)}
          </p>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border">
        <p className="font-bold text-sm">
          {match.homeTeam?.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam?.shortName}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatDate(match.kickoff)}{formatStage(match) ? ` · ${formatStage(match)}` : ''}
        </p>
      </div>

      {sorted.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest px-4 pt-3 pb-1">Predicciones</p>
          <div className="px-4 divide-y divide-border">
            {sorted.map((pred) => (
              <div
                key={pred.id}
                className={`flex items-center justify-between py-2.5 ${pred.userId === user?.uid ? 'text-gold' : 'text-white'}`}
              >
                <div className="flex items-center gap-2">
                  {winners.some((w) => w.userId === pred.userId) && <span className="text-sm">🥇</span>}
                  <span className="text-sm font-medium">{getAlias(pred.userId)}</span>
                  <span className="text-xs text-muted">{pred.homeScore}–{pred.awayScore}</span>
                </div>
                {pred.points !== null && (
                  <span className={`text-xs font-bold ${getPointsColor(pred.points)}`}>
                    {pred.points === 3 ? '+3 · exacto! 💎' :
                     pred.points === 2 ? '+2 · empate ✓' :
                     pred.points === 1 ? '+1 · resultado ✓' : '+0 pts'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Results({ user }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { finishedMatches, liveMatch, loading } = useMatches()
  const { members } = useLeaderboard(currentRoomId)
  const confettiFired = useRef(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const handleUserWonLastMatch = () => {
    if (confettiFired.current) return
    confettiFired.current = true
    fireConfetti()
  }

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId) return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center px-6">
      <p className="text-3xl">👥</p>
      <p className="text-subtle text-sm">Únete a una sala para ver resultados</p>
    </div>
  )

  const leader = members[0]
  // Filtrar solo partidos del torneo (desde el 11 de junio 2026)
  const TORNEO_START = new Date('2026-06-11').getTime()
  const reversedFinished = [...finishedMatches]
    .filter((m) => toDate(m.kickoff).getTime() >= TORNEO_START)
    .reverse()
  const visibleMatches = reversedFinished.slice(0, visibleCount)
  const hasMore = visibleCount < reversedFinished.length

  return (
    <div className="flex flex-col gap-4 pb-4">
      {members.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Tabla general</p>
          <div className="relative overflow-hidden bg-card border border-border rounded-2xl px-4 py-1">
            <TrophyIcon size={120} className="absolute -right-6 -bottom-4 opacity-[0.07] pointer-events-none" />
            {members.map((m, i) => (
              <LeaderboardRow key={m.uid} member={m} position={i} isCurrentUser={m.uid === user?.uid} />
            ))}
          </div>
          {leader && (
            <div className="mt-2 bg-win/10 border border-win/20 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-win font-medium flex items-center gap-1.5">
                <TrophyIcon size={14} />
                {leader.alias} lidera la sala
              </span>
              <span className="text-xs text-win font-bold">{leader.totalPoints} pts total</span>
            </div>
          )}
        </div>
      )}

      {reversedFinished.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Partidos finalizados</p>
          {visibleMatches.map((match, i) => (
            <div key={match.id} className="mb-3">
              <MatchResults
                match={match}
                roomId={currentRoomId}
                user={user}
                members={members}
                onUserWon={i === 0 && !liveMatch ? handleUserWonLastMatch : undefined}
              />
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-2.5 text-sm text-muted border border-border rounded-xl hover:bg-card transition-colors"
            >
              Ver {Math.min(PAGE_SIZE, reversedFinished.length - visibleCount)} partidos más
            </button>
          )}
        </div>
      )}

      {reversedFinished.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-subtle text-sm">Aún no han terminado partidos</p>
        </div>
      )}
    </div>
  )
}
