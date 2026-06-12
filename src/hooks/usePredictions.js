import { useState, useEffect } from 'react'
import { subscribeToPredictions, savePrediction, updatePredictionPoints } from '../lib/firestore'
import { calculatePoints } from '../lib/scoring'

export function usePredictions(roomId, matchId) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || !matchId) { setLoading(false); return }
    const unsub = subscribeToPredictions(roomId, matchId, (data) => {
      setPredictions(data)
      setLoading(false)
    })
    return unsub
  }, [roomId, matchId])

  const submitPrediction = async (userId, homeScore, awayScore) => {
    await savePrediction(roomId, userId, matchId, homeScore, awayScore)
  }

  const calculateAndSave = async (match) => {
    if (!match || match.homeScore === null) return
    for (const pred of predictions) {
      if (pred.points !== null) continue
      const pts = calculatePoints(pred, match)
      if (pts !== null) {
        await updatePredictionPoints(roomId, pred.userId, matchId, pts)
      }
    }
  }

  return { predictions, loading, submitPrediction, calculateAndSave }
}
