import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import NextMatchCard from '../components/match/NextMatchCard'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatDay(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDay(matches) {
  return matches.reduce((acc, m) => {
    const day = formatDay(m.kickoff)
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})
}

export default function Matches() {
  const { matches, loading, liveMatch, refreshAll } = useMatches()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      await refreshAll()
      setSyncMsg('✓ Partidos actualizados')
    } catch {
      setSyncMsg('Error al cargar. Revisa tu API key.')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 3000)
  }

  if (loading) return <Spinner className="pt-20" />

  const upcoming = matches.filter((m) => m.status === 'TIMED')
  const grouped = groupByDay(upcoming)

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Cargando partidos...' : '🔄 Cargar / actualizar partidos del Mundial'}
        </Button>
        {syncMsg && <p className="text-xs text-center text-win">{syncMsg}</p>}
      </div>

      {liveMatch && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0" />
          <p className="text-sm font-medium">
            {liveMatch.homeTeam.shortName} vs {liveMatch.awayTeam.shortName} — En vivo
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([day, dayMatches]) => (
        <div key={day}>
          <p className="text-xs text-muted uppercase tracking-widest mb-2 capitalize">{day}</p>
          <div className="flex flex-col gap-2">
            {dayMatches.map((m) => <NextMatchCard key={m.id} match={m} />)}
          </div>
        </div>
      ))}

      {upcoming.length === 0 && !liveMatch && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-subtle text-sm">No hay partidos próximos cargados</p>
        </div>
      )}
    </div>
  )
}
