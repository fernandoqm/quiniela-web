import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useRoom } from './hooks/useRoom'
import TopBar from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Matches from './pages/Matches'
import Predict from './pages/Predict'
import Results from './pages/Results'
import Rooms from './pages/Rooms'
import Spinner from './components/ui/Spinner'

function AppLayout({ user }) {
  const { rooms, loading, handleCreate, handleJoin } = useRoom(user)

  return (
    <div className="min-h-screen bg-bg text-white">
      <TopBar rooms={rooms} user={user} />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard user={user} rooms={rooms} />} />
          <Route path="/partidos" element={<Matches />} />
          <Route path="/predecir" element={<Predict user={user} />} />
          <Route path="/tabla" element={<Results user={user} />} />
          <Route path="/salas" element={
            <Rooms rooms={rooms} onCreate={handleCreate} onJoin={handleJoin} loading={loading} />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { user, loading, login } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (!user) return <Login onLogin={login} />

  return (
    <HashRouter>
      <AppLayout user={user} />
    </HashRouter>
  )
}
