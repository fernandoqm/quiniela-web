export default function Badge({ children, color = 'gold' }) {
  const colors = {
    gold: 'bg-gold/10 text-gold border-gold/20',
    red: 'bg-danger/10 text-danger border-danger/20',
    green: 'bg-win/10 text-win border-win/20',
    blue: 'bg-info/10 text-info border-info/20',
    muted: 'bg-card text-muted border-border',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colors[color]}`}>
      {children}
    </span>
  )
}
