const BASE = '/api/v1'

export async function fetchScreener(signal = null, category = null) {
  const params = new URLSearchParams()
  if (signal) params.append('signal', signal)
  if (category) params.append('category', category)
  const res = await fetch(`${BASE}/screener?${params}`)
  if (!res.ok) throw new Error('Erreur screener')
  return res.json()
}

export async function fetchSummary() {
  const res = await fetch(`${BASE}/summary`)
  if (!res.ok) throw new Error('Erreur summary')
  return res.json()
}

export async function fetchSignals(ticker, limit = 48) {
  const res = await fetch(`${BASE}/signals/${ticker}?limit=${limit}`)
  if (!res.ok) throw new Error('Erreur signals')
  return res.json()
}

export async function fetchAssets() {
  const res = await fetch(`${BASE}/assets`)
  if (!res.ok) throw new Error('Erreur assets')
  return res.json()
}

export async function addAsset(ticker, name, category) {
  const res = await fetch(`${BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, name, category }),
  })
  if (!res.ok) throw new Error('Erreur ajout asset')
  return res.json()
}

export async function removeAsset(ticker) {
  const res = await fetch(`${BASE}/assets/${ticker}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erreur suppression asset')
  return res.json()
}

export async function triggerRefresh(ticker = null) {
  const url = ticker ? `${BASE}/refresh/${ticker}` : `${BASE}/refresh`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error('Erreur refresh')
  return res.json()
}

// ── Portfolio ────────────────────────────────────────────
export async function fetchPortfolio() {
  const res = await fetch(`${BASE}/portfolio`)
  if (!res.ok) throw new Error('Erreur portfolio')
  return res.json()
}

export async function fetchPortfolioSummary() {
  const res = await fetch(`${BASE}/portfolio/summary`)
  if (!res.ok) throw new Error('Erreur portfolio summary')
  return res.json()
}

export async function addPosition(position) {
  const res = await fetch(`${BASE}/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(position),
  })
  if (!res.ok) throw new Error('Erreur ajout position')
  return res.json()
}

export async function updatePosition(id, update) {
  const res = await fetch(`${BASE}/positions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error('Erreur mise à jour position')
  return res.json()
}

export async function deletePosition(id) {
  const res = await fetch(`${BASE}/positions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erreur suppression position')
  return res.json()
}
