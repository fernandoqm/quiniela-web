import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import useAppStore from '../store/useAppStore'
import {
  saveAwardPicks, subscribeToAwardPicks, subscribeToLeaderboard,
  getPlayersDoc, getAwardResults,
} from '../lib/firestore'
import Spinner from '../components/ui/Spinner'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

const POSITION_LABELS = {
  Goalkeeper: 'Portero',
  Defence:    'Defensor',
  Midfield:   'Mediocampista',
  Offence:    'Delantero',
}

const AWARDS = [
  { key: 'topScorer',   icon: '🥾', title: 'Bota de Oro',   subtitle: 'Máximo goleador',  positionFilter: null },
  { key: 'goldenBall',  icon: '⚽', title: 'Balón de Oro',  subtitle: 'Mejor jugador',     positionFilter: null },
  { key: 'goldenGlove', icon: '🧤', title: 'Guante de Oro', subtitle: 'Mejor portero',     positionFilter: 'Goalkeeper' },
]

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
    if (!acc[p.teamName]) acc[p.teamName] = { crest: p.teamCrest, players: [] }
    acc[p.teamName].players.push(p)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end" onClick={onClose}>
      <div className="bg-surface rounded-t-3xl flex flex-col" style={{ maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
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
              El admin debe sincronizar las plantillas primero.
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

export default function Awards({ user }) {
  const { currentRoomId } = useAppStore()
  const location = useLocation()

  const [awardPicks, setAwardPicks] = useState([])
  const [awardResults, setAwardResults] = useState({})
  const [members, setMembers] = useState([])
  const [players, setPlayers] = useState([])
  const [qualifiedTlas, setQualifiedTlas] = useState(new Set())
  const [activePicker, setActivePicker] = useState(null)
  const [savingAward, setSavingAward] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!currentRoomId) { setReady(true); return }
    return subscribeToAwardPicks(currentRoomId, (picks) => {
      setAwardPicks(picks)
      setReady(true)
    })
  }, [currentRoomId])

  useEffect(() => {
    if (!currentRoomId) return
    return subscribeToLeaderboard(currentRoomId, setMembers)
  }, [currentRoomId])

  useEffect(() => {
    getPlayersDoc().then((data) => { if (data) setPlayers(data.players || []) })
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
    const q = query(collection(db, 'matches'), where('stage', '==', 'FINAL'))
    return onSnapshot(q, (snap) => {
      if (snap.empty) { setIsLocked(false); return }
      const m = snap.docs[0].data()
      setIsLocked(['IN_PLAY', 'PAUSED', 'FINISHED'].includes(m.status) || Date.now() >= toDate(m.kickoff).getTime())
    })
  }, [])

  useEffect(() => {
    const key = location.state?.scrollTo
    if (!key || !ready) return
    const el = document.getElementById(key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.state?.scrollTo, ready])

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
        <span className="text-5xl opacity-40">🏆</span>
        <p className="text-muted text-sm">Selecciona una sala para ver las predicciones</p>
      </div>
    )
  }

  if (!ready) {
    return <div className="flex justify-center py-10"><Spinner /></div>
  }

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
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl">🥾</span>
              <span className="text-3xl">⚽</span>
              <span className="text-3xl">🧤</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Premios Individuales</h1>
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

      <div className="flex flex-col gap-5">
        {AWARDS.map((award) => {
          const myPick = myAwardPick?.[award.key] ?? null
          const result = awardResults[award.key] ?? null
          const isCorrect = result && myPick && myPick.id === result.id
          const isWrong   = result && myPick && myPick.id !== result.id
          const othersWithPick = awardPicks
            .filter((p) => p.userId !== user?.uid && p[award.key])
            .map((p) => ({ alias: getAlias(p.userId), pick: p[award.key] }))
          const othersNoPick = members
            .filter((m) => m.uid !== user?.uid && !awardPicks.find((p) => p.userId === m.uid)?.[award.key])
            .map((m) => ({ alias: m.alias, pick: null }))
          const allOthers = [...othersWithPick, ...othersNoPick]

          return (
            <div key={award.key} id={award.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{award.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{award.title}</p>
                  <p className="text-xs text-muted">{award.subtitle}</p>
                </div>
              </div>

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
                  style={{ background: 'rgba(30,41,59,0.5)', border: '1.5px dashed rgba(100,116,139,0.4)' }}
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
