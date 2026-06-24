import { NavLink } from 'react-router-dom'

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="3" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="21" y2="12"/>
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12v8a6 6 0 0 1-12 0V2z"/>
      <path d="M6 5H2a1 1 0 0 0-1 1v2a5 5 0 0 0 5 5"/>
      <path d="M18 5h4a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5"/>
      <path d="M12 17v4M8 21h8"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  )
}

function BracketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="7" height="5" rx="1"/>
      <rect x="1" y="16" width="7" height="5" rx="1"/>
      <rect x="16" y="9.5" width="7" height="5" rx="1"/>
      <line x1="8" y1="5.5" x2="11" y2="5.5"/>
      <line x1="11" y1="5.5" x2="11" y2="18.5"/>
      <line x1="8" y1="18.5" x2="11" y2="18.5"/>
      <line x1="11" y1="12" x2="16" y2="12"/>
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 19h20l-2-9-5 5-3-8-3 8-5-5-2 9z" />
      <line x1="2" y1="22" x2="22" y2="22" />
    </svg>
  )
}

const tabs = [
  { to: '/', label: 'Inicio', Icon: HomeIcon },
  { to: '/predecir', label: 'Pred.', Icon: TargetIcon },
  { to: '/tabla', label: 'Tabla', Icon: TrophyIcon },
  { to: '/campeones', label: 'Camp.', Icon: CrownIcon },
  { to: '/llave', label: 'Llave', Icon: BracketIcon },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-lg mx-auto flex">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0 py-1.5 transition-colors ${isActive ? 'text-gold' : 'text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <tab.Icon active={isActive} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
      </div>
    </nav>
  )
}
