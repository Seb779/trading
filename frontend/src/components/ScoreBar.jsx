export function ScoreBar({ value, label, size = 'md' }) {
  // value entre -1 et +1
  const pct = ((value + 1) / 2) * 100
  const color = value > 0.3 ? 'var(--buy)' : value < -0.3 ? 'var(--sell)' : 'var(--hold)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {label && (
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative', height: size === 'sm' ? '4px' : '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${pct}%`, height: '100%',
          background: color,
          borderRadius: '3px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.65rem', color, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  )
}
