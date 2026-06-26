import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import TrophyIcon from '../components/ui/TrophyIcon'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { subscribeToUserStats, resetTTL } from '../lib/firestore'
import useAppStore from '../store/useAppStore'
import Spinner from '../components/ui/Spinner'

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

function groupByDay(matches) {
  return matches.reduce((acc, m) => {
    const day = formatDay(m.kickoff)
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})
}

// ── Cuenta regresiva al próximo partido ──────────────────────────────
function NextMatchCountdown({ match }) {
  const [ms, setMs] = useState(() => Math.max(0, toDate(match.kickoff).getTime() - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setMs(Math.max(0, toDate(match.kickoff).getTime() - Date.now())), 1000)
    return () => clearInterval(id)
  }, [match.kickoff])

  const fmt = (ms) => {
    if (ms <= 0) return '¡Ya!'
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}min`
    if (m > 0) return `${m}min ${sec}s`
    return `${sec}s`
  }

  const isFinal = match.stage === 'FINAL'

  return (
    <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${isFinal ? 'bg-gold/5 border-gold/30' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 min-w-0">
        {isFinal && <TrophyIcon size={40} className="shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
        <div className="min-w-0">
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Próximo partido</p>
          <p className="text-sm font-semibold truncate">
            {match.homeTeam?.shortName} vs {match.awayTeam?.shortName}
          </p>
          <p className="text-xs text-muted">{formatStage(match)} · {formatTime(match.kickoff)}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted mb-0.5">⏰ Empieza en</p>
        <p className={`text-xl font-black tabular-nums ${isFinal ? 'text-gold' : 'text-gold'}`}>{fmt(ms)}</p>
      </div>
    </div>
  )
}

// ── Mini stats personales ────────────────────────────────────────────
function MyStats({ roomId, userId }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!roomId || !userId) return
    return subscribeToUserStats(roomId, userId, setStats)
  }, [roomId, userId])

  if (!stats || stats.total === 0) return null

  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-widest mb-2">Mis stats</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Predicciones', value: stats.total, icon: '🎯' },
          { label: 'Puntos', value: stats.points, icon: '⭐' },
          { label: 'Exactos', value: stats.exactos, icon: '💎' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl px-3 py-3 text-center">
            <p className="text-lg mb-0.5">{icon}</p>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Tarjeta EN VIVO ──────────────────────────────────────────────────
function LiveCard({ match, roomId, userId }) {
  const { predictions } = usePredictions(roomId, match?.id)
  const myPred = predictions.find((p) => p.userId === userId)

  return (
    <div className="bg-card border border-danger/40 rounded-2xl p-4 shadow-lg shadow-danger/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
          EN VIVO
        </span>
        {match.minute && <span className="text-danger text-sm font-bold">· {match.minute}′</span>}
        <span className="text-xs text-muted ml-auto">{formatStage(match)}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          {match.homeTeam?.crest
            ? <img src={match.homeTeam.crest} alt="" className="w-10 h-10 object-contain mx-auto mb-1" />
            : <span className="text-3xl block mb-1">🏳️</span>}
          <p className="text-2xl font-black">{match.homeTeam?.tla || match.homeTeam?.shortName}</p>
          <p className="text-xs text-muted mt-0.5">{match.homeTeam?.name || match.homeTeam?.shortName}</p>
        </div>

        <div className="text-center px-2">
          <p className="text-5xl font-black tabular-nums tracking-tight">
            {match.homeScore ?? '–'} · {match.awayScore ?? '–'}
          </p>
          {match.status === 'PAUSED' && <span className="text-xs text-gold font-bold mt-1 block">MEDIO TIEMPO</span>}
        </div>

        <div className="flex-1 text-center">
          {match.awayTeam?.crest
            ? <img src={match.awayTeam.crest} alt="" className="w-10 h-10 object-contain mx-auto mb-1" />
            : <span className="text-3xl block mb-1">🏳️</span>}
          <p className="text-2xl font-black">{match.awayTeam?.tla || match.awayTeam?.shortName}</p>
          <p className="text-xs text-muted mt-0.5">{match.awayTeam?.name || match.awayTeam?.shortName}</p>
        </div>
      </div>

      {myPred && (
        <div className="mt-4 flex justify-center">
          <span className="bg-surface border border-border text-xs text-subtle px-4 py-1.5 rounded-full">
            Tu predicción · {myPred.homeScore}–{myPred.awayScore}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Fila de partido ──────────────────────────────────────────────────
function MatchRow({ match }) {
  const showScore = match.status === 'PAUSED' || match.status === 'FINISHED' || match.status === 'IN_PLAY'
  const stage = formatStage(match)

  return (
    <div className={`flex items-center gap-2 py-2.5 border-b border-border last:border-0 ${match.status === 'IN_PLAY' ? 'bg-danger/5 rounded-lg px-1 -mx-1' : ''}`}>
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <span className="text-xs font-medium text-right truncate">{match.homeTeam?.shortName}</span>
        {match.homeTeam?.crest
          ? <img src={match.homeTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" />
          : <span className="text-sm shrink-0">🏳️</span>}
      </div>

      <div className="w-24 text-center shrink-0">
        {showScore ? (
          <>
            <span className={`text-sm font-black ${match.status === 'FINISHED' ? 'text-subtle' : 'text-white'}`}>
              {match.homeScore} – {match.awayScore}
            </span>
            <div className="text-xs">
              {match.status === 'IN_PLAY' && <span className="text-danger font-bold">En vivo</span>}
              {match.status === 'PAUSED' && <span className="text-gold font-bold">MT</span>}
              {match.status === 'FINISHED' && <span className="text-muted">FT</span>}
            </div>
          </>
        ) : (
          <span className="text-xs text-gold font-medium">{formatTime(match.kickoff)}</span>
        )}
        {stage && <div className="text-[10px] text-muted truncate mt-0.5">{stage}</div>}
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {match.awayTeam?.crest
          ? <img src={match.awayTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" />
          : <span className="text-sm shrink-0">🏳️</span>}
        <span className="text-xs font-medium truncate">{match.awayTeam?.shortName}</span>
      </div>
    </div>
  )
}

// ── Onboarding ───────────────────────────────────────────────────────
function Onboarding() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-4">
      {/* Banner con imagen */}
      <div className="relative rounded-2xl overflow-hidden h-48">
        <img src={`${import.meta.env.BASE_URL}mundial.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover object-left" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <h2 className="text-xl font-black text-white">¡Bienvenido!</h2>
          <p className="text-gold text-sm font-semibold">Quiniela Mundial 2026</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 text-center">
        <p className="text-subtle text-sm">Crea una sala o únete con el código que te compartieron para empezar a predecir.</p>
        <button
          onClick={() => navigate('/salas')}
          className="w-full bg-gold text-bg font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all"
        >
          Crear o unirme a una sala
        </button>
        <p className="text-xs text-muted">Si ya tienes un código de invitación, ingrésalo en la pantalla de salas.</p>
      </div>
    </div>
  )
}

// ── Dashboard principal ──────────────────────────────────────────────
export default function Dashboard({ user, rooms }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { matches, loading, liveMatches, liveMatch, nextMatch, finishedMatches, refreshAll, refreshLiveShared, forceRefreshMatch } = useMatches()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [visibleDays, setVisibleDays] = useState(2)
  const [now, setNow] = useState(Date.now())
  const confettiFired = useRef(false)

  // Reloj interno — actualiza cada minuto para recomputar ventanas de partido
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const lastFinished = finishedMatches[finishedMatches.length - 1] || null
  const { predictions: lastMatchPreds, calculateAndSave: calcLastMatch } = usePredictions(currentRoomId, lastFinished?.id, { isFinished: true })

  // Auto-scoring: calcular puntos de todos cuando carga el último partido terminado
  useEffect(() => {
    if (!lastFinished || lastMatchPreds.length === 0) return
    if (lastFinished.homeScore === null) return
    const hasUnscored = lastMatchPreds.some((p) => p.points === null)
    if (hasUnscored) calcLastMatch(lastFinished)
  }, [lastMatchPreds.length, lastFinished?.id])

  // Confeti si ganó el último partido (incluye empates)
  useEffect(() => {
    if (confettiFired.current || liveMatch || !lastFinished || lastMatchPreds.length === 0) return
    const sorted = [...lastMatchPreds].sort((a, b) => (b.points || 0) - (a.points || 0))
    const topPoints = sorted[0]?.points ?? 0
    const winners = topPoints > 0 ? sorted.filter((p) => p.points === topPoints) : []
    if (winners.some((w) => w.userId === user?.uid)) {
      confettiFired.current = true
      fireConfetti()
    }
  }, [lastMatchPreds.length, liveMatch])

  // Partido a vigilar: en vivo > kickoff pasado > próximo en <3 min
  const matchToWatch = liveMatch || matches.find((m) => {
    const kickoff = toDate(m.kickoff).getTime()
    return m.status === 'TIMED' && now >= kickoff - 3 * 60 * 1000
  }) || null

  // ¿Estamos en ventana de partido? (desde 3 min antes hasta 150 min después del kickoff)
  const inMatchWindow = matches.some((m) => {
    const kickoff = toDate(m.kickoff).getTime()
    return now >= kickoff - 3 * 60 * 1000 && now <= kickoff + 150 * 60 * 1000
  })

  // Carga inicial al abrir la app
  useEffect(() => {
    refreshAll()
  }, [])

  // Refresh automático solo durante ventana de partido (90s con cache-bust)
  // Fuera de ventana: sin polling, los datos no cambian
  useEffect(() => {
    if (!inMatchWindow || !matchToWatch?.apiId) return
    forceRefreshMatch(matchToWatch.apiId)
    const id = setInterval(() => refreshLiveShared(matchToWatch.apiId), 90 * 1000)
    return () => clearInterval(id)
  }, [inMatchWindow, matchToWatch?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshError(false)
    try {
      await resetTTL()
      await refreshAll()
      if (matchToWatch?.apiId) await forceRefreshMatch(matchToWatch.apiId)
    } catch (e) {
      console.error('Error al actualizar:', e)
      setRefreshError(true)
      setTimeout(() => setRefreshError(false), 3000)
    }
    setRefreshing(false)
  }

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId && rooms?.length === 0) return <Onboarding />

  const grouped = groupByDay(matches)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const allDays = Object.keys(grouped).filter((day) => {
    const d = toDate(grouped[day][0].kickoff)
    d.setHours(0, 0, 0, 0)
    return d >= today
  })
  const visibleDayKeys = allDays.slice(0, visibleDays)
  const hasMoreDays = visibleDays < allDays.length

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Botón actualizar */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 p-3 -m-3 ${
            refreshError ? 'text-danger' : 'text-muted active:text-subtle'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          {refreshing ? 'Actualizando...' : refreshError ? 'Error, intenta de nuevo' : 'Actualizar'}
        </button>
      </div>

      {/* EN VIVO — aparece un card por cada partido activo */}
      {liveMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          {liveMatches.map((m) => (
            <LiveCard key={m.id} match={m} roomId={currentRoomId} userId={user?.uid} />
          ))}
        </div>
      )}

      {/* Cuenta regresiva al próximo partido */}
      {nextMatch && <NextMatchCountdown match={nextMatch} />}

      {/* Mis stats */}
      {currentRoomId && <MyStats roomId={currentRoomId} userId={user?.uid} />}

      {/* Partidos por día (paginado de 2 en 2 días) */}
      {visibleDayKeys.map((day) => (
        <div key={day}>
          <p className="text-xs text-muted uppercase tracking-widest mb-1 capitalize">{day}</p>
          <div className="bg-card border border-border rounded-xl px-3">
            {grouped[day].map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </div>
      ))}

      {hasMoreDays && (
        <button
          onClick={() => setVisibleDays((d) => d + 2)}
          className="w-full py-2.5 text-sm text-muted border border-border rounded-xl hover:bg-card transition-colors"
        >
          Ver más partidos
        </button>
      )}

      {matches.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-subtle text-sm">Cargando el calendario del Mundial...</p>
        </div>
      )}
    </div>
  )
}
