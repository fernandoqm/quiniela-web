import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { subscribeToChampionPicks, subscribeToLeaderboard } from '../lib/firestore'
import ChampionCard from '../components/champion/ChampionCard'
import Spinner from '../components/ui/Spinner'

export default function Champions({ user }) {
  const { currentRoomId } = useAppStore()
  const [picks, setPicks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Cargar predicciones de campeón
  useEffect(() => {
    if (!currentRoomId) return
    setLoading(true)
    const unsubscribe = subscribeToChampionPicks(currentRoomId, (picks) => {
      setPicks(picks)
      setLoading(false)
    })
    return unsubscribe
  }, [currentRoomId])

  // Cargar miembros de la sala
  useEffect(() => {
    if (!currentRoomId) return
    const unsubscribe = subscribeToLeaderboard(currentRoomId, setMembers)
    return unsubscribe
  }, [currentRoomId])

  // Enriquecer picks con alias y ordenar
  const enrichedPicks = picks.map((pick) => {
    const member = members.find((m) => m.uid === pick.userId)
    return {
      ...pick,
      alias: member?.alias || pick.userId.slice(0, 6),
      position: members.findIndex((m) => m.uid === pick.userId),
      isCurrentUser: pick.userId === user?.uid,
    }
  })

  // Ordenar por posición (los que tienen posición válida van primero)
  enrichedPicks.sort((a, b) => {
    const aPos = a.position >= 0 ? a.position : Infinity
    const bPos = b.position >= 0 ? b.position : Infinity
    return aPos - bPos
  })

  if (!currentRoomId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted text-sm">Selecciona una sala para ver los campeones</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (picks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted text-sm">Aún no hay predicciones de campeón en esta sala</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-gold mb-4">Predicciones de Campeón</h2>
        <p className="text-xs text-muted mb-4">
          {picks.length} {picks.length === 1 ? 'predicción' : 'predicciones'} registradas
        </p>
      </div>

      {/* Galería de campeones */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {enrichedPicks.map((pick, idx) => (
          <ChampionCard
            key={pick.userId}
            pick={pick}
            position={idx}
            isCurrentUser={pick.isCurrentUser}
          />
        ))}
      </div>
    </div>
  )
}
