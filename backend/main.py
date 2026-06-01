import logging
import sys
import os

# Ajoute le dossier racine au path pour les imports ml/
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.core.scheduler import start_scheduler
from app.api.routes import router
from app.core.config import settings
from app.models.schemas import AssetDB
from app.core.database import AsyncSessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def seed_default_assets():
    """Insère les tickers par défaut si la DB est vide."""
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, func
        count = await db.execute(select(func.count()).select_from(AssetDB))
        if count.scalar() == 0:
            categories = {
                "NESN.SW": ("Nestlé", "swiss"), "NOVN.SW": ("Novartis", "swiss"),
                "ROG.SW": ("Roche", "swiss"), "ABBN.SW": ("ABB", "swiss"),
                "UBSG.SW": ("UBS", "swiss"), "ZURN.SW": ("Zurich Insurance", "swiss"),
                "LONN.SW": ("Lonza", "swiss"), "SREN.SW": ("Swiss Re", "swiss"),
                "AAPL": ("Apple", "tech"), "MSFT": ("Microsoft", "tech"),
                "NVDA": ("NVIDIA", "tech"), "GOOGL": ("Alphabet", "tech"),
                "META": ("Meta", "tech"), "AMZN": ("Amazon", "tech"),
                "SPY": ("S&P 500 ETF", "etf"), "VTI": ("Total Market ETF", "etf"),
                "QQQ": ("Nasdaq ETF", "etf"), "IWDA.AS": ("iShares World ETF", "etf"),
                "BTCE.SW": ("Bitcoin ETP", "crypto"), "ETHE.SW": ("Ethereum ETP", "crypto"),
            }
            for ticker, (name, cat) in categories.items():
                db.add(AssetDB(ticker=ticker, name=name, category=cat))
            await db.commit()
            logger.info(f"✅ {len(categories)} actifs initialisés en base")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_default_assets()
    start_scheduler()
    yield
    from app.core.scheduler import scheduler
    scheduler.shutdown()


app = FastAPI(
    title="Trading Dashboard API",
    description="API de screening et prédiction boursière",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
