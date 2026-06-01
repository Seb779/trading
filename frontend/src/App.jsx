import { useState } from 'react'
import './index.css'
import { Dashboard } from './pages/Dashboard'
import { Portfolio } from './pages/Portfolio'

export default function App() {
  const [page, setPage] = useState('screener')

  return (
    <>
      <nav className="app-nav">
        <button
          className={`nav-btn ${page === 'screener' ? 'active' : ''}`}
          onClick={() => setPage('screener')}
        >
          ◈ Screener
        </button>
        <button
          className={`nav-btn ${page === 'portfolio' ? 'active' : ''}`}
          onClick={() => setPage('portfolio')}
        >
          ◎ Portefeuille
        </button>
      </nav>
      {page === 'screener' ? <Dashboard /> : <Portfolio />}
    </>
  )
}
