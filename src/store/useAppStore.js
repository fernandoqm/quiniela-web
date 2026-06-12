import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set) => ({
      currentRoomId: null,
      setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),
      rooms: [],
      setRooms: (rooms) => set({ rooms }),
    }),
    { name: 'quiniela-store' }
  )
)

export default useAppStore
