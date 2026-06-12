import { useEffect } from 'react'
import { useMatches } from '../hooks/useMatches'
import { useLeaderboard } from '../hooks/useLeaderboard'
import useAppStore from '../store/useAppStore'
import LiveMatchCard from '../components/match/LiveMatchCard'
import NextMatchCard from '../components/match/NextMatchCard'
import LeaderboardRow from '../components/leaderboard/LeaderboardRow'
import Spinner from '../components/ui/Spinner'

export default function Dashboard({ user, rooms }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { liveMatch, nextMatch, loading, refreshAll, refreshLiveMatch } = useMatches()
  const { members } = useLeaderboard(currentRoomId)

  useEffect(() => {
    refreshAll()
  }, [])

  if (loading) return <Spinner className="pt-20" />

  const top4 = members.slice(0, 4)

  return (
    <div className="flex flex-col gap-4 pb-4">
      {liveMatch ? (
        <LiveMatchCard match={liveMatch} onRefresh={() => refreshLiveMatch(liveMatch)} />
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-muted text-sm">No hay partidos en vivo</p>
        </div>
      )}

      {nextMatch && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Próximo partido</p>
          <NextMatchCard match={nextMatch} />
        </div>
      )}

      {currentRoomId && top4.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">
            {rooms.find((r) => r.id === currentRoomId)?.name || 'Tu sala'} · Top {top4.length}
          </p>
          <div className="bg-card border border-border rounded-xl px-3">
            {top4.map((m, i) => (
              <LeaderboardRow key={m.uid} member={m} position={i} isCurrentUser={m.uid === user?.uid} />
            ))}
          </div>
        </div>
      )}

      {!currentRoomId && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">👥</p>
          <p className="text-sm text-subtle font-medium">Únete o crea una sala</p>
          <p className="text-xs text-muted mt-1">Ve a la pestaña Salas para comenzar</p>
        </div>
      )}
    </div>
  )
}
