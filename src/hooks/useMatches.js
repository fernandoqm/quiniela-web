import { useState, useEffect, useCallback } from 'react'
import { subscribeToMatches, saveMatches, saveMatch } from '../lib/firestore'
import { fetchAllMatches, fetchMatchById, isMatchWindow } from '../lib/footballApi'

const CACHE_TTL = 60 * 1000 // 60 seconds

export function useMatches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToMatches((data) => {
      const sorted = data.sort((a, b) => new Date(a.kickoff?.toDate?.() || a.kickoff) - new Date(b.kickoff?.toDate?.() || b.kickoff))
      setMatches(sorted)
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshAll = useCallback(async () => {
    try {
      const apiMatches = await fetchAllMatches()
      await saveMatches(apiMatches)
    } catch (e) {
      console.error('Error cargando partidos:', e)
    }
  }, [])

  const refreshLiveMatch = useCallback(async (match) => {
    if (!match?.apiId) return
    const lastUpdated = match.lastUpdated?.toDate?.() || new Date(0)
    if (Date.now() - lastUpdated.getTime() < CACHE_TTL) return
    try {
      const updated = await fetchMatchById(match.apiId)
      await saveMatch(updated)
    } catch (e) {
      console.error('Error actualizando partido:', e)
    }
  }, [])

  const liveMatch = matches.find((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const upcomingMatches = matches.filter((m) => m.status === 'TIMED')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')
  const nextMatch = upcomingMatches[0] || null

  return { matches, loading, liveMatch, nextMatch, upcomingMatches, finishedMatches, refreshAll, refreshLiveMatch }
}
