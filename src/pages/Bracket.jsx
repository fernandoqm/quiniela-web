import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Spinner from '../components/ui/Spinner'

const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL']

// Layout constants (px)
const BRACKET_H = 640
const LABEL_H = 28
const CARD_W = 112
const CONN_W = 20
const CARD_H = 56

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function getWinner(match) {
  if (!match || match.status !== 'FINISHED') return null
  if (match.homeScore > match.awayScore) return 'home'
  if (match.awayScore > match.homeScore) return 'away'
  return null
}

function TeamRow({ team, score, isWinner, isLoser }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 ${isWinner ? 'text-win' : isLoser ? 'text-muted' : 'text-white'}`}
      style={{ height: 28 }}
    >
      {team?.crest ? (
        <img
          src={team.crest}
          className="w-4 h-4 object-contain flex-shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-4 h-4 flex-shrink-0 rounded-sm bg-border" />
      )}
      <span className="text-[10px] font-medium truncate flex-1 leading-tight">
        {team?.shortName || 'TBD'}
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
          <TeamRow
            team={match.homeTeam}
            score={match.homeScore}
            isWinner={winner === 'home'}
            isLoser={winner === 'away'}
          />
          <div className="border-t border-border" />
          <TeamRow
            team={match.awayTeam}
            score={match.awayScore}
            isWinner={winner === 'away'}
            isLoser={winner === 'home'}
          />
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
        <span
          className={`text-center leading-tight whitespace-nowrap ${
            isFinal ? 'text-gold font-bold text-[10px]' : 'text-muted text-[9px]'
          }`}
        >
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

// Connector SVG between two adjacent rounds.
// direction='right': pairs on left → single on right (left half of bracket)
// direction='left':  single on left → pairs on right (right half of bracket)
// fromCount: the round with MORE matches (used to compute y-positions of the pairs)
function BracketConnector({ fromCount, direction = 'right' }) {
  const toCount = fromCount / 2
  const fromSpacing = BRACKET_H / fromCount
  const toSpacing = BRACKET_H / toCount
  const mid = CONN_W / 2
  const stroke = '#334155'

  const paths = []
  for (let i = 0; i < toCount; i++) {
    const y1 = (2 * i + 0.5) * fromSpacing   // center of first match in pair
    const y2 = (2 * i + 1.5) * fromSpacing   // center of second match in pair
    const ym = (i + 0.5) * toSpacing          // center of the merged match

    if (direction === 'right') {
      paths.push(
        <g key={i}>
          <line x1="0" y1={y1} x2={mid} y2={y1} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1="0" y1={y2} x2={mid} y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid} y1={ym} x2={CONN_W} y2={ym} stroke={stroke} strokeWidth="1.5" />
        </g>
      )
    } else {
      paths.push(
        <g key={i}>
          <line x1="0" y1={ym} x2={mid} y2={ym} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid} y1={y1} x2={CONN_W} y2={y1} stroke={stroke} strokeWidth="1.5" />
          <line x1={mid} y1={y2} x2={CONN_W} y2={y2} stroke={stroke} strokeWidth="1.5" />
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

// Simple horizontal line at BRACKET_H/2 (connects SF ↔ Final)
function SimpleConnector() {
  return (
    <div className="shrink-0" style={{ width: CONN_W }}>
      <div style={{ height: LABEL_H }} />
      <svg width={CONN_W} height={BRACKET_H}>
        <line
          x1="0"
          y1={BRACKET_H / 2}
          x2={CONN_W}
          y2={BRACKET_H / 2}
          stroke="#334155"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}

function pad(arr, count) {
  return [...arr, ...Array(Math.max(0, count - arr.length)).fill(null)]
}

export default function Bracket() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

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

  const byStage = (stage) => matches.filter((m) => m.stage === stage)

  const r32All = pad(byStage('LAST_32'), 16)
  const r16All = pad(byStage('LAST_16'), 8)
  const qfAll  = pad(byStage('QUARTER_FINALS'), 4)
  const sfAll  = pad(byStage('SEMI_FINALS'), 2)
  const finalArr = pad(byStage('FINAL'), 1)

  // Split each stage into left and right halves
  const r32Left = r32All.slice(0, 8)
  const r32Right = r32All.slice(8)
  const r16Left = r16All.slice(0, 4)
  const r16Right = r16All.slice(4)
  const qfLeft = qfAll.slice(0, 2)
  const qfRight = qfAll.slice(2)
  const sfLeft = sfAll.slice(0, 1)
  const sfRight = sfAll.slice(1)

  const hasMatches = matches.length > 0

  return (
    <div className="pb-6">
      <h1 className="text-base font-bold text-center mb-1">Llave del Mundial 2026</h1>
      <p className="text-[10px] text-muted text-center mb-3">Desliza para ver el bracket completo</p>

      {!hasMatches ? (
        <div className="text-center pt-16 px-6">
          <p className="text-muted text-sm">Aún no hay partidos de fase eliminatoria</p>
          <p className="text-muted text-xs mt-1">
            El administrador debe sincronizar los datos desde el panel de admin
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4">
          <div className="flex items-start w-max px-4 py-2">

            {/* ── Left half: R32 → R16 → QF → SF ─────────────────────── */}
            <RoundColumn matches={r32Left} label="Dieciseisavos" />
            <BracketConnector fromCount={8} direction="right" />
            <RoundColumn matches={r16Left} label="Octavos" />
            <BracketConnector fromCount={4} direction="right" />
            <RoundColumn matches={qfLeft} label="Cuartos" />
            <BracketConnector fromCount={2} direction="right" />
            <RoundColumn matches={sfLeft} label="Semifinal" />
            <SimpleConnector />

            {/* ── Center: Final ────────────────────────────────────────── */}
            <RoundColumn matches={finalArr} label="FINAL" isFinal />

            {/* ── Right half: SF → QF → R16 → R32 ─────────────────────── */}
            <SimpleConnector />
            <RoundColumn matches={sfRight} label="Semifinal" />
            <BracketConnector fromCount={2} direction="left" />
            <RoundColumn matches={qfRight} label="Cuartos" />
            <BracketConnector fromCount={4} direction="left" />
            <RoundColumn matches={r16Right} label="Octavos" />
            <BracketConnector fromCount={8} direction="left" />
            <RoundColumn matches={r32Right} label="Dieciseisavos" />

          </div>
        </div>
      )}
    </div>
  )
}
