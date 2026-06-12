import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { updateMemberAlias, deleteRoom } from '../lib/firestore'
import Spinner from '../components/ui/Spinner'

const APP_URL = 'https://fernandoqm.github.io/quiniela-web/'

function validateAlias(alias) {
  const trimmed = alias.trim()
  if (trimmed.length < 2) return 'El alias debe tener al menos 2 caracteres'
  if (trimmed.length > 20) return 'El alias no puede superar 20 caracteres'
  return null
}

async function shareRoom(room) {
  const joinUrl = `${APP_URL}#/salas?code=${room.code}`
  const text = `¡Únete a mi Quiniela del Mundial 2026! 🏆\nSala: ${room.name}\n${joinUrl}`
  if (navigator.share) {
    await navigator.share({ title: 'Quiniela Mundial 2026', text, url: joinUrl })
  } else {
    await navigator.clipboard.writeText(text)
  }
}

function RoomItem({ room, isActive, userId, onSelect, onReload }) {
  const [copied, setCopied] = useState(false)
  const [editingAlias, setEditingAlias] = useState(false)
  const [newAlias, setNewAlias] = useState(room.myAlias || '')
  const [savingAlias, setSavingAlias] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isCreator = room.createdBy === userId

  const handleShare = async (e) => {
    e.stopPropagation()
    await shareRoom(room)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSaveAlias = async (e) => {
    e.stopPropagation()
    if (validateAlias(newAlias)) return
    setSavingAlias(true)
    await updateMemberAlias(room.id, userId, newAlias.trim())
    setSavingAlias(false)
    setEditingAlias(false)
    onReload()
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    setDeleting(true)
    await deleteRoom(room.id, userId)
    onReload()
  }

  return (
    <div className={`rounded-xl border transition-colors ${isActive ? 'border-gold/40 bg-gold/5' : 'border-border bg-card'}`}>
      {/* Info principal */}
      <button onClick={onSelect} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🏠</span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isActive ? 'text-gold' : 'text-white'}`}>
              {room.name}
            </p>
            <p className="text-xs text-muted">
              {room.memberCount || 1} miembro{(room.memberCount || 1) !== 1 ? 's' : ''}
              {room.myPoints > 0 ? ` · ${room.myPoints} pts` : ''}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-xs text-muted">Código:</p>
          <p className="text-sm font-bold font-mono text-subtle">{room.code}</p>
        </div>
      </button>

      {/* Editor de alias */}
      {editingAlias ? (
        <div className="px-3 pb-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            maxLength={20}
            placeholder="Tu nuevo alias..."
            autoFocus
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gold/50"
          />
          <button
            onClick={handleSaveAlias}
            disabled={savingAlias || !newAlias.trim()}
            className="px-3 py-2 bg-gold text-bg rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {savingAlias ? '...' : '✓'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingAlias(false); setNewAlias(room.myAlias || '') }}
            className="px-3 py-2 bg-surface border border-border rounded-xl text-xs text-muted"
          >
            ✕
          </button>
        </div>
      ) : confirmDelete ? (
        <div className="px-3 pb-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <p className="flex-1 text-xs text-danger flex items-center">¿Eliminar sala y todos sus datos?</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 bg-danger/20 text-danger border border-danger/30 rounded-xl text-xs font-bold"
          >
            {deleting ? '...' : 'Eliminar'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
            className="px-3 py-2 bg-surface border border-border rounded-xl text-xs text-muted"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="px-3 pb-3 flex gap-2">
          {/* Compartir */}
          <button
            onClick={handleShare}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              copied ? 'bg-win/15 text-win border border-win/25' : 'bg-surface border border-border text-subtle hover:text-white'
            }`}
          >
            {copied ? '✓ ¡Copiado!' : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Compartir
              </>
            )}
          </button>

          {/* Editar alias */}
          <button
            onClick={(e) => { e.stopPropagation(); setEditingAlias(true) }}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-subtle hover:text-white flex items-center gap-1.5"
            title="Cambiar mi alias"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Alias
          </button>

          {/* Eliminar (solo creador) */}
          {isCreator && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-xs text-danger/60 hover:text-danger"
              title="Eliminar sala"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Rooms({ rooms, onCreate, onJoin, loading, user, reload }) {
  const { currentRoomId, setCurrentRoom } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [code, setCode] = useState('')
  const [joinAlias, setJoinAlias] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  // Pre-llenar código si viene por deep link (?code=ABC-123)
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setCode(codeParam.toUpperCase())
      setSearchParams({}, { replace: true })
    }
  }, [])

  const handleCreate = async () => {
    const aliasErr = validateAlias(alias)
    if (!name.trim()) return setError('Ingresa un nombre para la sala')
    if (aliasErr) return setError(aliasErr)
    setCreating(true); setError('')
    try {
      await onCreate(name.trim(), alias.trim())
      setName(''); setAlias('')
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  const handleJoin = async () => {
    const aliasErr = validateAlias(joinAlias)
    if (aliasErr) return setError(aliasErr)
    if (code.trim().length < 5) return setError('Ingresa el código de la sala')
    setJoining(true); setError('')
    try {
      await onJoin(code.trim(), joinAlias.trim())
      setCode(''); setJoinAlias('')
    } catch (e) { setError(e.message) }
    setJoining(false)
  }

  if (loading) return <Spinner className="pt-20" />

  return (
    <div className="flex flex-col gap-5 pb-4">
      {error && (
        <p className="text-danger text-xs text-center bg-danger/10 border border-danger/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Crear sala */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div>
          <p className="font-bold text-sm flex items-center gap-2">
            <span className="text-gold text-base">+</span> Crear nueva sala
          </p>
          <p className="text-xs text-muted mt-0.5">Ponle nombre y comparte el código</p>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la sala..." maxLength={30}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-gold/50 transition-colors" />
        <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Tu alias en esta sala..." maxLength={20}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-gold/50 transition-colors" />
        <button onClick={handleCreate} disabled={creating}
          className="w-full bg-gold text-bg font-bold py-3.5 rounded-xl text-sm hover:bg-gold/90 active:scale-95 transition-all disabled:opacity-50">
          {creating ? 'Creando...' : 'Crear sala'}
        </button>
      </div>

      {/* Unirse */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div>
          <p className="font-bold text-sm flex items-center gap-2">
            <span className="text-subtle">🔍</span> Unirme a una sala
          </p>
          <p className="text-xs text-muted mt-0.5">Ingresa el código que te compartieron</p>
        </div>
        <input value={joinAlias} onChange={(e) => setJoinAlias(e.target.value)} placeholder="Tu alias o nombre..." maxLength={20}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-gold/50 transition-colors" />
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="A B C – 1 2 X" maxLength={7}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-gold/50 transition-colors font-mono tracking-widest" />
        <button onClick={handleJoin} disabled={joining}
          className="w-full bg-gold text-bg font-bold py-3.5 rounded-xl text-sm hover:bg-gold/90 active:scale-95 transition-all disabled:opacity-50">
          {joining ? 'Uniéndome...' : 'Unirme'}
        </button>
      </div>

      {/* Mis salas */}
      {rooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted uppercase tracking-widest">Mis salas activas</p>
          {rooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={room.id === currentRoomId}
              userId={user?.uid}
              onSelect={() => setCurrentRoom(room.id)}
              onReload={reload}
            />
          ))}
        </div>
      )}

      {rooms.length === 0 && (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">🏟️</p>
          <p className="text-subtle text-sm">Aún no tienes salas</p>
          <p className="text-muted text-xs mt-1">Crea una nueva o únete con un código</p>
        </div>
      )}
    </div>
  )
}
