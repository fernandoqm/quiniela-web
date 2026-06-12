import { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { useLeaderboard } from '../../hooks/useLeaderboard'

export default function TopBar({ rooms, user }) {
  const { currentRoomId, setCurrentRoom } = useAppStore()
  const [open, setOpen] = useState(false)
  const currentRoom = rooms.find((r) => r.id === currentRoomId)
  const { members } = useLeaderboard(currentRoomId)
  const me = members.find((m) => m.uid === user?.uid)

  return (
    <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
      {/* Logo */}
      <div className="flex items-center gap-1.5 shrink-0">
        <img src="/copa_fifa.png" alt="Copa FIFA" className="w-6 h-6 object-contain" />
        <span className="text-gold font-bold text-base tracking-tight">Quiniela</span>
      </div>

      {/* Room selector */}
      <div className="relative flex-1 flex justify-center">
        {currentRoom ? (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 text-xs text-subtle max-w-[160px]"
          >
            <span>🏠</span>
            <span className="truncate">Sala: {currentRoom.name}</span>
            <span className="text-muted shrink-0">▾</span>
          </button>
        ) : (
          <span className="text-xs text-muted">Sin sala activa</span>
        )}

        {open && rooms.length > 0 && (
          <div className="absolute top-full mt-1 bg-card border border-border rounded-xl overflow-hidden z-20 min-w-44 shadow-xl">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => { setCurrentRoom(r.id); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 ${r.id === currentRoomId ? 'text-gold' : 'text-white'}`}
              >
                🏠 {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alias + puntos + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {me?.alias && (
          <span className="text-xs text-subtle font-medium hidden sm:block">{me.alias}</span>
        )}

        {/* Campana con puntos */}
        {me && currentRoomId && (
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-gold text-bg text-[10px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
              {me.totalPoints ?? 0}
            </span>
          </div>
        )}

        {/* Avatar */}
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-7 h-7 rounded-full ring-2 ring-border" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-bg font-bold text-xs">
            {user?.displayName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    </div>
  )
}
