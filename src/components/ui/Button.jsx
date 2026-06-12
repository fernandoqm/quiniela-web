export default function Button({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const base = 'w-full py-3 rounded-xl font-bold text-sm transition-opacity active:opacity-70'
  const variants = {
    primary: 'bg-gold text-bg',
    secondary: 'bg-card border border-border text-subtle',
    ghost: 'bg-transparent text-gold border border-gold',
    danger: 'bg-danger text-white',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
