import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { subscribeToMyPrediction, subscribeToPredictions, savePrediction } from '../lib/firestore'
import useAppStore from '../store/useAppStore'
import Spinner from '../components/ui/Spinner'
import { toDate, formatDay, formatTime, formatStage, groupByDay } from '../lib/utils'

const LOCK_AFTER_KICKOFF_MS = 5 * 60 * 1000

function isLocked(match) {
  if (match.status === 'FINISHED') return true
  return Date.now() >= toDate(match.kickoff).getTime() + LOCK_AFTER_KICKOFF_MS
}

function ScoreCircle({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={disabled}
        className="w-9 h-9 flex items-center justify-center text-subtle text-xl font-bold rounded-xl hover:text-white transition-colors disabled:opacity-30"
      >
        +
      </button>
      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-colors ${
        disabled ? 'border-border bg-card/40' : 'border-gold bg-card shadow-lg shadow-gold/10'
      }`}>
        <span className={`text-3xl font-black tabular-nums ${disabled ? 'text-muted' : 'text-white'}`}>
          {value}
        </span>
      </div>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="w-9 h-9 flex items-center justify-center text-subtle text-xl font-bold rounded-xl hover:text-white transition-colors disabled:opacity-30"
      >
        −
      </button>
    </div>
  )
}

const KNOCKOUT_STAGES = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

function MatchPredictionCard({ match, roomId, userId, members }) {
  const matchId = match.id
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [winnerPrediction, setWinnerPrediction] = useState(null)
  const [myPred, setMyPred] = useState(null)
  const [allPreds, setAllPreds] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const locked = isLocked(match)
  const isKnockout = KNOCKOUT_STAGES.includes(match.stage)
  const predictedCount = members.filter((m) =>
    m.predictedMatches?.includes(String(matchId))
  ).length

  // Mi predicción — siempre visible (filtra por userId, pasa las reglas de Firestore)
  useEffect(() => {
    if (!roomId || !matchId || !userId) return
    const unsub = subscribeToMyPrediction(roomId, matchId, userId, (pred) => {
      if (pred) {
        setMyPred(pred)
        setHome(pred.homeScore)
        setAway(pred.awayScore)
        setWinnerPrediction(pred.winnerPrediction ?? null)
      } else {
        setMyPred(null)
        setHome(0)
        setAway(0)
        setWinnerPrediction(null)
      }
    })
    return unsub
  }, [roomId, matchId, userId])

  // Predicciones de la sala — solo cuando el partido ya comenzó
  useEffect(() => {
    if (!roomId || !matchId || match.status === 'TIMED') return
    const unsub = subscribeToPredictions(roomId, matchId, (preds) => {
      setAllPreds(preds)
    })
    return unsub
  }, [roomId, matchId, match.status])

  const handleSave = async () => {
    if (locked || saving) return
    setSaving(true)
    await savePrediction(roomId, userId, matchId, home, away, isKnockout && home === away ? winnerPrediction : null)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const matchStarted = match.status !== 'TIMED'
  const othersVisible = matchStarted

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {locked && (
        <div className="bg-danger/10 border-b border-danger/20 px-4 py-2 text-center">
          <span className="text-danger text-sm font-bold">🔒 Predicción cerrada</span>
        </div>
      )}

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">
              <span className="text-muted">{match.homeTeam?.tla || ''} </span>
              {match.homeTeam?.shortName} vs {match.awayTeam?.shortName}
              <span className="text-muted"> {match.awayTeam?.tla || ''}</span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              {formatDay(match.kickoff)} {formatTime(match.kickoff)}
              {formatStage(match) ? ` · ${formatStage(match)}` : ''}
            </p>
          </div>
          {members.length > 0 && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                predictedCount === members.length
                  ? 'bg-win/20 text-win'
                  : 'bg-surface text-muted'
              }`}>
                {predictedCount}/{members.length}
              </span>
              {myPred && !locked && (
                <span className="text-xs text-gold">✓ predicho</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Score selectors */}
      <div className="px-4 py-4">
        <p className="text-xs text-muted text-center mb-4">¿Cuál será el marcador final?</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            {match.homeTeam?.crest && (
              <img src={match.homeTeam.crest} alt="" className="w-7 h-7 object-contain" />
            )}
            <span className="text-xs text-subtle">{match.homeTeam?.shortName}</span>
            <ScoreCircle value={home} onChange={setHome} disabled={locked} />
          </div>

          <span className="text-2xl text-muted font-black pb-4">—</span>

          <div className="flex flex-col items-center gap-1">
            {match.awayTeam?.crest && (
              <img src={match.awayTeam.crest} alt="" className="w-7 h-7 object-contain" />
            )}
            <span className="text-xs text-subtle">{match.awayTeam?.shortName}</span>
            <ScoreCircle value={away} onChange={setAway} disabled={locked} />
          </div>
        </div>

        {/* Selector de ganador en eliminatoria (solo visible si empate) */}
        {isKnockout && home === away && (
          <div className="mt-5">
            <p className="text-xs text-muted text-center mb-2">¿Quién avanza? <span className="text-subtle">(prórroga / penales)</span></p>
            <div className="flex gap-2">
              {[
                { key: 'HOME_TEAM', team: match.homeTeam },
                { key: 'AWAY_TEAM', team: match.awayTeam },
              ].map(({ key, team }) => (
                <button
                  key={key}
                  onClick={() => setWinnerPrediction(winnerPrediction === key ? null : key)}
                  disabled={locked}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 disabled:opacity-50 ${
                    winnerPrediction === key
                      ? 'bg-gold/15 border-gold text-gold'
                      : 'bg-surface border-border text-subtle hover:border-gold/40'
                  }`}
                >
                  {team?.crest && <img src={team.crest} alt="" loading="lazy" className="w-5 h-5 object-contain" />}
                  {team?.shortName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aviso si falta elegir ganador en eliminatoria */}
        {isKnockout && home === away && !winnerPrediction && !locked && (
          <p className="mt-3 text-xs text-gold text-center">
            ⚠️ Elige quién avanza para completar tu predicción
          </p>
        )}

        {/* Save button */}
        {!locked && (
          <button
            onClick={handleSave}
            disabled={saving || (isKnockout && home === away && !winnerPrediction)}
            className={`mt-4 w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 ${
              saved
                ? 'bg-win/20 text-win border border-win/30'
                : 'bg-gold text-bg hover:bg-gold/90 active:scale-95'
            }`}
          >
            {saving ? 'Guardando...' : saved ? '✓ Predicción guardada' : 'Confirmar predicción ✓'}
          </button>
        )}

        {myPred && locked && (
          <div className="mt-3 flex justify-center">
            <span className="bg-surface border border-border text-xs text-gold px-4 py-1.5 rounded-full">
              Tu predicción: {myPred.homeScore}–{myPred.awayScore}
              {myPred.winnerPrediction && (
                <span className="text-muted ml-1">
                  · {myPred.winnerPrediction === 'HOME_TEAM' ? match.homeTeam?.shortName : match.awayTeam?.shortName} avanza
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Predicciones de la sala (visibles al iniciar el partido) */}
      {othersVisible && members.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Predicciones de tu sala</p>
          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const pred = allPreds.find((p) => p.userId === member.uid)
              const isMe = member.uid === userId
              return (
                <div key={member.uid} className="flex items-center justify-between">
                  <span className={`text-sm ${isMe ? 'text-gold font-semibold' : 'text-subtle'}`}>
                    {isMe ? 'Tú' : member.alias}
                  </span>
                  {pred ? (
                    <span className={`text-sm font-bold flex items-center gap-1 ${isMe ? 'text-gold' : 'text-white'}`}>
                      {pred.homeScore} – {pred.awayScore}
                      {pred.winnerPrediction && (
                        <span className="text-xs font-normal text-muted">
                          · {pred.winnerPrediction === 'HOME_TEAM' ? match.homeTeam?.shortName : match.awayTeam?.shortName}
                        </span>
                      )}
                      {isMe && <span className="text-xs">✏️</span>}
                    </span>
                  ) : (
                    <span className="text-xs bg-gold/15 text-gold border border-gold/25 px-2 py-0.5 rounded-full">
                      Aún no
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Predict({ user }) {
  const navigate = useNavigate()
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { matches, loading } = useMatches()
  const { members } = useLeaderboard(currentRoomId)

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId) return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3 px-6 text-center">
      <p className="text-3xl">👥</p>
      <p className="text-subtle text-sm">Únete a una sala para predecir</p>
    </div>
  )

  // Solo partidos TIMED de hoy en adelante que aún no están bloqueados
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const predictable = matches.filter((m) =>
    m.status === 'TIMED' &&
    !isLocked(m) &&
    toDate(m.kickoff).getTime() >= todayStart.getTime()
  )
  const grouped = groupByDay(predictable)

  // Partido en vivo o en medio tiempo — único caso donde mostramos un partido bloqueado
  const liveMatch = matches.find((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Botón campeón + accesos directos a premios */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/campeones')}
          className="w-full flex items-center gap-3 bg-card border border-gold/30 rounded-2xl px-4 py-3.5 text-left hover:border-gold/60 active:scale-[0.98] transition-all"
        >
          <span className="text-2xl">👑</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gold">Predice el campeón</p>
            <p className="text-xs text-muted">¿Quién levantará el trofeo?</p>
          </div>
          <span className="text-muted text-xl leading-none">›</span>
        </button>

        <div className="flex gap-2">
          {[
            { key: 'topScorer',   icon: '🥾', label: 'Bota de Oro' },
            { key: 'goldenBall',  icon: '⚽', label: 'Balón de Oro' },
            { key: 'goldenGlove', icon: '🧤', label: 'Guante de Oro' },
          ].map((award) => (
            <button
              key={award.key}
              onClick={() => navigate('/premios', { state: { scrollTo: award.key } })}
              className="flex-1 flex flex-col items-center gap-1 bg-card border border-border rounded-xl py-2.5 text-center hover:border-gold/40 active:scale-[0.97] transition-all"
            >
              <span className="text-base">{award.icon}</span>
              <span className="text-[10px] text-muted leading-tight">{award.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Partido en vivo — solo si hay uno activo */}
      {liveMatch && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest">En curso</p>
          <MatchPredictionCard
            key={liveMatch.id}
            match={liveMatch}
            roomId={currentRoomId}
            userId={user?.uid}
            members={members}
          />
        </div>
      )}

      {Object.entries(grouped).map(([day, dayMatches]) => (
        <div key={day} className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest capitalize">{day}</p>
          {dayMatches.map((m) => (
            <MatchPredictionCard
              key={m.id}
              match={m}
              roomId={currentRoomId}
              userId={user?.uid}
              members={members}
            />
          ))}
        </div>
      ))}

      {predictable.length === 0 && !liveMatch && (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-subtle text-sm">No hay partidos disponibles para predecir</p>
        </div>
      )}
    </div>
  )
}
