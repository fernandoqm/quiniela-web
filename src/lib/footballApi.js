const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = '2000' // FIFA World Cup
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const PROXY = 'https://corsproxy.io/?url='

function buildUrl(path, bustCache = false) {
  const sep = path.includes('?') ? '&' : '?'
  const cacheBust = bustCache ? `${sep}_t=${Date.now()}` : ''
  const url = `${API_BASE}${path}${cacheBust}`
  return import.meta.env.DEV ? url : `${PROXY}${encodeURIComponent(url)}`
}

async function apiFetch(path, bustCache = false) {
  const url = buildUrl(path, bustCache)
  const res = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } })
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
    // Para fase de grupos regularTime === fullTime. En eliminatoria usamos
    // regularTime (90') para comparar predicciones; fullTime incluye la prórroga.
    homeScore: m.score?.regularTime?.home ?? m.score?.fullTime?.home ?? null,
    awayScore: m.score?.regularTime?.away ?? m.score?.fullTime?.away ?? null,
    htHomeScore: m.score?.halfTime?.home ?? null,
    htAwayScore: m.score?.halfTime?.away ?? null,
    winner: m.score?.winner ?? null,       // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW'
    duration: m.score?.duration ?? 'REGULAR', // 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    group: m.group || '',
    stage: m.stage || '',
    minute: m.minute ?? null,
  }
}

export async function fetchTeamsWithSquads() {
  const data = await apiFetch(`/competitions/${COMPETITION_ID}/teams`)
  return (data.teams || []).map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName || team.name,
    tla: team.tla || '',
    crest: team.crest || '',
    squad: (team.squad || []).map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position || '',
      shirtNumber: p.shirtNumber ?? null,
      nationality: p.nationality || '',
    })),
  }))
}

export function isMatchWindow(kickoff) {
  const now = Date.now()
  const start = new Date(kickoff).getTime()
  const end = start + 2.5 * 60 * 60 * 1000
  return now >= start && now <= end
}
