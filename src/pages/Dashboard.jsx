import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TrophyIcon from '../components/ui/TrophyIcon'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import { subscribeToUserStats } from '../lib/firestore'
import useAppStore from '../store/useAppStore'
import Spinner from '../components/ui/Spinner'

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

// ── Badge EN VIVO / Sin partido ──────────────────────────────────────
function LiveStatusBadge() {
  const [showTip, setShowTip] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setShowTip((v) => !v)}
        className="flex items-center gap-2 text-muted text-xs hover:text-subtle transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a10 10 0 0 0-3.6 19.4L12 12l3.6 9.4A10 10 0 0 0 12 2z"/>
          <path d="M2.5 8.5h5l4.5 3.5-4.5 3.5h-5M21.5 8.5h-5L12 12l4.5 3.5h5"/>
        </svg>
        <span>Sin partido en vivo</span>
        <span className="text-muted/60 text-xs">ⓘ</span>
      </button>
      {showTip && (
        <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl px-3 py-2 text-xs text-subtle z-10 shadow-xl whitespace-nowrap">
          No hay partidos en curso ahora mismo
        </div>
      )}
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
    <div className="flex flex-col items-center justify-center pt-16 px-6 gap-6 text-center">
      <TrophyIcon size={96} className="drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
      <div>
        <h2 className="text-xl font-black text-white mb-1">¡Bienvenido a la Quiniela!</h2>
        <p className="text-muted text-sm">Crea una sala o únete a una con el código que te compartieron para empezar a predecir.</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={() => navigate('/salas')}
          className="w-full bg-gold text-bg font-bold py-3.5 rounded-xl text-sm active:scale-95 transition-all"
        >
          Crear o unirme a una sala
        </button>
      </div>
      <p className="text-xs text-muted">Si ya tienes un código de invitación, ingrésalo en la pantalla de salas.</p>
    </div>
  )
}

// ── Dashboard principal ──────────────────────────────────────────────
export default function Dashboard({ user, rooms }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const { matches, loading, liveMatch, nextMatch, refreshAll } = useMatches()

  useEffect(() => { refreshAll() }, [])

  if (loading) return <Spinner className="pt-20" />

  if (!currentRoomId && rooms?.length === 0) return <Onboarding />

  const grouped = groupByDay(matches)

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* EN VIVO o badge sin partido */}
      {liveMatch
        ? <LiveCard match={liveMatch} roomId={currentRoomId} userId={user?.uid} />
        : <LiveStatusBadge />
      }

      {/* Cuenta regresiva al próximo partido */}
      {nextMatch && <NextMatchCountdown match={nextMatch} />}

      {/* Mis stats */}
      {currentRoomId && <MyStats roomId={currentRoomId} userId={user?.uid} />}

      {/* Todos los partidos */}
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
          <p className="text-subtle text-sm">Cargando el calendario del Mundial...</p>
        </div>
      )}
    </div>
  )
}
