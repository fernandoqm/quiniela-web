export default function ScoreSelector({ homeScore, awayScore, onHomeChange, onAwayChange, disabled }) {
  const Stepper = ({ value, onChange }) => (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={disabled}
        className="w-10 h-10 bg-card border border-border rounded-lg text-xl font-bold text-subtle active:bg-border disabled:opacity-40"
      >
        +
      </button>
      <div className={`w-14 h-14 flex items-center justify-center rounded-xl text-3xl font-black border-2 ${disabled ? 'border-border text-subtle' : 'border-gold text-white'}`}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="w-10 h-10 bg-card border border-border rounded-lg text-xl font-bold text-subtle active:bg-border disabled:opacity-40"
      >
        −
      </button>
    </div>
  )

  return (
    <div className="flex items-center justify-center gap-6 py-2">
      <Stepper value={homeScore} onChange={onHomeChange} />
      <span className="text-muted text-xl">—</span>
      <Stepper value={awayScore} onChange={onAwayChange} />
    </div>
  )
}
