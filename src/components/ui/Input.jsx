export default function Input({ label, value, onChange, placeholder, className = '', maxLength }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-subtle">{label}</label>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted focus:outline-none focus:border-gold"
      />
    </div>
  )
}
