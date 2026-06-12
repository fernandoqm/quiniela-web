const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = '2000' // FIFA World Cup
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const PROXY = 'https://corsproxy.io/?url='

function buildUrl(path) {
  const url = `${API_BASE}${path}`
  return import.meta.env.DEV ? url : `${PROXY}${encodeURIComponent(url)}`
}

async function apiFetch(path) {
  const url = buildUrl(path)
  const res = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchAllMatches() {
  const data = await apiFetch(`/competitions/${COMPETITION_ID}/matches`)
  return data.matches.map(mapApiMatch)
}

export async function fetchLiveMatches() {
  const data = await apiFetch(`/competitions/${COMPETITION_ID}/matches?status=IN_PLAY,PAUSED`)
  return data.matches.map(mapApiMatch)
}

export async function fetchMatchById(apiId) {
  const data = await apiFetch(`/matches/${apiId}`)
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
    homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null,
    htHomeScore: m.score?.halfTime?.home ?? null,
    htAwayScore: m.score?.halfTime?.away ?? null,
    group: m.group || '',
    stage: m.stage || '',
    minute: m.minute ?? null,
  }
}

export function isMatchWindow(kickoff) {
  const now = Date.now()
  const start = new Date(kickoff).getTime()
  const end = start + 2.5 * 60 * 60 * 1000
  return now >= start && now <= end
}
