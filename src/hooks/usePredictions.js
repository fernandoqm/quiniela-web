import { useState, useEffect, useCallback } from 'react'
import { subscribeToPredictions, getPredictions, savePrediction, updatePredictionPoints } from '../lib/firestore'
import { calculatePoints } from '../lib/scoring'

export function usePredictions(roomId, matchId, { isFinished = false } = {}) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOnce = useCallback(async () => {
    if (!roomId || !matchId) { setLoading(false); return }
    const data = await getPredictions(roomId, matchId)
    setPredictions(data)
    setLoading(false)
  }, [roomId, matchId])

  useEffect(() => {
    if (!roomId || !matchId) { setLoading(false); return }
    if (isFinished) {
      fetchOnce()
      return
    }
    const unsub = subscribeToPredictions(roomId, matchId, (data) => {
      setPredictions(data)
      setLoading(false)
    })
    return unsub
  }, [roomId, matchId, isFinished])

  const submitPrediction = async (userId, homeScore, awayScore) => {
    await savePrediction(roomId, userId, matchId, homeScore, awayScore)
  }

  const calculateAndSave = async (match, onlyUserId = null) => {
    if (!match || match.homeScore === null) return
    const toScore = onlyUserId
      ? predictions.filter((p) => p.userId === onlyUserId)
      : predictions
    for (const pred of toScore) {
      if (pred.points !== null) continue
      const pts = calculatePoints(pred, match)
      if (pts !== null) {
        await updatePredictionPoints(roomId, pred.userId, matchId, pts)
      }
    }
    if (isFinished) await fetchOnce()
  }

  return { predictions, loading, submitPrediction, calculateAndSave }
}
