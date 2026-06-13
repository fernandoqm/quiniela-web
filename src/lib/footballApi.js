const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = '2000' // FIFA World Cup
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const PROXY = 'https://corsproxy.io/?url='

function buildUrl(path, bustCache = false) {
  const sep = path.includes('?') ? '&' : '?'
  // En producción, el API key va en la URL para evitar que el proxy bloquee el header
  const keyParam = `${sep}api_token=${API_KEY}${bustCache ? `&_t=${Date.now()}` : ''}`
  const url = `${API_BASE}${path}${keyParam}`
  return import.meta.env.DEV ? url : `${PROXY}${encodeURIComponent(url)}`
}

async function apiFetch(path, bustCache = false) {
  const url = buildUrl(path, bustCache)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status} en ${path}`)
  return res.json()
}

export async function fetchAllMatches() {
  const data = await apiFetch(`/competitions/${COMPETITION_ID}/matches`)
  return data.matches.map(mapApiMatch)
}

export async function fetchLiveMatches() {
  const data = await apiFetch(`/competitions/${COMPETITION_ID}/matches?status=IN_PLAY,PAUSED`, true)
  return data.matches.map(mapApiMatch)
}

export async function fetchMatchById(apiId, bustCache = false) {
  const data = await apiFetch(`/matches/${apiId}`, bustCache)
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
