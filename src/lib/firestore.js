import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, getDocs,
  onSnapshot, serverTimestamp, increment, writeBatch, arrayUnion, runTransaction
} from 'firebase/firestore'
import { db } from './firebase'

// ── Users ──────────────────────────────────────────────────────────────
export async function upsertUser(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      rooms: [],
      createdAt: serverTimestamp(),
    })
  }
}

// ── Rooms ──────────────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]
  code += '-'
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createRoom(name, userId, alias) {
  const code = generateCode()
  const roomRef = await addDoc(collection(db, 'rooms'), {
    name,
    code,
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberCount: 1,
  })
  await setDoc(doc(db, 'rooms', roomRef.id, 'members', userId), {
    uid: userId,
    alias,
    joinedAt: serverTimestamp(),
    totalPoints: 0,
  })
  await setDoc(doc(db, 'users', userId), { rooms: arrayUnion(roomRef.id) }, { merge: true })
  return { id: roomRef.id, code }
}

export async function joinRoom(code, userId, alias) {
  const q = query(collection(db, 'rooms'), where('code', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Sala no encontrada')
  const roomDoc = snap.docs[0]
  const roomId = roomDoc.id
  const memberRef = doc(db, 'rooms', roomId, 'members', userId)
  const memberSnap = await getDoc(memberRef)

  if (memberSnap.exists()) {
    // Ya es miembro — solo sincronizar el roomId en su lista por si quedó desincronizado
    await setDoc(doc(db, 'users', userId), { rooms: arrayUnion(roomId) }, { merge: true })
    return roomId
  }

  // Verificar alias duplicado (case-insensitive)
  const membersSnap = await getDocs(collection(db, 'rooms', roomId, 'members'))
  const aliasLower = alias.trim().toLowerCase()
  const aliasTaken = membersSnap.docs.some((d) => d.data().alias?.toLowerCase() === aliasLower)
  if (aliasTaken) throw new Error('Ese alias ya está en uso en esta sala, elige otro')

  await setDoc(memberRef, {
    uid: userId,
    alias,
    joinedAt: serverTimestamp(),
    totalPoints: 0,
  })
  await updateDoc(doc(db, 'rooms', roomId), { memberCount: increment(1) })
  await setDoc(doc(db, 'users', userId), { rooms: arrayUnion(roomId) }, { merge: true })
  return roomId
}

async function getUserRooms(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? snap.data().rooms || [] : []
}

export async function updateMemberAlias(roomId, userId, newAlias) {
  await updateDoc(doc(db, 'rooms', roomId, 'members', userId), { alias: newAlias })
}

export async function deleteRoom(roomId, userId) {
  const membersSnap = await getDocs(collection(db, 'rooms', roomId, 'members'))
  const batch = writeBatch(db)
  membersSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'rooms', roomId))
  await batch.commit()
  const userSnap = await getDoc(doc(db, 'users', userId))
  if (userSnap.exists()) {
    const remaining = (userSnap.data().rooms || []).filter((id) => id !== roomId)
    await updateDoc(doc(db, 'users', userId), { rooms: remaining })
  }
}

export async function getRoomsByUser(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return []
  const roomIds = snap.data().rooms || []
  const rooms = await Promise.all(
    roomIds.map(async (id) => {
      const [r, m] = await Promise.all([
        getDoc(doc(db, 'rooms', id)),
        getDoc(doc(db, 'rooms', id, 'members', userId)),
      ])
      if (!r.exists()) return null
      return {
        id: r.id,
        ...r.data(),
        myAlias: m.exists() ? m.data().alias : '',
        myPoints: m.exists() ? (m.data().totalPoints ?? 0) : 0,
      }
    })
  )
  return rooms.filter(Boolean)
}

export function subscribeToLeaderboard(roomId, callback) {
  const q = query(
    collection(db, 'rooms', roomId, 'members'),
    orderBy('totalPoints', 'desc')
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
  )
}

// ── Meta / TTL ─────────────────────────────────────────────────────────
const TTL_MS = 3 * 60 * 1000 // 3 minutos

export async function shouldRefresh() {
  const snap = await getDoc(doc(db, 'meta', 'state'))
  if (!snap.exists()) return true
  const last = snap.data().lastRefreshed?.toDate?.() || new Date(0)
  return Date.now() - last.getTime() > TTL_MS
}

export async function markRefreshed() {
  await setDoc(doc(db, 'meta', 'state'), { lastRefreshed: serverTimestamp() }, { merge: true })
}

export async function resetTTL() {
  await setDoc(doc(db, 'meta', 'state'), { lastRefreshed: new Date(0) }, { merge: true })
}

const LIVE_TTL_MS = 90 * 1000 // 90 segundos para partido en vivo

export async function shouldRefreshLive() {
  const snap = await getDoc(doc(db, 'meta', 'state'))
  if (!snap.exists()) return true
  const last = snap.data().liveLastRefreshed?.toDate?.() || new Date(0)
  return Date.now() - last.getTime() > LIVE_TTL_MS
}

export async function markLiveRefreshed() {
  await setDoc(doc(db, 'meta', 'state'), { liveLastRefreshed: serverTimestamp() }, { merge: true })
}

// ── Matches ────────────────────────────────────────────────────────────
export async function saveMatch(match) {
  const id = String(match.apiId)
  await setDoc(doc(db, 'matches', id), {
    ...match,
    kickoff: match.kickoff,
    lastUpdated: serverTimestamp(),
  }, { merge: true })
}

export async function saveMatches(matches) {
  const batch = writeBatch(db)
  matches.forEach((m) => {
    batch.set(doc(db, 'matches', String(m.apiId)), {
      ...m,
      kickoff: m.kickoff,
      lastUpdated: serverTimestamp(),
    }, { merge: true })
  })
  await batch.commit()
}

export function subscribeToMatches(callback) {
  return onSnapshot(collection(db, 'matches'), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function getMatch(matchId) {
  const snap = await getDoc(doc(db, 'matches', String(matchId)))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── Predictions ────────────────────────────────────────────────────────
function predId(roomId, userId, matchId) {
  return `${roomId}_${userId}_${matchId}`
}

export async function savePrediction(roomId, userId, matchId, homeScore, awayScore, winnerPrediction = null) {
  const id = predId(roomId, userId, matchId)
  await setDoc(doc(db, 'predictions', id), {
    userId,
    roomId,
    matchId: String(matchId),
    homeScore,
    awayScore,
    winnerPrediction,
    points: null,
    submittedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'rooms', roomId, 'members', userId), {
    predictedMatches: arrayUnion(String(matchId)),
  })
}

export function subscribeToUserStats(roomId, userId, callback) {
  const q = query(
    collection(db, 'predictions'),
    where('userId', '==', userId),
    where('roomId', '==', roomId)
  )
  return onSnapshot(q, (snap) => {
    const preds = snap.docs.map((d) => d.data())
    callback({
      total: preds.length,
      points: preds.reduce((s, p) => s + (p.points || 0), 0),
      exactos: preds.filter((p) => p.points === 3).length,
      aciertos: preds.filter((p) => p.points >= 1).length,
    })
  })
}

export function subscribeToMyPrediction(roomId, matchId, userId, callback) {
  const q = query(
    collection(db, 'predictions'),
    where('roomId', '==', roomId),
    where('matchId', '==', String(matchId)),
    where('userId', '==', userId)
  )
  return onSnapshot(q, (snap) => {
    const doc = snap.docs[0]
    callback(doc ? { id: doc.id, ...doc.data() } : null)
  })
}

export async function getPredictions(roomId, matchId) {
  const q = query(
    collection(db, 'predictions'),
    where('roomId', '==', roomId),
    where('matchId', '==', String(matchId))
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeToPredictions(roomId, matchId, callback) {
  const q = query(
    collection(db, 'predictions'),
    where('roomId', '==', roomId),
    where('matchId', '==', String(matchId))
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function getPredictionsByRoom(roomId) {
  const q = query(collection(db, 'predictions'), where('roomId', '==', roomId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ── Players ────────────────────────────────────────────────────────
export async function savePlayers(teams) {
  const players = []
  teams.forEach((team) => {
    ;(team.squad || []).forEach((p) => {
      players.push({
        id: p.id,
        name: p.name,
        position: p.position || '',
        shirtNumber: p.shirtNumber ?? null,
        nationality: p.nationality || '',
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.shortName,
        teamTla: team.tla,
        teamCrest: team.crest,
      })
    })
  })
  await setDoc(doc(db, 'meta', 'players'), {
    players,
    syncedAt: serverTimestamp(),
    teamsCount: teams.length,
  })
  return players.length
}

export async function getPlayersDoc() {
  const snap = await getDoc(doc(db, 'meta', 'players'))
  return snap.exists() ? snap.data() : null
}

export async function getLast32TeamTlas() {
  const q = query(collection(db, 'matches'), where('stage', 'in', ['LAST_32', 'ROUND_OF_32']))
  const snap = await getDocs(q)
  const tlas = new Set()
  snap.docs.forEach((d) => {
    const m = d.data()
    if (m.homeTeam?.tla) tlas.add(m.homeTeam.tla)
    if (m.awayTeam?.tla) tlas.add(m.awayTeam.tla)
  })
  return tlas
}

// ── Award Results (admin sets actual winners) ──────────────────────
export async function saveAwardResults(results) {
  await setDoc(doc(db, 'meta', 'award_results'), {
    ...results,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getAwardResults() {
  const snap = await getDoc(doc(db, 'meta', 'award_results'))
  return snap.exists() ? snap.data() : {}
}

export async function calculateAwardPoints(awardResults) {
  const AWARD_KEYS = ['topScorer', 'goldenBall', 'goldenGlove']
  const snap = await getDocs(collection(db, 'award_picks'))
  const batch = writeBatch(db)
  let totalPoints = 0
  let usersRewarded = 0

  snap.docs.forEach((d) => {
    const pick = d.data()
    const alreadyScored = pick.scoredAwards || []
    const pending = AWARD_KEYS.filter((k) => awardResults[k] && !alreadyScored.includes(k))
    if (pending.length === 0) return

    let pts = 0
    pending.forEach((k) => {
      if (pick[k]?.id === awardResults[k]?.id) pts += 100
    })

    batch.update(d.ref, { scoredAwards: arrayUnion(...pending) })
    if (pts > 0) {
      batch.update(doc(db, 'rooms', pick.roomId, 'members', pick.userId), {
        totalPoints: increment(pts),
      })
      totalPoints += pts
      usersRewarded++
    }
  })

  await batch.commit()
  return { totalPoints, usersRewarded }
}

// ── Award Picks ────────────────────────────────────────────────────
export async function saveAwardPicks(roomId, userId, picks) {
  await setDoc(
    doc(db, 'award_picks', `${roomId}_${userId}`),
    { userId, roomId, ...picks, submittedAt: serverTimestamp() },
    { merge: true }
  )
}

export function subscribeToAwardPicks(roomId, callback) {
  const q = query(collection(db, 'award_picks'), where('roomId', '==', roomId))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// ── Champion Picks ─────────────────────────────────────────────────────
export async function saveChampionPick(roomId, userId, team) {
  await setDoc(doc(db, 'champion_picks', `${roomId}_${userId}`), {
    userId,
    roomId,
    team,
    submittedAt: serverTimestamp(),
  })
}

export function subscribeToChampionPicks(roomId, callback) {
  const q = query(collection(db, 'champion_picks'), where('roomId', '==', roomId))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function adminSetMemberTotal(roomId, userId, totalPoints) {
  await updateDoc(doc(db, 'rooms', roomId, 'members', userId), { totalPoints })
}

export async function adminFixPoints(roomId, userId, matchId, newPoints) {
  const predRef = doc(db, 'predictions', predId(roomId, userId, matchId))
  const memberRef = doc(db, 'rooms', roomId, 'members', userId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(predRef)
    const oldPoints = snap.exists() ? (snap.data().points || 0) : 0
    const delta = newPoints - oldPoints
    tx.update(predRef, { points: newPoints })
    if (delta !== 0) tx.update(memberRef, { totalPoints: increment(delta) })
  })
}

export async function updatePredictionPoints(roomId, userId, matchId, points) {
  const predRef = doc(db, 'predictions', predId(roomId, userId, matchId))
  const memberRef = doc(db, 'rooms', roomId, 'members', userId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(predRef)
    if (snap.exists() && snap.data().points !== null) return
    tx.update(predRef, { points })
    tx.update(memberRef, { totalPoints: increment(points) })
  })
}
