import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, X, Check, TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react'
import { fetchPortfolio, fetchPortfolioSummary, addPosition, updatePosition, deletePosition } from '../utils/api'
import { SignalBadge } from '../components/SignalBadge'

const EMPTY_FORM = {
  ticker: '',
  name: '',
  quantity: '',
  buy_price: '',
  buy_date: new Date().toISOString().split('T')[0],
  notes: '',
}

function fmt(val, decimals = 2) {
  if (val == null) return '—'
  return val.toLocaleString('fr-CH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function PnlBadge({ value, pct }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const positive = value >= 0
  const color = positive ? 'var(--buy)' : 'var(--sell)'
  const bg = positive ? 'var(--buy-bg)' : 'var(--sell-bg)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>
        {positive ? '+' : ''}{fmt(value)} CHF
      </span>
      <span style={{
        background: bg, color, padding: '1px 6px', borderRadius: 3,
        fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
        border: `1px solid ${color}40`, display: 'inline-block', width: 'fit-content'
      }}>
        {positive ? '+' : ''}{fmt(pct)}%
      </span>
    </div>
  )
}

export function Portfolio() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [data, sum] = await Promise.all([fetchPortfolio(), fetchPortfolioSummary()])
      setRows(data)
      setSummary(sum)
    } catch (e) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.ticker || !form.quantity || !form.buy_price || !form.buy_date) {
      return setError('Ticker, quantité, prix et date sont requis')
    }
    setSaving(true)
    setError('')
    try {
      await addPosition({
        ticker: form.ticker.toUpperCase(),
        name: form.name || undefined,
        quantity: parseFloat(form.quantity),
        buy_price: parseFloat(form.buy_price),
        buy_date: new Date(form.buy_date).toISOString(),
        notes: form.notes || undefined,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError('Erreur lors de l\'ajout')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette position ?')) return
    try {
      await deletePosition(id)
      await load()
    } catch (e) {
      setError('Erreur suppression')
    }
  }

  const startEdit = (row) => {
    setEditId(row.id)
    setEditForm({
      quantity: row.quantity,
      buy_price: row.buy_price,
      buy_date: new Date(row.buy_date).toISOString().split('T')[0],
      notes: row.notes || '',
    })
  }

  const handleSaveEdit = async (id) => {
    try {
      await updatePosition(id, {
        quantity: parseFloat(editForm.quantity),
        buy_price: parseFloat(editForm.buy_price),
        buy_date: new Date(editForm.buy_date).toISOString(),
        notes: editForm.notes || undefined,
      })
      setEditId(null)
      await load()
    } catch (e) {
      setError('Erreur mise à jour')
    }
  }

  const totalInvested = summary?.total_invested ?? 0
  const totalCurrent = summary?.total_current ?? 0
  const totalPnl = summary?.total_pnl ?? 0
  const totalPnlPct = summary?.total_pnl_pct ?? 0

  return (
    <div className="portfolio-page">

      {/* Header */}
      <div className="pf-header">
        <div>
          <h2 className="pf-title">◎ Mon <span className="accent">Portefeuille</span></h2>
          <p className="subtitle">Positions neon invest · mise à jour en temps réel</p>
        </div>
        <button className="wl-btn-add" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} />
          Ajouter une position
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="pf-form-card">
          <h3 className="wl-section-title">Nouvelle position</h3>
          {error && <div className="wl-error" style={{ marginBottom: 10 }}>{error}</div>}
          <div className="pf-form-grid">
            <div className="pf-field">
              <label>Ticker *</label>
              <input className="wl-input" placeholder="ex: AAPL, NESN.SW"
                value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} />
            </div>
            <div className="pf-field">
              <label>Nom</label>
              <input className="wl-input" placeholder="Apple Inc. (optionnel)"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="pf-field">
              <label>Quantité *</label>
              <input className="wl-input" type="number" step="0.001" placeholder="ex: 10"
                value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="pf-field">
              <label>Prix d'achat (CHF/USD) *</label>
              <input className="wl-input" type="number" step="0.01" placeholder="ex: 185.50"
                value={form.buy_price} onChange={e => setForm({ ...form, buy_price: e.target.value })} />
            </div>
            <div className="pf-field">
              <label>Date d'achat *</label>
              <input className="wl-input" type="date"
                value={form.buy_date} onChange={e => setForm({ ...form, buy_date: e.target.value })} />
            </div>
            <div className="pf-field pf-field-full">
              <label>Notes</label>
              <input className="wl-input" placeholder="Optionnel"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="wl-btn-add" onClick={handleAdd} disabled={saving}>
              {saving ? <div className="loader" style={{ width: 14, height: 14 }} /> : <Check size={15} />}
              Enregistrer
            </button>
            <button className="btn-close" style={{ width: 'auto', padding: '0 12px' }}
              onClick={() => { setShowForm(false); setError('') }}>
              <X size={14} /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="pf-summary">
          <div className="pf-card">
            <Wallet size={16} style={{ color: 'var(--accent)' }} />
            <div>
              <span className="pf-card-val">{fmt(totalInvested)} CHF</span>
              <span className="pf-card-lbl">Investi</span>
            </div>
          </div>
          <div className="pf-card">
            <BarChart2 size={16} style={{ color: 'var(--text-dim)' }} />
            <div>
              <span className="pf-card-val">{fmt(totalCurrent)} CHF</span>
              <span className="pf-card-lbl">Valeur actuelle</span>
            </div>
          </div>
          <div className={`pf-card ${totalPnl >= 0 ? 'pf-card-buy' : 'pf-card-sell'}`}>
            {totalPnl >= 0
              ? <TrendingUp size={16} style={{ color: 'var(--buy)' }} />
              : <TrendingDown size={16} style={{ color: 'var(--sell)' }} />}
            <div>
              <span className="pf-card-val" style={{ color: totalPnl >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
                {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)} CHF
              </span>
              <span className="pf-card-lbl">
                {totalPnl >= 0 ? '+' : ''}{fmt(totalPnlPct)}% · Performance
              </span>
            </div>
          </div>
          <div className="pf-card">
            <span className="pf-card-val">{summary.positions_count}</span>
            <span className="pf-card-lbl">Positions</span>
          </div>
        </div>
      )}

      {/* Tableau des positions */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-state"><div className="loader" /><span>Chargement…</span></div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <span>Aucune position. Ajoute ta première position neon !</span>
          </div>
        ) : (
          <table className="screener-table">
            <thead>
              <tr>
                <th>Actif</th>
                <th>Qté</th>
                <th>Prix achat</th>
                <th>Prix actuel</th>
                <th>Valeur</th>
                <th>P&L</th>
                <th className="hide-sm">Signal</th>
                <th className="hide-sm">Date achat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="table-row">
                  {editId === row.id ? (
                    // ── Mode édition ──
                    <>
                      <td>
                        <div className="ticker-cell">
                          <span className="ticker">{row.ticker}</span>
                          <span className="name">{row.name}</span>
                        </div>
                      </td>
                      <td>
                        <input className="wl-input" type="number" step="0.001" style={{ width: 70 }}
                          value={editForm.quantity}
                          onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} />
                      </td>
                      <td>
                        <input className="wl-input" type="number" step="0.01" style={{ width: 90 }}
                          value={editForm.buy_price}
                          onChange={e => setEditForm({ ...editForm, buy_price: e.target.value })} />
                      </td>
                      <td className="price-cell">{fmt(row.current_price)}</td>
                      <td className="price-cell">{fmt(row.current_value)}</td>
                      <td><PnlBadge value={row.pnl} pct={row.pnl_pct} /></td>
                      <td className="hide-sm">
                        <input className="wl-input" type="date" style={{ width: 130 }}
                          value={editForm.buy_date}
                          onChange={e => setEditForm({ ...editForm, buy_date: e.target.value })} />
                      </td>
                      <td className="hide-sm"></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="wl-btn-add" style={{ padding: '4px 8px' }}
                            onClick={() => handleSaveEdit(row.id)}>
                            <Check size={13} />
                          </button>
                          <button className="btn-close" onClick={() => setEditId(null)}>
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // ── Mode lecture ──
                    <>
                      <td>
                        <div className="ticker-cell">
                          <span className="ticker">{row.ticker}</span>
                          <span className="name">{row.name}</span>
                        </div>
                      </td>
                      <td className="price-cell">{fmt(row.quantity, 3)}</td>
                      <td className="price-cell">{fmt(row.buy_price)}</td>
                      <td className="price-cell">{fmt(row.current_price)}</td>
                      <td className="price-cell">{fmt(row.current_value)}</td>
                      <td><PnlBadge value={row.pnl} pct={row.pnl_pct} /></td>
                      <td className="hide-sm">
                        {row.signal ? <SignalBadge signal={row.signal} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="hide-sm">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(row.buy_date).toLocaleDateString('fr-CH')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="wl-btn-remove" onClick={() => startEdit(row)} title="Modifier">
                            <Edit3 size={13} />
                          </button>
                          <button className="wl-btn-remove" onClick={() => handleDelete(row.id)} title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
