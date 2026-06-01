from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.models.schemas import (
    PositionDB, SignalDB, PositionCreate, PositionUpdate,
    PositionSchema, PortfolioRow
)
from app.services.data_service import fetch_current_price, fetch_company_name
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
portfolio_router = APIRouter()


# ── CRUD Positions ───────────────────────────────────────────────────────────

@portfolio_router.get("/positions", response_model=List[PositionSchema])
async def list_positions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PositionDB).order_by(PositionDB.created_at))
    return result.scalars().all()


@portfolio_router.post("/positions", response_model=PositionSchema)
async def add_position(pos: PositionCreate, db: AsyncSession = Depends(get_db)):
    name = pos.name or fetch_company_name(pos.ticker)
    db_pos = PositionDB(
        ticker=pos.ticker.upper(),
        name=name,
        quantity=pos.quantity,
        buy_price=pos.buy_price,
        buy_date=pos.buy_date,
        notes=pos.notes,
    )
    db.add(db_pos)
    await db.commit()
    await db.refresh(db_pos)
    return db_pos


@portfolio_router.put("/positions/{position_id}", response_model=PositionSchema)
async def update_position(
    position_id: int, update: PositionUpdate, db: AsyncSession = Depends(get_db)
):
    pos = await db.get(PositionDB, position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position non trouvée")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(pos, field, value)
    pos.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(pos)
    return pos


@portfolio_router.delete("/positions/{position_id}")
async def delete_position(position_id: int, db: AsyncSession = Depends(get_db)):
    pos = await db.get(PositionDB, position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position non trouvée")
    await db.delete(pos)
    await db.commit()
    return {"deleted": position_id}


# ── Vue portefeuille enrichie ─────────────────────────────────────────────────

@portfolio_router.get("/portfolio", response_model=List[PortfolioRow])
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    # Récupère toutes les positions
    result = await db.execute(select(PositionDB).order_by(PositionDB.ticker))
    positions = result.scalars().all()

    # Récupère les derniers signaux
    subq = (
        select(SignalDB.ticker, func.max(SignalDB.timestamp).label("max_ts"))
        .group_by(SignalDB.ticker)
        .subquery()
    )
    sig_result = await db.execute(
        select(SignalDB).join(
            subq,
            (SignalDB.ticker == subq.c.ticker) &
            (SignalDB.timestamp == subq.c.max_ts)
        )
    )
    signals = {s.ticker: s for s in sig_result.scalars().all()}

    rows = []
    for pos in positions:
        sig = signals.get(pos.ticker)

        # Prix actuel : depuis le signal en DB ou fetch live
        current_price = None
        if sig and sig.price:
            current_price = sig.price
        else:
            current_price = fetch_current_price(pos.ticker)

        invested = round(pos.quantity * pos.buy_price, 2)
        current_value = round(pos.quantity * current_price, 2) if current_price else None
        pnl = round(current_value - invested, 2) if current_value else None
        pnl_pct = round((pnl / invested) * 100, 2) if pnl is not None and invested > 0 else None

        rows.append(PortfolioRow(
            id=pos.id,
            ticker=pos.ticker,
            name=pos.name,
            quantity=pos.quantity,
            buy_price=pos.buy_price,
            buy_date=pos.buy_date,
            current_price=current_price,
            current_value=current_value,
            invested_value=invested,
            pnl=pnl,
            pnl_pct=pnl_pct,
            signal=sig.signal if sig else None,
            score_composite=sig.score_composite if sig else None,
            notes=pos.notes,
        ))

    return rows


# ── Résumé portefeuille ───────────────────────────────────────────────────────

@portfolio_router.get("/portfolio/summary")
async def get_portfolio_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PositionDB))
    positions = result.scalars().all()

    if not positions:
        return {
            "total_invested": 0, "total_current": 0,
            "total_pnl": 0, "total_pnl_pct": 0,
            "positions_count": 0,
            "buy_count": 0, "hold_count": 0, "sell_count": 0,
        }

    subq = (
        select(SignalDB.ticker, func.max(SignalDB.timestamp).label("max_ts"))
        .group_by(SignalDB.ticker)
        .subquery()
    )
    sig_result = await db.execute(
        select(SignalDB).join(
            subq,
            (SignalDB.ticker == subq.c.ticker) &
            (SignalDB.timestamp == subq.c.max_ts)
        )
    )
    signals = {s.ticker: s for s in sig_result.scalars().all()}

    total_invested = 0
    total_current = 0
    signal_counts = {"BUY": 0, "HOLD": 0, "SELL": 0}

    for pos in positions:
        sig = signals.get(pos.ticker)
        invested = pos.quantity * pos.buy_price
        total_invested += invested
        current_price = sig.price if sig else fetch_current_price(pos.ticker)
        if current_price:
            total_current += pos.quantity * current_price
        if sig and sig.signal in signal_counts:
            signal_counts[sig.signal] += 1

    total_pnl = round(total_current - total_invested, 2)
    total_pnl_pct = round((total_pnl / total_invested) * 100, 2) if total_invested > 0 else 0

    return {
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "positions_count": len(positions),
        "buy_count": signal_counts["BUY"],
        "hold_count": signal_counts["HOLD"],
        "sell_count": signal_counts["SELL"],
    }
