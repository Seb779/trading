import { useEffect, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fetchSignals, triggerRefresh } from '../utils/api'
import { SignalBadge } from './SignalBadge'
import { ScoreBar } from './ScoreBar'

export function DetailModal({ ticker: row, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSignals(row.ticker, 48)
      .then(data => setHistory([...data].reverse()))
      .finally(() => setLoading(false))
  }, [row.ticker])

  const handleRefresh = async () => {
    setRefreshing(true)
    await triggerRefresh(row.ticker)
    setTimeout(() => {
      fetchSignals(row.ticker, 48).then(d => setHistory([...d].reverse()))
      setRefreshing(false)
    }, 3000)
  }

  const chartData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleString('fr-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    score: h.score_composite,
    rsi: h.rsi,
    price: h.price,
  }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="modal-ticker">{row.ticker}</h2>
              <SignalBadge signal={row.signal} />
            </div>
            <p className="modal-name">{row.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn-refresh ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
              <RefreshCw size={14} />
            </button>
            <button className="btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Prix + scores */}
        <div className="modal-scores">
          <div className="modal-price">
            {row.price?.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="price-currency"> CHF/USD</span>
          </div>
          <div className="scores-grid">
            <ScoreBar value={row.score_composite} label="Composite" />
            <ScoreBar value={row.score_technical} label="Technique" />
            <ScoreBar value={row.score_sentiment} label="Sentiment" />
            <ScoreBar value={row.score_ml} label="ML" />
          </div>
        </div>

        {/* Indicateurs */}
        <div className="indicators-grid">
          {[
            { label: 'RSI', value: row.rsi?.toFixed(1), alert: row.rsi < 30 ? 'low' : row.rsi > 70 ? 'high' : null },
            { label: 'MA50', value: row.ma50?.toFixed(2) },
            { label: 'MA200', value: row.ma200?.toFixed(2) },
            { label: 'Sentiment', value: row.sentiment_label },
          ].map(ind => (
            <div key={ind.label} className={`indicator-card ${ind.alert ? 'alert-' + ind.alert : ''}`}>
              <span className="ind-label">{ind.label}</span>
              <span className="ind-value">{ind.value ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Graphique historique score */}
        {loading ? (
          <div className="loading-state"><div className="loader" /><span>Chargement…</span></div>
        ) : chartData.length > 1 ? (
          <div className="chart-section">
            <h3 className="chart-title">Historique du score composite</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <ReferenceLine y={0.3} stroke="var(--buy)" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={-0.3} stroke="var(--sell)" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
            Historique insuffisant — relance un refresh pour accumuler des données.
          </p>
        )}
      </div>
    </div>
  )
}
