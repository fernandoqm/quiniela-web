import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, getDocs,
  onSnapshot, serverTimestamp, increment, writeBatch
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
  await updateDoc(doc(db, 'users', userId), {
    rooms: [...(await getUserRooms(userId)), roomRef.id],
  })
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
  if (memberSnap.exists()) throw new Error('Ya eres miembro de esta sala')
  await setDoc(memberRef, {
    uid: userId,
    alias,
    joinedAt: serverTimestamp(),
    totalPoints: 0,
  })
  await updateDoc(doc(db, 'rooms', roomId), { memberCount: increment(1) })
  const currentRooms = await getUserRooms(userId)
  await updateDoc(doc(db, 'users', userId), { rooms: [...currentRooms, roomId] })
  return roomId
}

async function getUserRooms(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? snap.data().rooms || [] : []
}

export async function getRoomsByUser(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return []
  const roomIds = snap.data().rooms || []
  const rooms = await Promise.all(
    roomIds.map(async (id) => {
      const r = await getDoc(doc(db, 'rooms', id))
      return r.exists() ? { id: r.id, ...r.data() } : null
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

export async function savePrediction(roomId, userId, matchId, homeScore, awayScore) {
  const id = predId(roomId, userId, matchId)
  await setDoc(doc(db, 'predictions', id), {
    userId,
    roomId,
    matchId: String(matchId),
    homeScore,
    awayScore,
    points: null,
    submittedAt: serverTimestamp(),
  })
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

export async function updatePredictionPoints(roomId, userId, matchId, points) {
  const id = predId(roomId, userId, matchId)
  await updateDoc(doc(db, 'predictions', id), { points })
  await updateDoc(doc(db, 'rooms', roomId, 'members', userId), {
    totalPoints: increment(points),
  })
}
