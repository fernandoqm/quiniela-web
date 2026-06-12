import { useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { useLeaderboard } from '../hooks/useLeaderboard'
import useAppStore from '../store/useAppStore'
import ScoreSelector from '../components/match/ScoreSelector'
import PredictionList from '../components/prediction/PredictionList'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function isLocked(kickoff) {
  return Date.now() >= toDate(kickoff).getTime() - 5 * 60 * 1000
}

function formatDate(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(kickoff) {
  return toDate(kickoff).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

export default function Predict({ user }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { upcomingMatches, liveMatch, loading } = useMatches()
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const match = selectedMatch || liveMatch || upcomingMatches[0] || null
  const matchId = match?.id || match?.apiId

  const { predictions, submitPrediction } = usePredictions(currentRoomId, matchId)
  const { members } = useLeaderboard(currentRoomId)

  const locked = match ? isLocked(match.kickoff) || match.status !== 'TIMED' : true
  const myPred = predictions.find((p) => p.userId === user?.uid)
  const matchStarted = match?.status !== 'TIMED'

  const handleSubmit = async () => {
    if (!currentRoomId || !matchId || locked) return
    setSaving(true)
    await submitPrediction(user.uid, homeScore, awayScore)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId) return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3 px-6 text-center">
      <p className="text-3xl">👥</p>
      <p className="text-subtle">Únete a una sala primero para poder predecir</p>
    </div>
  )

  const availableMatches = [...(liveMatch ? [liveMatch] : []), ...upcomingMatches]

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Match selector */}
      {availableMatches.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {availableMatches.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatch(m)}
              className={`shrink-0 text-xs px-3 py-2 rounded-xl border ${(match?.id === m.id) ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted bg-card'}`}
            >
              {m.homeTeam?.shortName} vs {m.awayTeam?.shortName}
            </button>
          ))}
        </div>
      )}

      {match ? (
        <>
          {/* Match header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" className="w-8 h-8 object-contain" />}
              <p className="font-bold text-base">{match.homeTeam.shortName} vs {match.awayTeam.shortName}</p>
              {match.awayTeam.crest && <img src={match.awayTeam.crest} alt="" className="w-8 h-8 object-contain" />}
            </div>
            <p className="text-xs text-muted mt-1">{formatDate(match.kickoff)} · {formatTime(match.kickoff)} · {match.group}</p>
          </div>

          {/* Lock warning */}
          {!locked && (
            <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-2 text-xs text-gold text-center">
              ⏰ Cierra en menos de 5 minutos
            </div>
          )}
          {locked && match.status === 'TIMED' && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-2 text-xs text-danger text-center">
              🔒 Predicciones cerradas
            </div>
          )}

          {/* Score selector */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted text-center mb-3">¿Cuál será el marcador final?</p>
            <div className="flex justify-between px-8 mb-1">
              <span className="text-xs text-subtle">{match.homeTeam.shortName}</span>
              <span className="text-xs text-subtle">{match.awayTeam.shortName}</span>
            </div>
            <ScoreSelector
              homeScore={myPred ? myPred.homeScore : homeScore}
              awayScore={myPred ? myPred.awayScore : awayScore}
              onHomeChange={setHomeScore}
              onAwayChange={setAwayScore}
              disabled={locked || !!myPred}
            />
            {!myPred && !locked && (
              <Button onClick={handleSubmit} disabled={saving} className="mt-3">
                {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Confirmar predicción ✓'}
              </Button>
            )}
            {myPred && !locked && (
              <p className="text-center text-xs text-gold mt-3">✓ Predicción guardada</p>
            )}
          </div>

          {/* Others predictions */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-widest mb-3">
              {matchStarted ? 'Predicciones de la sala' : 'Tu sala'}
            </p>
            <PredictionList
              predictions={predictions}
              members={members}
              matchStarted={matchStarted}
              currentUserId={user?.uid}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
          <p className="text-3xl">📅</p>
          <p className="text-subtle text-sm">No hay partidos disponibles para predecir</p>
        </div>
      )}
    </div>
  )
}
