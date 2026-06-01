from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.models.schemas import SignalDB, AssetDB, SignalSchema, AssetSchema, ScreenerRow
from app.core.config import settings
from app.services.scoring_service import analyze_ticker
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Assets (gestion de la watchlist) ────────────────────────────────────────

@router.get("/assets", response_model=List[AssetSchema])
async def list_assets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AssetDB))
    return result.scalars().all()


@router.post("/assets", response_model=AssetSchema)
async def add_asset(asset: AssetSchema, db: AsyncSession = Depends(get_db)):
    existing = await db.get(AssetDB, asset.ticker)
    if existing:
        raise HTTPException(status_code=400, detail="Ticker déjà existant")
    db.add(AssetDB(**asset.dict()))
    await db.commit()
    return asset


@router.delete("/assets/{ticker}")
async def remove_asset(ticker: str, db: AsyncSession = Depends(get_db)):
    asset = await db.get(AssetDB, ticker)
    if not asset:
        raise HTTPException(status_code=404, detail="Ticker non trouvé")
    await db.delete(asset)
    await db.commit()
    return {"deleted": ticker}


# ── Screener (derniers signaux par ticker) ───────────────────────────────────

@router.get("/screener", response_model=List[ScreenerRow])
async def get_screener(
    signal: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    # Sous-requête : dernier signal par ticker
    subq = (
        select(SignalDB.ticker, func.max(SignalDB.timestamp).label("max_ts"))
        .group_by(SignalDB.ticker)
        .subquery()
    )
    q = (
        select(SignalDB, AssetDB)
        .join(subq, (SignalDB.ticker == subq.c.ticker) & (SignalDB.timestamp == subq.c.max_ts))
        .join(AssetDB, AssetDB.ticker == SignalDB.ticker, isouter=True)
    )
    if signal:
        q = q.where(SignalDB.signal == signal.upper())
    if category:
        q = q.where(AssetDB.category == category)

    result = await db.execute(q)
    rows = result.all()

    screener = []
    for sig, asset in rows:
        screener.append(ScreenerRow(
            ticker=sig.ticker,
            name=asset.name if asset else sig.ticker,
            category=asset.category if asset else "unknown",
            price=sig.price,
            signal=sig.signal,
            score_composite=sig.score_composite,
            score_technical=sig.score_technical,
            score_sentiment=sig.score_sentiment,
            score_ml=sig.score_ml,
            rsi=sig.rsi,
            ma50=sig.ma50,
            ma200=sig.ma200,
            sentiment_label=sig.sentiment_label,
            timestamp=sig.timestamp,
        ))
    return screener


# ── Historique d'un ticker ───────────────────────────────────────────────────

@router.get("/signals/{ticker}", response_model=List[SignalSchema])
async def get_signals(ticker: str, limit: int = 48, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SignalDB)
        .where(SignalDB.ticker == ticker)
        .order_by(desc(SignalDB.timestamp))
        .limit(limit)
    )
    return result.scalars().all()


# ── Refresh manuel ───────────────────────────────────────────────────────────

@router.post("/refresh/{ticker}")
async def refresh_ticker(ticker: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    async def _run():
        result = analyze_ticker(ticker)
        if result:
            async with db as session:
                session.add(SignalDB(**result))
                await session.commit()
    background_tasks.add_task(_run)
    return {"message": f"Refresh lancé pour {ticker}"}


@router.post("/refresh")
async def refresh_all(background_tasks: BackgroundTasks):
    from app.core.scheduler import refresh_all_tickers
    background_tasks.add_task(refresh_all_tickers)
    return {"message": "Refresh global lancé"}


# ── Stats summary ────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    subq = (
        select(SignalDB.ticker, func.max(SignalDB.timestamp).label("max_ts"))
        .group_by(SignalDB.ticker)
        .subquery()
    )
    q = select(SignalDB).join(
        subq, (SignalDB.ticker == subq.c.ticker) & (SignalDB.timestamp == subq.c.max_ts)
    )
    result = await db.execute(q)
    signals = result.scalars().all()

    counts = {"BUY": 0, "HOLD": 0, "SELL": 0}
    for s in signals:
        counts[s.signal] = counts.get(s.signal, 0) + 1

    return {
        "total": len(signals),
        "buy": counts["BUY"],
        "hold": counts["HOLD"],
        "sell": counts["SELL"],
    }
