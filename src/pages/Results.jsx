import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useLeaderboard } from '../hooks/useLeaderboard'
import useAppStore from '../store/useAppStore'
import LeaderboardRow from '../components/leaderboard/LeaderboardRow'
import { getPointsLabel, getPointsColor } from '../lib/scoring'
import Spinner from '../components/ui/Spinner'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatDate(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function MatchResults({ match, roomId, user, members }) {
  const { predictions, calculateAndSave } = usePredictions(roomId, match.id)

  useState(() => { calculateAndSave(match) }, [match.id])

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || 'Jugador'
  const sorted = [...predictions].sort((a, b) => (b.points || 0) - (a.points || 0))
  const winner = sorted[0]

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="font-semibold text-sm">
          {match.homeTeam.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam.shortName}
        </p>
        <p className="text-xs text-muted mt-0.5">{formatDate(match.kickoff)} · {match.group}</p>
      </div>

      {winner && (
        <div className="bg-win/10 border-b border-win/20 px-4 py-3 text-center">
          <p className="text-lg">🏆</p>
          <p className="text-win font-bold text-sm">¡{getAlias(winner.userId)} ganó este partido!</p>
          <p className="text-xs text-win/70 mt-0.5">{getPointsLabel(winner.points)}</p>
        </div>
      )}

      <div className="px-4 divide-y divide-border">
        {sorted.map((pred) => (
          <div key={pred.id} className={`flex items-center justify-between py-2.5 ${pred.userId === user?.uid ? 'text-gold' : 'text-white'}`}>
            <div>
              <span className="text-sm">{getAlias(pred.userId)}</span>
              <span className="text-xs text-muted ml-2">{pred.homeScore} – {pred.awayScore}</span>
            </div>
            {pred.points !== null && (
              <span className={`text-xs font-medium ${getPointsColor(pred.points)}`}>
                {getPointsLabel(pred.points)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Results({ user }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { finishedMatches, loading } = useMatches()
  const { members } = useLeaderboard(currentRoomId)

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId) return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center px-6">
      <p className="text-3xl">👥</p>
      <p className="text-subtle text-sm">Únete a una sala para ver resultados</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      {members.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Tabla general</p>
          <div className="bg-card border border-border rounded-xl px-3">
            {members.map((m, i) => (
              <LeaderboardRow key={m.uid} member={m} position={i} isCurrentUser={m.uid === user?.uid} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted uppercase tracking-widest">Partidos finalizados</p>

      {finishedMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-subtle text-sm">Aún no han terminado partidos</p>
        </div>
      ) : (
        [...finishedMatches].reverse().map((match) => (
          <MatchResults
            key={match.id}
            match={match}
            roomId={currentRoomId}
            user={user}
            members={members}
          />
        ))
      )}
    </div>
  )
}
