export function SignalBadge({ signal }) {
  const config = {
    BUY:  { bg: 'var(--buy-bg)',  color: 'var(--buy)',  label: '▲ BUY' },
    SELL: { bg: 'var(--sell-bg)', color: 'var(--sell)', label: '▼ SELL' },
    HOLD: { bg: 'var(--hold-bg)', color: 'var(--hold)', label: '◆ HOLD' },
  }
  const { bg, color, label } = config[signal] || config.HOLD
  return (
    <span style={{
      background: bg,
      color,
      padding: '3px 10px',
      borderRadius: '4px',
      fontSize: '0.72rem',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      letterSpacing: '0.08em',
      border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  )
}
