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
