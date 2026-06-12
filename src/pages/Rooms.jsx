import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import RoomCard from '../components/room/RoomCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

export default function Rooms({ rooms, onCreate, onJoin, loading }) {
  const currentRoomId = useAppStore((s) => s.currentRoomId)
  const [tab, setTab] = useState('list')
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [code, setCode] = useState('')
  const [joinAlias, setJoinAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !alias.trim()) return setError('Completa todos los campos')
    setBusy(true); setError('')
    try {
      await onCreate(name.trim(), alias.trim())
      setName(''); setAlias(''); setTab('list')
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const handleJoin = async () => {
    if (!code.trim() || !joinAlias.trim()) return setError('Completa todos los campos')
    setBusy(true); setError('')
    try {
      await onJoin(code.trim(), joinAlias.trim())
      setCode(''); setJoinAlias(''); setTab('list')
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  if (loading) return <Spinner className="pt-20" />

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Tabs */}
      <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
        {[['list', 'Mis salas'], ['create', 'Crear'], ['join', 'Unirme']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-gold text-bg' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-xs text-center bg-danger/10 border border-danger/20 rounded-xl px-4 py-2">{error}</p>}

      {tab === 'list' && (
        <div className="flex flex-col gap-3">
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🏟️</p>
              <p className="text-subtle text-sm">Aún no tienes salas</p>
              <p className="text-muted text-xs mt-1">Crea una o únete con un código</p>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomCard key={room.id} room={room} isActive={room.id === currentRoomId} />
            ))
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">➕ Nueva sala</p>
          <Input label="Nombre de la sala" value={name} onChange={setName} placeholder="Ej: Familia, Trabajo..." maxLength={30} />
          <Input label="Tu alias en esta sala" value={alias} onChange={setAlias} placeholder="Ej: Fer, El Profe..." maxLength={20} />
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? 'Creando...' : 'Crear sala'}
          </Button>
        </div>
      )}

      {tab === 'join' && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-sm">🔑 Unirme a sala</p>
          <Input label="Tu alias" value={joinAlias} onChange={setJoinAlias} placeholder="Ej: Fer, El Profe..." maxLength={20} />
          <Input label="Código de sala" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="ABC-123" maxLength={7} />
          <Button onClick={handleJoin} disabled={busy}>
            {busy ? 'Uniéndome...' : 'Unirme'}
          </Button>
        </div>
      )}
    </div>
  )
}
