import { useEffect, useState } from 'react'

export default function Spinner({ className = '', timeout = 10000 }) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), timeout)
    return () => clearTimeout(id)
  }, [timeout])

  if (timedOut) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 py-20 px-6 text-center ${className}`}>
        <p className="text-2xl">⚠️</p>
        <p className="text-subtle text-sm">No se pudo conectar. Revisa tu conexión e intenta de nuevo.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 px-5 py-2.5 bg-card border border-border rounded-xl text-sm text-subtle hover:text-white transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="w-8 h-8 border-2 border-border border-t-gold rounded-full animate-spin" />
    </div>
  )
}
