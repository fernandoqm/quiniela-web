const medals = { 0: '🥇', 1: '🥈', 2: '🥉' }

export default function LeaderboardRow({ member, position, isCurrentUser }) {
  const isLeader = position === 0

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 rounded-lg px-2 -mx-2 transition-colors ${
      isLeader ? 'bg-gold/10' : isCurrentUser ? 'bg-gold/5' : ''
    }`}>
      <span className="w-6 text-center text-sm shrink-0">
        {medals[position] ?? <span className="text-muted text-xs">{position + 1}</span>}
      </span>
      <span className={`flex-1 text-sm font-medium truncate ${isLeader ? 'text-gold font-bold' : isCurrentUser ? 'text-gold' : 'text-white'}`}>
        {member.alias}
        {isCurrentUser && <span className="text-xs ml-1 opacity-60">✨</span>}
      </span>
      <span className={`text-sm font-bold shrink-0 ${isLeader ? 'text-gold' : isCurrentUser ? 'text-gold' : 'text-subtle'}`}>
        {member.totalPoints} pts
      </span>
    </div>
  )
}
