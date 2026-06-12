import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', icon: '🏠', label: 'Inicio' },
  { to: '/partidos', icon: '📅', label: 'Partidos' },
  { to: '/predecir', icon: '🎯', label: 'Predecir' },
  { to: '/tabla', icon: '🏆', label: 'Tabla' },
  { to: '/salas', icon: '👥', label: 'Salas' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border flex safe-pb">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${isActive ? 'text-gold' : 'text-muted'}`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
