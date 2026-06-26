import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Spinner from '../components/ui/Spinner'
import { toDate, formatDay, formatTime } from '../lib/utils'

const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

const STAGE_LABELS = {
  LAST_32: 'Dieciseisavos de final',
  LAST_16: 'Octavos de final',
  QUARTER_FINALS: 'Cuartos de final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Tercer lugar',
  FINAL: '🏆 Final',
}

// ── Bracket layout constants (px) ───────────────────────────────────────────
const BRACKET_H = 640
const LABEL_H   = 28
const CARD_W    = 112
const CONN_W    = 20
const CARD_H    = 56

function getWinner(match) {
  if (!match || match.status !== 'FINISHED') return null
  if (match.homeScore > match.awayScore) return 'home'
  if (match.awayScore > match.homeScore) return 'away'
  return null
}

const formatMatchDate = formatDay
const formatMatchTime = formatTime

// ── Bracket components (sin cambios) ────────────────────────────────────────

function TeamRow({ team, score, isWinner, isLoser }) {
  const [showName, setShowName] = useState(false)
  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 relative ${isWinner ? 'text-win' : isLoser ? 'text-muted' : 'text-white'}`}
      style={{ height: 28 }}
    >
      <button
        className="flex-shrink-0 relative"
        onClick={() => setShowName((v) => !v)}
        onBlur={() => setShowName(false)}
      >
        {team?.crest ? (
          <img
            src={team.crest}
            className="w-5 h-5 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-5 h-5 rounded-sm bg-border" />
        )}
        {showName && team?.name && (
          <div className="absolute left-0 bottom-full mb-1 bg-surface border border-border rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap z-30 shadow-lg pointer-events-none">
            {team.name}
          </div>
        )}
      </button>
      <span className="text-[9px] font-semibold truncate flex-1 leading-tight opacity-80">
        {team?.tla || (team?.shortName || 'TBD').slice(0, 4)}
      </span>
      {score !== null && score !== undefined && (
        <span className={`text-[10px] font-bold w-3 text-right flex-shrink-0 ${isWinner ? 'text-win' : ''}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function MatchCard({ match }) {
  const winner = getWinner(match)
  return (
    <div
      className="rounded border border-border bg-card overflow-hidden"
      style={{ width: CARD_W, height: CARD_H }}
    >
      {match ? (
        <>
          <TeamRow team={match.homeTeam} score={match.homeScore} isWinner={winner === 'home'} isLoser={winner === 'away'} />
          <div className="border-t border-border" />
          <TeamRow team={match.awayTeam} score={match.awayScore} isWinner={winner === 'away'} isLoser={winner === 'home'} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 px-2 text-muted" style={{ height: 28 }}>
            <div className="w-4 h-4 rounded-sm bg-border flex-shrink-0" />
            <span className="text-[10px]">Por definir</span>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center gap-1.5 px-2 text-muted" style={{ height: 28 }}>
            <div className="w-4 h-4 rounded-sm bg-border flex-shrink-0" />
            <span className="text-[10px]">Por definir</span>
          </div>
        </>
      )}
    </div>
  )
}

function RoundColumn({ matches, label, isFinal = false }) {
  const slotH = BRACKET_H / matches.length
  return (
    <div className="shrink-0" style={{ width: CARD_W }}>
      <div className="flex items-center justify-center px-0.5" style={{ height: LABEL_H }}>
        <span className={`text-center leading-tight whitespace-nowrap ${isFinal ? 'text-gold font-bold text-[10px]' : 'text-muted text-[9px]'}`}>
          {label}
        </span>
      </div>
      <div className="relative" style={{ height: BRACKET_H }}>
        {matches.map((match, i) => (
          <div
            key={match?.id || `empty-${i}`}
            className="absolute left-0"
            style={{ top: i * slotH + (slotH - CARD_H) / 2 }}
          >
            <MatchCard match={match} />
          </div>
        ))}
      </div>
    </div>
  )
}

function BracketConnector({ fromCount, direction = 'right' }) {
  const toCount     = fromCount / 2
  const fromSpacing = BRACKET_H / fromCount
  const toSpacing   = BRACKET_H / toCount
  const mid         = CONN_W / 2
  const stroke      = '#334155'
  const paths       = []
  for (let i = 0; i < toCount; i++) {
    const y1 = (2 * i + 0.5) * fromSpacing
    const y2 = (2 * i + 1.5) * fromSpacing
    const ym = (i + 0.5) * toSpacing
    if (direction === 'right') {
      paths.push(
        <g key={i}>
          <line x1="0"    y1={y1} x2={mid}   y2={y1} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid}  y1={y1} x2={mid}   y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1="0"    y1={y2} x2={mid}   y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid}  y1={ym} x2={CONN_W} y2={ym} stroke={stroke} strokeWidth="1.5" />
        </g>
      )
    } else {
      paths.push(
        <g key={i}>
          <line x1="0"    y1={ym} x2={mid}   y2={ym} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid}  y1={y1} x2={mid}   y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid}  y1={y1} x2={CONN_W} y2={y1} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid}  y1={y2} x2={CONN_W} y2={y2} stroke={stroke} strokeWidth="1.5" />
        </g>
      )
    }
  }
  return (
    <div className="shrink-0" style={{ width: CONN_W }}>
      <div style={{ height: LABEL_H }} />
      <svg width={CONN_W} height={BRACKET_H}>{paths}</svg>
    </div>
  )
}

function SimpleConnector() {
  return (
    <div className="shrink-0" style={{ width: CONN_W }}>
      <div style={{ height: LABEL_H }} />
      <svg width={CONN_W} height={BRACKET_H}>
        <line x1="0" y1={BRACKET_H / 2} x2={CONN_W} y2={BRACKET_H / 2} stroke="#334155" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// ── Vista de lista ───────────────────────────────────────────────────────────

function MatchListCard({ match }) {
  const winner     = getWinner(match)
  const isFinished = match.status === 'FINISHED'
  const isLive     = match.status === 'IN_PLAY' || match.status === 'PAUSED'

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-danger uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse inline-block" />
            En vivo
          </span>
        ) : isFinished ? (
          <span className="text-[10px] text-muted uppercase tracking-widest">Finalizado</span>
        ) : (
          <span className="text-[10px] text-muted">
            {formatMatchDate(match.kickoff)} · {formatMatchTime(match.kickoff)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {match.homeTeam?.crest ? (
            <img src={match.homeTeam.crest} alt="" className="w-9 h-9 object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-border" />
          )}
          <span className={`text-[11px] font-semibold text-center leading-tight ${
            winner === 'home' ? 'text-win' : winner === 'away' ? 'text-muted' : 'text-white'
          }`}>
            {match.homeTeam?.shortName || 'Por definir'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
          {isFinished || isLive ? (
            <span className="text-xl font-black tabular-nums leading-none">
              <span className={winner === 'home' ? 'text-win' : 'text-white'}>{match.homeScore}</span>
              <span className="text-muted mx-1">–</span>
              <span className={winner === 'away' ? 'text-win' : 'text-white'}>{match.awayScore}</span>
            </span>
          ) : (
            <span className="text-sm font-bold text-muted">vs</span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5">
          {match.awayTeam?.crest ? (
            <img src={match.awayTeam.crest} alt="" className="w-9 h-9 object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-border" />
          )}
          <span className={`text-[11px] font-semibold text-center leading-tight ${
            winner === 'away' ? 'text-win' : winner === 'home' ? 'text-muted' : 'text-white'
          }`}>
            {match.awayTeam?.shortName || 'Por definir'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ListView({ matches }) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 pb-8 gap-3 text-center px-6">
        <span className="text-5xl">🏟️</span>
        <p className="text-white font-bold text-base">Dieciseisavos próximamente</p>
        <p className="text-muted text-sm max-w-[260px] leading-relaxed">
          Los partidos aparecerán aquí cuando el administrador sincronice los datos de la fase eliminatoria.
        </p>
      </div>
    )
  }

  const grouped = KNOCKOUT_STAGES.reduce((acc, stage) => {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length > 0) acc[stage] = stageMatches
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(grouped).map(([stage, stageMatches]) => (
        <div key={stage} className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest">{STAGE_LABELS[stage]}</p>
          {stageMatches.map((m) => (
            <MatchListCard key={m.id} match={m} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Bracket helpers ──────────────────────────────────────────────────────────

function pad(arr, count) {
  return [...arr, ...Array(Math.max(0, count - arr.length)).fill(null)]
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Bracket() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')

  useEffect(() => {
    const q = query(collection(db, 'matches'), where('stage', 'in', KNOCKOUT_STAGES))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => toDate(a.kickoff) - toDate(b.kickoff))
      setMatches(data)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center pt-24">
        <Spinner />
      </div>
    )
  }

  const r32All   = pad(matches.filter((m) => m.stage === 'LAST_32'),        16)
  const r16All   = pad(matches.filter((m) => m.stage === 'LAST_16'),         8)
  const qfAll    = pad(matches.filter((m) => m.stage === 'QUARTER_FINALS'),  4)
  const sfAll    = pad(matches.filter((m) => m.stage === 'SEMI_FINALS'),     2)
  const finalArr = pad(matches.filter((m) => m.stage === 'FINAL'),           1)

  const r32Left  = r32All.slice(0, 8);  const r32Right = r32All.slice(8)
  const r16Left  = r16All.slice(0, 4);  const r16Right = r16All.slice(4)
  const qfLeft   = qfAll.slice(0, 2);   const qfRight  = qfAll.slice(2)
  const sfLeft   = sfAll.slice(0, 1);   const sfRight  = sfAll.slice(1)

  return (
    <div className="pb-6">
      <h1 className="text-base font-bold text-center mb-3">Llave del Mundial 2026</h1>

      {/* Toggle de vista */}
      <div className="flex gap-1 mb-4 bg-card border border-border rounded-xl p-1">
        <button
          onClick={() => setView('list')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            view === 'list' ? 'bg-gold text-bg' : 'text-muted hover:text-white'
          }`}
        >
          Partidos
        </button>
        <button
          onClick={() => setView('bracket')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            view === 'bracket' ? 'bg-gold text-bg' : 'text-muted hover:text-white'
          }`}
        >
          Llave
        </button>
      </div>

      {view === 'list' ? (
        <ListView matches={matches} />
      ) : matches.length === 0 ? (
        <div className="text-center pt-16 px-6">
          <p className="text-muted text-sm">Aún no hay partidos de fase eliminatoria</p>
          <p className="text-muted text-xs mt-1">
            El administrador debe sincronizar los datos desde el panel de admin
          </p>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-muted text-center mb-3">
            Toca un escudo para ver el nombre · Desliza para ver todo
          </p>
          <div className="overflow-x-auto -mx-4">
            <div className="flex items-start w-max px-4 py-2">
              <RoundColumn matches={r32Left}  label="32avos" />
              <BracketConnector fromCount={8} direction="right" />
              <RoundColumn matches={r16Left}  label="Octavos" />
              <BracketConnector fromCount={4} direction="right" />
              <RoundColumn matches={qfLeft}   label="Cuartos" />
              <BracketConnector fromCount={2} direction="right" />
              <RoundColumn matches={sfLeft}   label="Semis" />
              <SimpleConnector />
              <RoundColumn matches={finalArr} label="FINAL" isFinal />
              <SimpleConnector />
              <RoundColumn matches={sfRight}  label="Semis" />
              <BracketConnector fromCount={2} direction="left" />
              <RoundColumn matches={qfRight}  label="Cuartos" />
              <BracketConnector fromCount={4} direction="left" />
              <RoundColumn matches={r16Right} label="Octavos" />
              <BracketConnector fromCount={8} direction="left" />
              <RoundColumn matches={r32Right} label="32avos" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
