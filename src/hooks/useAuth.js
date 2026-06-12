import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { upsertUser } from '../lib/firestore'

export function useAuth() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        await upsertUser(u)
        setUser(u)
      } else {
        setUser(null)
      }
    })
  }, [])

  const login = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return { user, login, logout, loading: user === undefined }
}
