import { useState } from 'react'
import useAppStore from '../../store/useAppStore'

export default function TopBar({ rooms, user }) {
  const { currentRoomId, setCurrentRoom } = useAppStore()
  const [open, setOpen] = useState(false)
  const currentRoom = rooms.find((r) => r.id === currentRoomId)

  return (
    <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
      <span className="text-gold font-bold text-base">⚽ Quiniela</span>

      <div className="relative">
        {currentRoom ? (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-xs text-subtle"
          >
            {currentRoom.name}
            <span className="text-muted">▾</span>
          </button>
        ) : (
          <span className="text-xs text-muted">Sin sala</span>
        )}

        {open && rooms.length > 0 && (
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl overflow-hidden z-20 min-w-40">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => { setCurrentRoom(r.id); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 ${r.id === currentRoomId ? 'text-gold' : 'text-white'}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {user?.photoURL ? (
        <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-bg font-bold text-xs">
          {user?.displayName?.[0] || '?'}
        </div>
      )}
    </div>
  )
}
