const medals = { 0: '🥇', 1: '🥈', 2: '🥉' }

export default function ChampionCard({ pick, position, isCurrentUser }) {
  const medal = medals[position] ?? null

  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
      isCurrentUser 
        ? 'bg-gold/10 border-gold/30' 
        : 'bg-card border-border'
    }`}>
      {/* Posición o corona */}
      <div className="text-2xl">
        {medal ? medal : '👤'}
      </div>

      {/* Escudo del equipo */}
      <div className="w-16 h-16 flex items-center justify-center">
        {pick.team?.crest ? (
          <img
            src={pick.team.crest}
            alt={pick.team.name}
            className="w-full h-full object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full rounded bg-border flex items-center justify-center text-muted text-xs">
            N/A
          </div>
        )}
      </div>

      {/* Nombre del equipo */}
      <p className="text-sm font-bold text-center truncate w-full">
        {pick.team?.name || 'Sin predicción'}
      </p>

      {/* Alias del usuario */}
      <p className={`text-xs text-center truncate w-full ${isCurrentUser ? 'text-gold font-semibold' : 'text-muted'}`}>
        {pick.alias}
        {isCurrentUser && ' ✨'}
      </p>
    </div>
  )
}
