const medals = { 0: '🥇', 1: '🥈', 2: '🥉' }

export default function LeaderboardRow({ member, position, isCurrentUser }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isCurrentUser ? 'rounded-lg bg-gold/5 px-2' : ''}`}>
      <span className="w-6 text-center text-sm">
        {medals[position] || <span className="text-muted text-xs">{position + 1}</span>}
      </span>
      <span className={`flex-1 text-sm font-medium ${isCurrentUser ? 'text-gold' : 'text-white'}`}>
        {member.alias} {isCurrentUser && '✨'}
      </span>
      <span className={`text-sm font-bold ${isCurrentUser ? 'text-gold' : 'text-subtle'}`}>
        {member.totalPoints} pts
      </span>
    </div>
  )
}
