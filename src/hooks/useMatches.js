import { useState, useEffect, useCallback } from 'react'
import { subscribeToMatches, saveMatches, saveMatch, shouldRefresh, markRefreshed, shouldRefreshLive, markLiveRefreshed } from '../lib/firestore'
import { fetchAllMatches, fetchLiveMatches, fetchMatchById, isMatchWindow } from '../lib/footballApi'

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
    if (!(await shouldRefresh())) return
    const apiMatches = await fetchAllMatches()
    await saveMatches(apiMatches)
    await markRefreshed()
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

  // Refresh compartido entre todos los usuarios via Firestore TTL (90s)
  const refreshLiveShared = useCallback(async (apiId) => {
    if (!apiId) return
    try {
      if (!(await shouldRefreshLive())) return
      await markLiveRefreshed()
      const updated = await fetchMatchById(apiId)
      await saveMatch(updated)
    } catch (e) {
      console.error('Error actualizando partido en vivo:', e)
    }
  }, [])

  // Fuerza actualización ignorando TTL y cache (para cuando el partido acaba de comenzar)
  const forceRefreshMatch = useCallback(async (apiId) => {
    if (!apiId) return
    const updated = await fetchMatchById(apiId, true)
    await saveMatch(updated)
    await markLiveRefreshed()
  }, [])

  const liveMatches = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const liveMatch = liveMatches[0] || null
  const upcomingMatches = matches.filter((m) => m.status === 'TIMED')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')
  const nextMatch = upcomingMatches[0] || null

  // Trae todos los partidos EN VIVO/PAUSED desde la API con cache-bust y los guarda
  const refreshLiveAll = useCallback(async () => {
    try {
      const live = await fetchLiveMatches()
      if (live.length > 0) await saveMatches(live)
    } catch (e) {
      console.error('Error actualizando partidos en vivo:', e)
    }
  }, [])

  return { matches, loading, liveMatches, liveMatch, nextMatch, upcomingMatches, finishedMatches, refreshAll, refreshLiveMatch, refreshLiveShared, forceRefreshMatch, refreshLiveAll }
}
