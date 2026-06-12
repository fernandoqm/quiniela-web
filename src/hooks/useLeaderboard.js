import { useState, useEffect } from 'react'
import { subscribeToLeaderboard } from '../lib/firestore'

export function useLeaderboard(roomId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) { setLoading(false); return }
    const unsub = subscribeToLeaderboard(roomId, (data) => {
      setMembers(data)
      setLoading(false)
    })
    return unsub
  }, [roomId])

  return { members, loading }
}
