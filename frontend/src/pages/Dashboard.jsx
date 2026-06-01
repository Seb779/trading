import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus, Filter, ListPlus } from 'lucide-react'
import { fetchScreener, fetchSummary, triggerRefresh } from '../utils/api'
import { SignalBadge } from '../components/SignalBadge'
import { ScoreBar } from '../components/ScoreBar'
import { DetailModal } from '../components/DetailModal'
import { WatchlistModal } from '../components/WatchlistModal'

const CATEGORIES = ['Tous', 'swiss', 'tech', 'etf', 'crypto']
const SIGNALS = ['Tous', 'BUY', 'HOLD', 'SELL']

export function Dashboard() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ buy: 0, hold: 0, sell: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterSignal, setFilterSignal] = useState('Tous')
  const [filterCat, setFilterCat] = useState('Tous')
  const [selected, setSelected] = useState(null)
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback(async () => {
    try {
      const [data, sum] = await Promise.all([
        fetchScreener(
          filterSignal !== 'Tous' ? filterSignal : null,
          filterCat !== 'Tous' ? filterCat : null
        ),
        fetchSummary(),
      ])
      setRows(data)
      setSummary(sum)
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filterSignal, filterCat])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await triggerRefresh()
    setTimeout(() => { load(); setRefreshing(false) }, 2000)
  }

  const handleWatchlistUpdated = () => {
    load()
  }

  const sortedRows = [...rows].sort((a, b) => b.score_composite - a.score_composite)

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="header-left">
          <div className="logo-mark">◈</div>
          <div>
            <h1>Trading <span className="accent">Signal</span></h1>
            <p className="subtitle">Screener IA · neon invest</p>
          </div>
        </div>
        <div className="header-right">
          {lastUpdate && (
            <span className="last-update">
              Mis à jour {lastUpdate.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn-watchlist" onClick={() => setShowWatchlist(true)} title="Gérer la watchlist">
            <ListPlus size={14} />
            <span className="btn-watchlist-label">Watchlist</span>
          </button>
          <button className={`btn-refresh ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="card card-buy">
          <TrendingUp size={18} />
          <span className="card-count">{summary.buy}</span>
          <span className="card-label">BUY</span>
        </div>
        <div className="card card-hold">
          <Minus size={18} />
          <span className="card-count">{summary.hold}</span>
          <span className="card-label">HOLD</span>
        </div>
        <div className="card card-sell">
          <TrendingDown size={18} />
          <span className="card-count">{summary.sell}</span>
          <span className="card-label">SELL</span>
        </div>
        <div className="card card-total">
          <span className="card-count">{summary.total}</span>
          <span className="card-label">ACTIFS</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        <div className="filter-group">
          {SIGNALS.map(s => (
            <button
              key={s}
              className={`filter-btn ${filterSignal === s ? 'active' : ''}`}
              onClick={() => setFilterSignal(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="filter-divider" />
        <div className="filter-group">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`filter-btn ${filterCat === c ? 'active' : ''}`}
              onClick={() => setFilterCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <span>Chargement des signaux…</span>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="empty-state">
            <span>Aucun signal disponible. Lance un refresh.</span>
          </div>
        ) : (
          <table className="screener-table">
            <thead>
              <tr>
                <th>Actif</th>
                <th>Prix</th>
                <th>Signal</th>
                <th>Score</th>
                <th className="hide-sm">Technique</th>
                <th className="hide-sm">Sentiment</th>
                <th className="hide-sm">ML</th>
                <th className="hide-sm">RSI</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.ticker} className="table-row" onClick={() => setSelected(row)}>
                  <td>
                    <div className="ticker-cell">
                      <span className="ticker">{row.ticker}</span>
                      <span className="name">{row.name}</span>
                    </div>
                  </td>
                  <td className="price-cell">
                    {row.price?.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td><SignalBadge signal={row.signal} /></td>
                  <td style={{ minWidth: '90px' }}>
                    <ScoreBar value={row.score_composite} size="sm" />
                  </td>
                  <td className="hide-sm">
                    <ScoreBar value={row.score_technical} size="sm" />
                  </td>
                  <td className="hide-sm">
                    <ScoreBar value={row.score_sentiment} size="sm" />
                  </td>
                  <td className="hide-sm">
                    <ScoreBar value={row.score_ml} size="sm" />
                  </td>
                  <td className="hide-sm">
                    <span className={`rsi-val ${row.rsi < 30 ? 'rsi-low' : row.rsi > 70 ? 'rsi-high' : ''}`}>
                      {row.rsi?.toFixed(1) ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <DetailModal ticker={selected} onClose={() => setSelected(null)} />}
      {showWatchlist && (
        <WatchlistModal
          onClose={() => setShowWatchlist(false)}
          onUpdated={handleWatchlistUpdated}
        />
      )}
    </div>
  )
}
