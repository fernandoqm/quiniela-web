import useAppStore from '../../store/useAppStore'

export default function RoomCard({ room, isActive }) {
  const setCurrentRoom = useAppStore((s) => s.setCurrentRoom)

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
  }

  return (
    <div
      onClick={() => setCurrentRoom(room.id)}
      className={`bg-card border rounded-xl p-4 flex items-center justify-between cursor-pointer active:opacity-70 ${isActive ? 'border-gold' : 'border-border'}`}
    >
      <div>
        <p className="font-semibold text-sm">{room.name}</p>
        <p className="text-xs text-muted mt-0.5">{room.memberCount || 1} miembros</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); copyCode() }}
        className="text-xs text-gold bg-gold/10 px-3 py-1.5 rounded-lg font-mono"
      >
        {room.code}
      </button>
    </div>
  )
}
