import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import useAppStore from '../store/useAppStore'
import {
  saveChampionPick, subscribeToChampionPicks, subscribeToLeaderboard,
  saveAwardPicks, subscribeToAwardPicks, getPlayersDoc, getAwardResults,
} from '../lib/firestore'
import Spinner from '../components/ui/Spinner'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

// ── Team picker (campeón) — sin cambios ─────────────────────────────────────

function TeamPicker({ onPick, onClose, saving }) {
  const [teams, setTeams] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'matches')).then((snap) => {
      const teamMap = {}
      snap.docs.forEach((d) => {
        const m = d.data()
        if (m.homeTeam?.name) teamMap[m.homeTeam.name] = m.homeTeam
        if (m.awayTeam?.name) teamMap[m.awayTeam.name] = m.awayTeam
      })
      setTeams(Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    })
  }, [])

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.shortName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.tla || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-surface rounded-t-3xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <p className="font-bold text-base">¿Quién será el campeón?</p>
        </div>
        <div className="px-4 pb-3 shrink-0">
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-gold"
          />
        </div>
        <div className="overflow-y-auto flex-1 border-t border-border">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">
              {teams.length === 0 ? 'El admin debe sincronizar los partidos primero' : 'Sin resultados'}
            </p>
          ) : (
            filtered.map((team) => (
              <button
                key={team.name}
                onClick={() => onPick(team)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-card transition-colors text-left border-b border-border/40 last:border-0 disabled:opacity-40"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {team.crest ? (
                    <img src={team.crest} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{team.name}</p>
                  {team.shortName && team.shortName !== team.name && (
                    <p className="text-xs text-muted">{team.shortName}</p>
                  )}
                </div>
                {team.tla && <span className="text-xs text-muted font-mono shrink-0">{team.tla}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Player picker (premios individuales) ────────────────────────────────────

const POSITION_LABELS = {
  Goalkeeper: 'Portero',
  Defence:    'Defensor',
  Midfield:   'Mediocampista',
  Offence:    'Delantero',
}

function PlayerPicker({ title, positionFilter, players, qualifiedTlas, onPick, onClose, saving }) {
  const [search, setSearch] = useState('')

  const eligible = players.filter((p) => {
    if (qualifiedTlas.size > 0 && !qualifiedTlas.has(p.teamTla)) return false
    if (positionFilter && p.position !== positionFilter) return false
    return true
  })

  const filtered = eligible.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.teamTla || '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.teamName]) acc[p.teamName] = { crest: p.teamCrest, tla: p.teamTla, players: [] }
    acc[p.teamName].players.push(p)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-surface rounded-t-3xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <p className="font-bold text-base">{title}</p>
        </div>
        <div className="px-4 pb-3 shrink-0">
          <input
            type="text"
            placeholder="Buscar jugador o equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-gold"
          />
        </div>
        <div className="overflow-y-auto flex-1 border-t border-border">
          {players.length === 0 ? (
            <p className="text-center text-muted text-sm py-10 px-6 leading-relaxed">
              El admin debe sincronizar las plantillas primero desde el panel de administración.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">Sin resultados</p>
          ) : (
            Object.entries(grouped).map(([teamName, data]) => (
              <div key={teamName}>
                <div className="flex items-center gap-2 px-4 py-2 bg-card/40 border-b border-border sticky top-0 z-10">
                  {data.crest && (
                    <img src={data.crest} className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{teamName}</span>
                </div>
                {data.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card transition-colors text-left border-b border-border/30 last:border-0 disabled:opacity-40"
                  >
                    <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                      {p.shirtNumber ?? '·'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">{POSITION_LABELS[p.position] || p.position}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Configuración de premios ─────────────────────────────────────────────────

const AWARDS = [
  { key: 'topScorer',   icon: '🥾', title: 'Bota de Oro',   subtitle: 'Máximo goleador',    positionFilter: null },
  { key: 'goldenBall',  icon: '⚽', title: 'Balón de Oro',  subtitle: 'Mejor jugador',       positionFilter: null },
  { key: 'goldenGlove', icon: '🧤', title: 'Guante de Oro', subtitle: 'Mejor portero',       positionFilter: 'Goalkeeper' },
]

// ── Main component ───────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉']

export default function Champions({ user }) {
  const { currentRoomId } = useAppStore()
  const location = useLocation()

  // Champion
  const [picks, setPicks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Awards
  const [awardPicks, setAwardPicks] = useState([])
  const [awardResults, setAwardResults] = useState({})
  const [players, setPlayers] = useState([])
  const [qualifiedTlas, setQualifiedTlas] = useState(new Set())
  const [activePicker, setActivePicker] = useState(null)
  const [savingAward, setSavingAward] = useState(false)

  useEffect(() => {
    if (!currentRoomId) { setLoading(false); return }
    const unsub = subscribeToChampionPicks(currentRoomId, (p) => {
      setPicks(p)
      setLoading(false)
    })
    return unsub
  }, [currentRoomId])

  useEffect(() => {
    if (!currentRoomId) return
    return subscribeToLeaderboard(currentRoomId, setMembers)
  }, [currentRoomId])

  useEffect(() => {
    const q = query(collection(db, 'matches'), where('stage', '==', 'FINAL'))
    return onSnapshot(q, (snap) => {
      if (snap.empty) { setIsLocked(false); return }
      const m = snap.docs[0].data()
      const started = ['IN_PLAY', 'PAUSED', 'FINISHED'].includes(m.status) || Date.now() >= toDate(m.kickoff).getTime()
      setIsLocked(started)
    })
  }, [])

  useEffect(() => {
    if (!currentRoomId) return
    return subscribeToAwardPicks(currentRoomId, setAwardPicks)
  }, [currentRoomId])

  useEffect(() => {
    getPlayersDoc().then((data) => {
      if (data) setPlayers(data.players || [])
    })
    getAwardResults().then(setAwardResults)
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'matches'), where('stage', '==', 'LAST_32'))
    return onSnapshot(q, (snap) => {
      const tlas = new Set()
      snap.docs.forEach((d) => {
        const m = d.data()
        if (m.homeTeam?.tla) tlas.add(m.homeTeam.tla)
        if (m.awayTeam?.tla) tlas.add(m.awayTeam.tla)
      })
      setQualifiedTlas(tlas)
    })
  }, [])

  useEffect(() => {
    const key = location.state?.scrollTo
    if (!key) return
    const el = document.getElementById(key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.state?.scrollTo])

  const handlePick = async (team) => {
    setSaving(true)
    await saveChampionPick(currentRoomId, user.uid, team)
    setShowPicker(false)
    setSaving(false)
  }

  const handleAwardPick = async (awardKey, player) => {
    setSavingAward(true)
    await saveAwardPicks(currentRoomId, user.uid, { [awardKey]: player })
    setActivePicker(null)
    setSavingAward(false)
  }

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || uid.slice(0, 6)

  if (!currentRoomId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <span className="text-5xl opacity-40">👑</span>
        <p className="text-muted text-sm">Selecciona una sala para ver las predicciones de campeón</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

  const myPick = picks.find((p) => p.userId === user?.uid)

  const enrichedPicks = picks
    .map((pick) => {
      const member = members.find((m) => m.uid === pick.userId)
      const position = members.findIndex((m) => m.uid === pick.userId)
      return { ...pick, alias: member?.alias || pick.userId.slice(0, 6), position, isCurrentUser: pick.userId === user?.uid }
    })
    .sort((a, b) => {
      const ap = a.position >= 0 ? a.position : Infinity
      const bp = b.position >= 0 ? b.position : Infinity
      return ap - bp
    })

  const otherPicks = enrichedPicks.filter((p) => !p.isCurrentUser)

  const myAwardPick = awardPicks.find((p) => p.userId === user?.uid)

  return (
    <div className="flex flex-col pb-4">

      {/* Hero */}
      <div className="relative -mx-4 -mt-4 mb-6">
        <div
          className="px-6 pt-10 pb-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(15,23,42,0) 60%)' }}
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none select-none flex items-center justify-center">
            <span style={{ fontSize: 180 }}>🏆</span>
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/15 border border-gold/30 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
                <path d="M2 19h20l-2-9-5 5-3-8-3 8-5-5-2 9z" />
                <rect x="2" y="20" width="20" height="2" rx="1" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Campeón del Mundo</h1>
            <p className="text-sm text-muted mt-1">FIFA World Cup 2026</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
      </div>

      {isLocked && (
        <div className="mb-5 bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-center">
          <p className="text-amber-400 text-sm font-semibold">🔒 La Final comenzó — predicciones cerradas</p>
        </div>
      )}

      {/* Mi predicción de campeón */}
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-widest mb-3">Tu predicción · Campeón</p>
        {myPick ? (
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(30,41,59,0.8) 100%)',
              border: '1px solid rgba(234,179,8,0.3)',
            }}
          >
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              {myPick.team?.crest ? (
                <img src={myPick.team.crest} className="w-16 h-16 object-contain drop-shadow-lg" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-border" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg text-white leading-tight">{myPick.team?.name}</p>
              <p className="text-xs text-gold/70 mt-0.5">{myPick.team?.shortName || myPick.team?.tla}</p>
              <p className="text-xs text-gold mt-2">✓ Tu predicción</p>
            </div>
            {!isLocked && (
              <button onClick={() => setShowPicker(true)} className="text-xs text-muted border border-border rounded-lg px-3 py-2 hover:border-gold/60 hover:text-white transition-colors shrink-0">
                Cambiar
              </button>
            )}
          </div>
        ) : isLocked ? (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-muted text-sm">No hiciste una predicción</p>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full rounded-2xl py-8 flex flex-col items-center gap-3 transition-all group"
            style={{
              background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(30,41,59,0.5) 100%)',
              border: '1.5px dashed rgba(234,179,8,0.35)',
            }}
          >
            <span className="text-3xl">👑</span>
            <div>
              <p className="text-sm font-bold text-gold/80 group-hover:text-gold transition-colors">Seleccionar mi campeón</p>
              <p className="text-xs text-muted mt-1">Elige al ganador del Mundial 2026</p>
            </div>
          </button>
        )}
      </div>

      {/* Predicciones de la sala — campeón */}
      {otherPicks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border" />
            <p className="text-xs text-muted uppercase tracking-widest whitespace-nowrap">
              Sala · {otherPicks.length} {otherPicks.length === 1 ? 'predicción' : 'predicciones'}
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {otherPicks.map((pick, idx) => (
              <div key={pick.userId} className={`flex items-center gap-3 px-4 py-3 ${idx < otherPicks.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {pick.team?.crest ? (
                    <img src={pick.team.crest} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-border" />
                  )}
                </div>
                <span className="text-sm font-semibold flex-1 truncate">{pick.team?.shortName || pick.team?.name}</span>
                <span className="text-xs text-muted shrink-0">{pick.alias}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {picks.length === 0 && !isLocked && (
        <p className="text-center text-muted text-xs mb-8">Sé el primero en predecir al campeón</p>
      )}

      {/* ── Premios individuales ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-border" />
        <p className="text-xs text-muted uppercase tracking-widest whitespace-nowrap">Premios individuales</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex flex-col gap-5">
        {AWARDS.map((award) => {
          const myPick = myAwardPick?.[award.key] ?? null
          const result = awardResults[award.key] ?? null
          const isCorrect = result && myPick && myPick.id === result.id
          const isWrong  = result && myPick && myPick.id !== result.id
          const othersWithPick = awardPicks
            .filter((p) => p.userId !== user?.uid && p[award.key])
            .map((p) => ({ alias: getAlias(p.userId), pick: p[award.key] }))
          const othersNoPick = members
            .filter((m) => m.uid !== user?.uid && !awardPicks.find((p) => p.userId === m.uid)?.[award.key])
            .map((m) => ({ alias: m.alias, pick: null }))
          const allOthers = [...othersWithPick, ...othersNoPick]

          return (
            <div key={award.key} id={award.key}>
              {/* Header del premio */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{award.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{award.title}</p>
                  <p className="text-xs text-muted">{award.subtitle}</p>
                </div>
              </div>

              {/* Mi pick */}
              {myPick ? (
                <div className={`flex items-center gap-3 bg-card rounded-2xl px-4 py-3 mb-2 border ${isCorrect ? 'border-win/50' : isWrong ? 'border-danger/40' : 'border-gold/25'}`}>
                  <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-[10px] font-bold text-muted shrink-0">
                    {myPick.shirtNumber ?? '·'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{myPick.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {myPick.teamCrest && (
                        <img src={myPick.teamCrest} className="w-3.5 h-3.5 object-contain shrink-0" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <p className="text-xs text-muted">{myPick.teamShortName}</p>
                    </div>
                  </div>
                  {isCorrect ? (
                    <span className="text-xs font-bold text-win shrink-0">+100 pts</span>
                  ) : isWrong ? (
                    <span className="text-xs text-danger shrink-0">✗</span>
                  ) : (
                    <span className="text-xs text-gold mr-1 shrink-0">✓</span>
                  )}
                  {!isLocked && (
                    <button
                      onClick={() => setActivePicker(award.key)}
                      className="text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:border-gold/60 hover:text-white transition-colors shrink-0"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              ) : !isLocked ? (
                <button
                  onClick={() => setActivePicker(award.key)}
                  className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 mb-2 transition-all group"
                  style={{
                    background: 'rgba(30,41,59,0.5)',
                    border: '1.5px dashed rgba(100,116,139,0.4)',
                  }}
                >
                  <span className="text-lg">{award.icon}</span>
                  <p className="text-sm font-semibold text-muted group-hover:text-white transition-colors">
                    Elegir {award.title}
                  </p>
                </button>
              ) : (
                <div className="bg-card border border-border rounded-2xl px-4 py-3 text-center mb-2">
                  <p className="text-muted text-sm">No hiciste una predicción</p>
                </div>
              )}

              {/* Picks de la sala */}
              {allOthers.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {allOthers.map((p, i) => (
                    <div key={p.alias + i} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < allOthers.length - 1 ? 'border-b border-border/60' : ''}`}>
                      <span className="text-xs text-muted flex-1 truncate">{p.alias}</span>
                      {p.pick ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.pick.teamCrest && (
                            <img src={p.pick.teamCrest} className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <span className="text-xs text-white font-medium">{p.pick.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted/50 italic shrink-0">Sin elegir</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pickers */}
      {showPicker && (
        <TeamPicker onPick={handlePick} onClose={() => setShowPicker(false)} saving={saving} />
      )}

      {activePicker && (
        <PlayerPicker
          title={`¿Quién ganará la ${AWARDS.find((a) => a.key === activePicker)?.title}?`}
          positionFilter={AWARDS.find((a) => a.key === activePicker)?.positionFilter ?? null}
          players={players}
          qualifiedTlas={qualifiedTlas}
          onPick={(player) => handleAwardPick(activePicker, player)}
          onClose={() => setActivePicker(null)}
          saving={savingAward}
        />
      )}
    </div>
  )
}
