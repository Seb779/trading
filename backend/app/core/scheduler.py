import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.scoring_service import analyze_ticker
from app.models.schemas import SignalDB, AssetDB
from sqlalchemy import select

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def refresh_all_tickers():
    """Recalcule les signaux pour tous les tickers enregistrés."""
    logger.info("🔄 Début du refresh des signaux...")

    async with AsyncSessionLocal() as db:
        # Récupère les tickers actifs
        result = await db.execute(select(AssetDB))
        assets = result.scalars().all()
        tickers = [a.ticker for a in assets] if assets else settings.default_tickers

    for ticker in tickers:
        try:
            result = analyze_ticker(ticker)
            if result is None:
                continue

            async with AsyncSessionLocal() as db:
                signal_row = SignalDB(**result)
                db.add(signal_row)
                await db.commit()

            logger.info(f"✅ {ticker}: {result['signal']} (score={result['score_composite']})")
        except Exception as e:
            logger.error(f"❌ Erreur refresh {ticker}: {e}")

    logger.info("✅ Refresh terminé.")


def start_scheduler():
    scheduler.add_job(
        refresh_all_tickers,
        trigger=IntervalTrigger(hours=settings.refresh_interval_hours),
        id="refresh_signals",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info(f"⏰ Scheduler démarré — refresh toutes les {settings.refresh_interval_hours}h")
