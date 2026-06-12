import { useState, useEffect } from 'react'
import { getRoomsByUser, createRoom, joinRoom } from '../lib/firestore'
import useAppStore from '../store/useAppStore'

export function useRoom(user) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentRoomId, setCurrentRoom, setRooms: storeSetRooms } = useAppStore()

  const loadRooms = async () => {
    if (!user) return
    setLoading(true)
    const data = await getRoomsByUser(user.uid)
    setRooms(data)
    storeSetRooms(data)
    if (!currentRoomId && data.length > 0) setCurrentRoom(data[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadRooms()
  }, [user])

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0] || null

  const handleCreate = async (name, alias) => {
    const { id } = await createRoom(name, user.uid, alias)
    await loadRooms()
    setCurrentRoom(id)
    return id
  }

  const handleJoin = async (code, alias) => {
    const id = await joinRoom(code, user.uid, alias)
    await loadRooms()
    setCurrentRoom(id)
    return id
  }

  return { rooms, loading, currentRoom, handleCreate, handleJoin, reload: loadRooms }
}
