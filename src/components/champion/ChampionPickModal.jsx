import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { saveChampionPick, subscribeToChampionPicks, subscribeToLeaderboard } from '../../lib/firestore'
import Spinner from '../ui/Spinner'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

export default function ChampionPickModal({ user, roomId, onClose }) {
  const [myPick, setMyPick]       = useState(null)
  const [roomPicks, setRoomPicks] = useState([])
  const [members, setMembers]     = useState([])
  const [teams, setTeams]         = useState([])
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [isLocked, setIsLocked]   = useState(false)
  const [view, setView]           = useState('main') // 'main' | 'picker'
  const [loadingTeams, setLoadingTeams] = useState(false)

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Predicciones de campeón de la sala
  useEffect(() => {
    if (!roomId) return
    return subscribeToChampionPicks(roomId, (picks) => {
      setRoomPicks(picks)
      const mine = picks.find((p) => p.userId === user?.uid)
      setMyPick(mine?.team || null)
    })
  }, [roomId, user?.uid])

  // Aliases de miembros de la sala
  useEffect(() => {
    if (!roomId) return
    return subscribeToLeaderboard(roomId, setMembers)
  }, [roomId])

  // Verificar si la Final ya comenzó → bloquear predicción
  useEffect(() => {
    const q = query(collection(db, 'matches'), where('stage', '==', 'FINAL'))
    return onSnapshot(q, (snap) => {
      if (snap.empty) { setIsLocked(false); return }
      const m = snap.docs[0].data()
      const kickoff = toDate(m.kickoff)
      const started = ['IN_PLAY', 'PAUSED', 'FINISHED'].includes(m.status) || Date.now() >= kickoff.getTime()
      setIsLocked(started)
    })
  }, [])

  const openPicker = async () => {
    if (teams.length === 0) {
      setLoadingTeams(true)
      const snap = await getDocs(collection(db, 'matches'))
      const teamMap = {}
      snap.docs.forEach((d) => {
        const m = d.data()
        if (m.homeTeam?.name) teamMap[m.homeTeam.name] = m.homeTeam
        if (m.awayTeam?.name) teamMap[m.awayTeam.name] = m.awayTeam
      })
      setTeams(Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name)))
      setLoadingTeams(false)
    }
    setSearch('')
    setView('picker')
  }

  const handlePick = async (team) => {
    setSaving(true)
    await saveChampionPick(roomId, user.uid, team)
    setView('main')
    setSaving(false)
  }

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || uid.slice(0, 6)

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.shortName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl flex flex-col relative"
        style={{ 
          maxHeight: '82vh',
          backgroundImage: `url(${import.meta.env.BASE_URL}mundial.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/80 to-surface pointer-events-none rounded-t-2xl" />
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 relative z-10">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0 border-b border-border relative z-10">
          <div className="flex items-center gap-2">
            {view === 'picker' && (
              <button
                onClick={() => setView('main')}
                className="text-muted text-lg leading-none mr-1"
              >
                ←
              </button>
            )}
            <p className="font-bold text-sm">
              {view === 'picker' ? 'Seleccionar campeón' : '¿Quién será el campeón?'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted text-2xl leading-none">&times;</button>
        </div>

        {/* ── Vista principal ─────────────────────────────────────────── */}
        {view === 'main' && (
          <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4 relative z-10">

            {/* Banner bloqueado */}
            {isLocked && (
              <div className="bg-border/20 border border-border rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-muted">La Final ya comenzó — predicciones cerradas</p>
              </div>
            )}

            {/* Sin sala */}
            {!roomId ? (
              <p className="text-center text-muted text-sm py-10">
                Selecciona una sala para hacer tu predicción
              </p>
            ) : (
              <>
                {/* Mi predicción */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted uppercase tracking-widest mb-3">Tu predicción</p>

                  {myPick ? (
                    <div className="flex items-center gap-3">
                      {myPick.crest ? (
                        <img
                          src={myPick.crest}
                          className="w-12 h-12 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-border" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{myPick.name}</p>
                        {myPick.shortName && myPick.shortName !== myPick.name && (
                          <p className="text-xs text-muted">{myPick.shortName}</p>
                        )}
                      </div>
                      {!isLocked && (
                        <button
                          onClick={openPicker}
                          className="text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:text-white transition-colors"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                  ) : isLocked ? (
                    <p className="text-muted text-sm text-center py-2">No hiciste una predicción</p>
                  ) : (
                    <button
                      onClick={openPicker}
                      className="w-full border border-dashed border-border rounded-xl py-5 text-sm text-muted hover:border-gold hover:text-gold transition-colors"
                    >
                      + Seleccionar campeón
                    </button>
                  )}
                </div>

                {/* Predicciones de la sala */}
                {roomPicks.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <p className="text-xs text-muted px-4 py-2.5 border-b border-border uppercase tracking-widest">
                      Predicciones de la sala
                    </p>
                    <div className="divide-y divide-border">
                      {roomPicks.map((pick) => (
                        <div
                          key={pick.id}
                          className={`flex items-center gap-3 px-4 py-3 ${pick.userId === user?.uid ? 'bg-gold/5' : ''}`}
                        >
                          {pick.team.crest ? (
                            <img
                              src={pick.team.crest}
                              className="w-7 h-7 object-contain flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-border flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium flex-1">
                            {pick.team.shortName || pick.team.name}
                          </span>
                          <span className={`text-xs ${pick.userId === user?.uid ? 'text-gold font-semibold' : 'text-muted'}`}>
                            {getAlias(pick.userId)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {roomPicks.length === 0 && !isLocked && (
                  <p className="text-center text-muted text-xs">Sé el primero en predecir al campeón</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Vista selector de equipo ────────────────────────────────── */}
        {view === 'picker' && (
          <>
            <div className="px-4 py-3 shrink-0 relative z-10">
              <input
                type="text"
                placeholder="Buscar equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted outline-none focus:border-gold"
              />
            </div>

            <div className="overflow-y-auto flex-1 border-t border-border relative z-10">
              {loadingTeams ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : filteredTeams.length === 0 ? (
                <p className="text-center text-muted text-sm py-10">
                  {teams.length === 0
                    ? 'El admin debe sincronizar los partidos primero'
                    : 'Sin resultados'}
                </p>
              ) : (
                filteredTeams.map((team) => (
                  <button
                    key={team.name}
                    onClick={() => handlePick(team)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card transition-colors text-left border-b border-border/40 last:border-0 disabled:opacity-40"
                  >
                    {team.crest ? (
                      <img
                        src={team.crest}
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-border flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{team.name}</p>
                      {team.shortName && team.shortName !== team.name && (
                        <p className="text-xs text-muted">{team.shortName}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
