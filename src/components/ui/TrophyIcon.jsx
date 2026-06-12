export default function TrophyIcon({ className = '', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cup body */}
      <path
        d="M14 6h36v20c0 12-8 22-18 24C22 48 14 38 14 26V6z"
        fill="url(#cupGrad)"
      />
      {/* Left handle */}
      <path
        d="M14 10H6a6 6 0 0 0 0 12h8"
        stroke="url(#handleGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M50 10h8a6 6 0 0 1 0 12h-8"
        stroke="url(#handleGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stem */}
      <rect x="28" y="50" width="8" height="10" rx="1" fill="url(#stemGrad)" />
      {/* Base */}
      <rect x="18" y="60" width="28" height="6" rx="3" fill="url(#baseGrad)" />
      {/* Shine */}
      <path
        d="M22 12c2-3 6-5 10-5"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="cupGrad" x1="14" y1="6" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="handleGrad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="28" y1="50" x2="36" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="baseGrad" x1="18" y1="60" x2="46" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
    </svg>
  )
}
