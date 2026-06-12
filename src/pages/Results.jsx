import { useEffect } from 'react'
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

  useEffect(() => {
    if (match.homeScore !== null) calculateAndSave(match)
  }, [match.id])

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || 'Jugador'
  const sorted = [...predictions].sort((a, b) => (b.points || 0) - (a.points || 0))
  const winner = sorted.find((p) => p.points !== null && p.points > 0)
  const isFirstMatch = true // only show winner card for most recent

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Winner highlight */}
      {winner && (
        <div className="bg-win/15 border-b border-win/30 px-4 py-4 text-center">
          <p className="text-2xl mb-1">🏆</p>
          <p className="text-xs text-win/70 mb-0.5">
            Partido · {match.homeTeam?.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam?.shortName} · FT
          </p>
          <p className="text-win font-black text-lg">¡{getAlias(winner.userId)} ganó!</p>
          <p className="text-xs text-win/70 mt-1">
            Predijo {winner.homeScore}–{winner.awayScore} · {getPointsLabel(winner.points)}
          </p>
        </div>
      )}

      {/* Match header */}
      <div className="px-4 py-3 border-b border-border">
        <p className="font-bold text-sm">
          {match.homeTeam?.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam?.shortName}
        </p>
        <p className="text-xs text-muted mt-0.5">{formatDate(match.kickoff)}{match.group ? ` · ${match.group}` : ''}</p>
      </div>

      {/* Resultados del partido */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest px-4 pt-3 pb-1">Resultados del partido</p>
          <div className="px-4 divide-y divide-border">
            {sorted.map((pred) => (
              <div
                key={pred.id}
                className={`flex items-center justify-between py-2.5 ${pred.userId === user?.uid ? 'text-gold' : 'text-white'}`}
              >
                <div className="flex items-center gap-2">
                  {pred.userId === winner?.userId && <span className="text-sm">🥇</span>}
                  <span className="text-sm font-medium">{getAlias(pred.userId)}</span>
                  <span className="text-xs text-muted">{pred.homeScore}–{pred.awayScore}</span>
                </div>
                {pred.points !== null && (
                  <span className={`text-xs font-bold ${getPointsColor(pred.points)}`}>
                    {pred.points === 3 ? '+3 pts · exacto!' :
                     pred.points === 2 ? '+2 pts · empate ✓' :
                     pred.points === 1 ? '+1 pt · resultado ✓' : '+0 pts'}
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
  const { finishedMatches, loading } = useMatches()
  const { members } = useLeaderboard(currentRoomId)

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId) return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center px-6">
      <p className="text-3xl">👥</p>
      <p className="text-subtle text-sm">Únete a una sala para ver resultados</p>
    </div>
  )

  const leader = members[0]

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Tabla general */}
      {members.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Tabla general</p>
          <div className="bg-card border border-border rounded-2xl px-4 py-1">
            {members.map((m, i) => (
              <LeaderboardRow key={m.uid} member={m} position={i} isCurrentUser={m.uid === user?.uid} />
            ))}
          </div>
          {leader && (
            <div className="mt-2 bg-win/10 border border-win/20 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-win font-medium">🏆 {leader.alias} lidera la sala</span>
              <span className="text-xs text-win font-bold">{leader.totalPoints} pts total</span>
            </div>
          )}
        </div>
      )}

      {/* Partidos finalizados */}
      {finishedMatches.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Partidos finalizados</p>
          {[...finishedMatches].reverse().map((match) => (
            <div key={match.id} className="mb-3">
              <MatchResults
                match={match}
                roomId={currentRoomId}
                user={user}
                members={members}
              />
            </div>
          ))}
        </div>
      )}

      {finishedMatches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-subtle text-sm">Aún no han terminado partidos</p>
        </div>
      )}
    </div>
  )
}
