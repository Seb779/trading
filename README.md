# Trading Signal Dashboard

Screener boursier avec signaux IA pour neon invest.  
Score composite = Technique (50%) + Sentiment VADER (20%) + ML XGBoost/Prophet (30%)

## Structure

```
Trading/
├── backend/
│   ├── main.py                  # Point d'entrée FastAPI
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── api/routes.py        # Endpoints REST
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pondérations, seuils)
│   │   │   ├── database.py      # SQLite async
│   │   │   └── scheduler.py     # Refresh toutes les 1h
│   │   ├── models/schemas.py    # ORM + Pydantic
│   │   └── services/
│   │       ├── data_service.py      # yfinance + indicateurs
│   │       ├── sentiment_service.py # VADER + Finnhub news
│   │       └── scoring_service.py   # Pipeline composite
│   └── ml/
│       └── ml_service.py        # XGBoost + Prophet
└── frontend/
    ├── src/
    │   ├── pages/Dashboard.jsx  # Page principale screener
    │   ├── components/
    │   │   ├── SignalBadge.jsx  # Badge BUY/HOLD/SELL
    │   │   ├── ScoreBar.jsx     # Barre de score -1..+1
    │   │   └── DetailModal.jsx  # Modal détail + graphique
    │   └── utils/api.js         # Appels API REST
    └── index.css                # Design sombre financier
```

## Installation locale

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Ajoute ta clé Finnhub
uvicorn main:app --reload

# Frontend (autre terminal)
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

## Variables d'environnement

```env
FINNHUB_API_KEY=your_key    # https://finnhub.io (gratuit)
REFRESH_INTERVAL_HOURS=1
```

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/v1/screener | Derniers signaux tous tickers |
| GET | /api/v1/screener?signal=BUY | Filtrer par signal |
| GET | /api/v1/signals/{ticker} | Historique d'un ticker |
| GET | /api/v1/summary | Compteurs BUY/HOLD/SELL |
| POST | /api/v1/refresh | Refresh global |
| POST | /api/v1/refresh/{ticker} | Refresh un ticker |
| POST | /api/v1/assets | Ajouter un ticker |
| DELETE | /api/v1/assets/{ticker} | Supprimer un ticker |

## Score composite

```
Score = (Technique × 50%) + (Sentiment × 20%) + (ML × 30%)
> +0.3  → 🟢 BUY
-0.3 à +0.3 → 🟡 HOLD
< -0.3  → 🔴 SELL
```

## Déploiement VPS Infomaniak

```bash
# Copie les fichiers sur le VPS
scp -r Trading/ user@IP_VPS:/opt/trading/

# Lance le déploiement
ssh user@IP_VPS "bash /opt/trading/deploy.sh"
```

## Roadmap v2
- [ ] Notifications Telegram/email
- [ ] FinBERT (si upgrade RAM VPS)
- [ ] Backtesting des signaux
- [ ] Watchlist personnalisée via UI
