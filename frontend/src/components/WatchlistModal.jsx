import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search, AlertCircle, RefreshCw } from 'lucide-react'
import { fetchAssets, addAsset, removeAsset, triggerRefresh } from '../utils/api'

const CATEGORIES = ['swiss', 'tech', 'etf', 'crypto', 'other']

const CATEGORY_LABELS = {
  swiss: '🇨🇭 Swiss',
  tech: '💻 Tech',
  etf: '📊 ETF',
  crypto: '₿ Crypto',
  other: '🌐 Autre',
}

const SUGGESTIONS = [
  { ticker: 'NESN.SW', name: 'Nestlé', category: 'swiss' },
  { ticker: 'NOVN.SW', name: 'Novartis', category: 'swiss' },
  { ticker: 'ROG.SW', name: 'Roche', category: 'swiss' },
  { ticker: 'ABBN.SW', name: 'ABB', category: 'swiss' },
  { ticker: 'AAPL', name: 'Apple', category: 'tech' },
  { ticker: 'MSFT', name: 'Microsoft', category: 'tech' },
  { ticker: 'NVDA', name: 'NVIDIA', category: 'tech' },
  { ticker: 'TSLA', name: 'Tesla', category: 'tech' },
  { ticker: 'SPY', name: 'S&P 500 ETF', category: 'etf' },
  { ticker: 'QQQ', name: 'Nasdaq ETF', category: 'etf' },
  { ticker: 'BTC-USD', name: 'Bitcoin', category: 'crypto' },
  { ticker: 'ETH-USD', name: 'Ethereum', category: 'crypto' },
]

export function WatchlistModal({ onClose, onUpdated }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('tech')
  const [adding, setAdding] = useState(false)
  const [refreshingTicker, setRefreshingTicker] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState(null)

  useEffect(() => { loadAssets() }, [])

  const loadAssets = async () => {
    try {
      const data = await fetchAssets()
      setAssets(data)
    } catch (e) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!ticker.trim()) return setError('Ticker requis')
    setAdding(true)
    setError('')
    setSuccess('')
    try {
      const t = ticker.trim().toUpperCase()
      await addAsset(t, name.trim() || t, category)

      // Déclenche le calcul du signal immédiatement
      setRefreshingTicker(t)
      await triggerRefresh(t)
      setRefreshingTicker(null)

      setSuccess(`${t} ajouté — signal en cours de calcul…`)
      setTicker('')
      setName('')
      await loadAssets()
      onUpdated()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError('Ticker déjà existant ou invalide')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (t) => {
    setRemoving(t)
    setError('')
    try {
      await removeAsset(t)
      await loadAssets()
      onUpdated()
    } catch (e) {
      setError('Erreur suppression')
    } finally {
      setRemoving(null)
    }
  }

  const handleRefreshAll = async () => {
    setRefreshingTicker('all')
    setSuccess('')
    try {
      await triggerRefresh()
      setSuccess('Refresh global lancé — résultats dans ~2 min')
      setTimeout(() => setSuccess(''), 5000)
      onUpdated()
    } finally {
      setRefreshingTicker(null)
    }
  }

  const handleSuggestion = (s) => {
    setTicker(s.ticker)
    setName(s.name)
    setCategory(s.category)
    setError('')
  }

  const filtered = assets.filter(a =>
    a.ticker.toLowerCase().includes(search.toLowerCase()) ||
    a.name?.toLowerCase().includes(search.toLowerCase())
  )

  const existingTickers = new Set(assets.map(a => a.ticker))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel wl-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-ticker" style={{ fontSize: '1.2rem' }}>Watchlist</h2>
            <p className="modal-name">{assets.length} actifs surveillés</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn-refresh ${refreshingTicker === 'all' ? 'spinning' : ''}`}
              onClick={handleRefreshAll}
              title="Recalculer tous les signaux"
            >
              <RefreshCw size={14} />
            </button>
            <button className="btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Formulaire ajout */}
        <div className="wl-add-form">
          <h3 className="wl-section-title">Ajouter un actif</h3>
          <div className="wl-form-row">
            <input
              className="wl-input"
              placeholder="Ticker (ex: AAPL, NESN.SW)"
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              className="wl-input"
              placeholder="Nom (optionnel)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <select
              className="wl-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <button
              className="wl-btn-add"
              onClick={handleAdd}
              disabled={adding || !ticker.trim()}
            >
              {adding
                ? <div className="loader" style={{ width: 14, height: 14 }} />
                : <Plus size={16} />}
              Ajouter
            </button>
          </div>

          {error && (
            <div className="wl-error">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {success && (
            <div className="wl-success">
              ✅ {success}
            </div>
          )}

          {/* Suggestions */}
          <div className="wl-suggestions">
            <span className="wl-suggestions-label">Suggestions :</span>
            {SUGGESTIONS.filter(s => !existingTickers.has(s.ticker)).slice(0, 6).map(s => (
              <button key={s.ticker} className="wl-suggestion-btn" onClick={() => handleSuggestion(s)}>
                {s.ticker}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des actifs */}
        <div className="wl-list-section">
          <div className="wl-list-header">
            <h3 className="wl-section-title">Actifs surveillés</h3>
            <div className="wl-search">
              <Search size={12} />
              <input
                className="wl-search-input"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state"><div className="loader" /><span>Chargement…</span></div>
          ) : (
            <div className="wl-list">
              {['swiss', 'tech', 'etf', 'crypto', 'other'].map(cat => {
                const items = filtered.filter(a => a.category === cat)
                if (items.length === 0) return null
                return (
                  <div key={cat} className="wl-group">
                    <div className="wl-group-label">{CATEGORY_LABELS[cat]}</div>
                    {items.map(asset => (
                      <div key={asset.ticker} className="wl-item">
                        <div className="wl-item-info">
                          <span className="wl-item-ticker">{asset.ticker}</span>
                          <span className="wl-item-name">{asset.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className={`wl-btn-remove ${refreshingTicker === asset.ticker ? 'spinning' : ''}`}
                            onClick={() => triggerRefresh(asset.ticker).then(onUpdated)}
                            title="Recalculer ce signal"
                          >
                            <RefreshCw size={12} />
                          </button>
                          <button
                            className="wl-btn-remove"
                            onClick={() => handleRemove(asset.ticker)}
                            disabled={removing === asset.ticker}
                            title="Supprimer"
                          >
                            {removing === asset.ticker
                              ? <div className="loader" style={{ width: 12, height: 12 }} />
                              : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>
                  Aucun actif trouvé
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
