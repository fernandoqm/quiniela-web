const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION_ID = '2000' // FIFA World Cup
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY

const headers = { 'X-Auth-Token': API_KEY }

export async function fetchAllMatches() {
  const res = await fetch(`${BASE_URL}/competitions/${COMPETITION_ID}/matches`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.matches.map(mapApiMatch)
}

export async function fetchLiveMatches() {
  const res = await fetch(`${BASE_URL}/competitions/${COMPETITION_ID}/matches?status=IN_PLAY,PAUSED`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.matches.map(mapApiMatch)
}

export async function fetchMatchById(apiId) {
  const res = await fetch(`${BASE_URL}/matches/${apiId}`, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return mapApiMatch(data)
}

export function mapApiMatch(m) {
  return {
    apiId: m.id,
    homeTeam: {
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName || m.homeTeam.tla || m.homeTeam.name,
      tla: m.homeTeam.tla || '',
      crest: m.homeTeam.crest || '',
    },
    awayTeam: {
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName || m.awayTeam.tla || m.awayTeam.name,
      tla: m.awayTeam.tla || '',
      crest: m.awayTeam.crest || '',
    },
    kickoff: new Date(m.utcDate),
    status: m.status,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    htHomeScore: m.score?.halfTime?.home ?? null,
    htAwayScore: m.score?.halfTime?.away ?? null,
    group: m.group || '',
    stage: m.stage || '',
  }
}

export function isMatchWindow(kickoff) {
  const now = Date.now()
  const start = new Date(kickoff).getTime()
  const end = start + 2.5 * 60 * 60 * 1000
  return now >= start && now <= end
}
