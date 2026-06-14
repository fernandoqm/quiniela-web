import { useState, useEffect } from 'react'
import { useMatches } from '../hooks/useMatches'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { getPredictions, adminFixPoints, adminSetMemberTotal } from '../lib/firestore'
import { calculatePoints } from '../lib/scoring'
import Spinner from '../components/ui/Spinner'

const ADMIN_KEY = '0pt1m7sPr1m3'

function toDate(val) {
  return val?.toDate ? val.toDate() : new Date(val)
}

function formatMatch(m) {
  return `${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
}

function formatDate(kickoff) {
  return toDate(kickoff).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function pointsLabel(pts) {
  if (pts === 3) return '💎 +3 exacto'
  if (pts === 2) return '✓ +2 empate'
  if (pts === 1) return '✓ +1 resultado'
  if (pts === 0) return '+0'
  return '—'
}

function pointsColor(pts) {
  if (pts === 3) return 'text-yellow-400'
  if (pts === 2) return 'text-green-400'
  if (pts === 1) return 'text-blue-400'
  return 'text-gray-500'
}

function AdminLogin({ onSuccess }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === ADMIN_KEY) {
      sessionStorage.setItem('admin_auth', '1')
      onSuccess()
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center pt-24 gap-4 px-6">
      <p className="text-2xl">🔒</p>
      <p className="text-sm font-semibold">Panel de administración</p>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 max-w-xs">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Clave de acceso"
          autoFocus
          className={`w-full bg-card border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none transition-colors ${
            error ? 'border-danger' : 'border-border focus:border-gold'
          }`}
        />
        {error && <p className="text-danger text-xs text-center">Clave incorrecta</p>}
        <button
          type="submit"
          className="w-full bg-gold text-bg font-bold py-3 rounded-xl text-sm"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}

export default function Admin({ user, rooms }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1')

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  const [roomId, setRoomId] = useState(rooms?.[0]?.id || '')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [editedPoints, setEditedPoints] = useState({})
  const [loadingPreds, setLoadingPreds] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [memberEdits, setMemberEdits] = useState({})
  const [savingMember, setSavingMember] = useState(null)

  const { finishedMatches, loading } = useMatches()
  const { members } = useLeaderboard(roomId)

  const TORNEO_START = new Date('2026-06-11').getTime()
  const tournamentMatches = finishedMatches.filter(
    (m) => toDate(m.kickoff).getTime() >= TORNEO_START
  ).reverse()

  useEffect(() => {
    if (!roomId || !selectedMatch) return
    setLoadingPreds(true)
    getPredictions(roomId, selectedMatch.id).then((data) => {
      setPredictions(data)
      setEditedPoints({})
      setLoadingPreds(false)
    })
  }, [roomId, selectedMatch?.id])

  const getAlias = (uid) => members.find((m) => m.uid === uid)?.alias || uid.slice(0, 6)

  const handleRecalculate = async () => {
    if (!selectedMatch || predictions.length === 0) return
    setSaving(true)
    setMessage('')
    let changed = 0
    for (const pred of predictions) {
      const correct = calculatePoints(pred, selectedMatch)
      if (correct !== null && correct !== pred.points) {
        await adminFixPoints(roomId, pred.userId, selectedMatch.id, correct)
        changed++
      }
    }
    const updated = await getPredictions(roomId, selectedMatch.id)
    setPredictions(updated)
    setEditedPoints({})
    setSaving(false)
    setMessage(changed > 0 ? `${changed} predicción(es) corregidas` : 'Todo estaba correcto')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveOne = async (pred) => {
    const newPts = editedPoints[pred.userId]
    if (newPts === undefined || newPts === pred.points) return
    setSaving(true)
    await adminFixPoints(roomId, pred.userId, selectedMatch.id, newPts)
    const updated = await getPredictions(roomId, selectedMatch.id)
    setPredictions(updated)
    setEditedPoints((prev) => { const n = { ...prev }; delete n[pred.userId]; return n })
    setSaving(false)
    setMessage('Guardado')
    setTimeout(() => setMessage(''), 2000)
  }

  if (loading) return <Spinner className="pt-20" />

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-2 text-center">
        <span className="text-danger text-xs font-bold uppercase tracking-widest">Panel de administración</span>
      </div>

      {/* Selector de sala */}
      {rooms?.length > 1 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Sala</p>
          <select
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); setSelectedMatch(null) }}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-white"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabla de puntos editable */}
      {members.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Puntos por jugador</p>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {[...members].sort((a, b) => b.totalPoints - a.totalPoints).map((m) => {
              const editing = memberEdits[m.uid] !== undefined
              const val = editing ? memberEdits[m.uid] : m.totalPoints

              const handleSaveMember = async () => {
                setSavingMember(m.uid)
                await adminSetMemberTotal(roomId, m.uid, Number(memberEdits[m.uid]))
                setMemberEdits((prev) => { const n = { ...prev }; delete n[m.uid]; return n })
                setSavingMember(null)
              }

              return (
                <div key={m.uid} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-semibold flex-1">{m.alias}</span>
                  <input
                    type="number"
                    min="0"
                    value={val}
                    onChange={(e) => setMemberEdits((prev) => ({ ...prev, [m.uid]: e.target.value }))}
                    className="w-16 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none focus:border-gold"
                  />
                  <span className="text-xs text-muted">pts</span>
                  {editing && (
                    <button
                      onClick={handleSaveMember}
                      disabled={savingMember === m.uid}
                      className="text-xs bg-gold text-bg font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
                    >
                      {savingMember === m.uid ? '...' : 'Guardar'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de partidos finalizados */}
      <div>
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Partidos finalizados</p>
        <div className="flex flex-col gap-2">
          {tournamentMatches.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatch(selectedMatch?.id === m.id ? null : m)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selectedMatch?.id === m.id
                  ? 'bg-gold/10 border-gold/40'
                  : 'bg-card border-border hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{formatMatch(m)}</p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(m.kickoff)}</p>
                </div>
                <span className="text-sm font-black text-white">
                  {m.homeScore} – {m.awayScore}
                </span>
              </div>
            </button>
          ))}
          {tournamentMatches.length === 0 && (
            <p className="text-subtle text-sm text-center py-8">No hay partidos finalizados</p>
          )}
        </div>
      </div>

      {/* Panel del partido seleccionado */}
      {selectedMatch && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-sm">{formatMatch(selectedMatch)}</p>
              <p className="text-xs text-muted">
                Resultado final: {selectedMatch.homeScore} – {selectedMatch.awayScore}
              </p>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={saving || loadingPreds}
              className="text-xs bg-gold text-bg font-bold px-3 py-2 rounded-lg disabled:opacity-40 shrink-0"
            >
              {saving ? 'Guardando...' : 'Recalcular todo'}
            </button>
          </div>

          {message && (
            <div className="px-4 py-2 bg-win/10 border-b border-win/20 text-center">
              <span className="text-win text-xs font-semibold">{message}</span>
            </div>
          )}

          {loadingPreds ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : predictions.length === 0 ? (
            <p className="text-subtle text-sm text-center py-8">Sin predicciones en esta sala</p>
          ) : (
            <div className="divide-y divide-border">
              {predictions.map((pred) => {
                const correct = calculatePoints(pred, selectedMatch)
                const stored = pred.points
                const isWrong = correct !== null && correct !== stored
                const editing = editedPoints[pred.userId] !== undefined
                const currentEdit = editing ? editedPoints[pred.userId] : stored

                return (
                  <div key={pred.userId} className={`px-4 py-3 ${isWrong ? 'bg-danger/5' : ''}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-semibold">{getAlias(pred.userId)}</span>
                        <span className="text-xs text-muted ml-2">
                          predijo {pred.homeScore}–{pred.awayScore}
                        </span>
                      </div>
                      {isWrong && (
                        <span className="text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full font-semibold">
                          incorrecto
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-surface rounded-lg px-3 py-1.5">
                          <p className="text-muted mb-0.5">Guardado</p>
                          <p className={`font-bold ${pointsColor(stored)}`}>
                            {stored !== null ? pointsLabel(stored) : '—'}
                          </p>
                        </div>
                        <div className={`rounded-lg px-3 py-1.5 ${isWrong ? 'bg-win/10' : 'bg-surface'}`}>
                          <p className="text-muted mb-0.5">Calculado</p>
                          <p className={`font-bold ${pointsColor(correct)}`}>
                            {correct !== null ? pointsLabel(correct) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Edición manual */}
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted">Manual:</p>
                      {[0, 1, 2, 3].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => setEditedPoints((prev) => ({ ...prev, [pred.userId]: pts }))}
                          className={`text-xs w-8 h-8 rounded-lg font-bold transition-colors ${
                            currentEdit === pts
                              ? 'bg-gold text-bg'
                              : 'bg-surface text-muted hover:text-white'
                          }`}
                        >
                          {pts}
                        </button>
                      ))}
                      {editing && currentEdit !== stored && (
                        <button
                          onClick={() => handleSaveOne(pred)}
                          disabled={saving}
                          className="text-xs bg-win/20 text-win border border-win/30 px-3 py-1.5 rounded-lg font-semibold ml-1 disabled:opacity-40"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
