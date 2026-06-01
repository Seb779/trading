from sqlalchemy import Column, String, Float, DateTime, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

Base = declarative_base()


# ── ORM Models ──────────────────────────────────────────────────────────────

class AssetDB(Base):
    __tablename__ = "assets"
    ticker = Column(String, primary_key=True)
    name = Column(String)
    category = Column(String)  # swiss / tech / etf / crypto
    added_at = Column(DateTime, default=datetime.utcnow)


class SignalDB(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    price = Column(Float)
    score_technical = Column(Float)
    score_sentiment = Column(Float)
    score_ml = Column(Float)
    score_composite = Column(Float)
    signal = Column(String)   # BUY / HOLD / SELL
    rsi = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    ma50 = Column(Float)
    ma200 = Column(Float)
    bb_upper = Column(Float)
    bb_lower = Column(Float)
    sentiment_label = Column(String)
    notes = Column(Text, nullable=True)


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class AssetSchema(BaseModel):
    ticker: str
    name: str
    category: str

    class Config:
        from_attributes = True


class SignalSchema(BaseModel):
    id: int
    ticker: str
    timestamp: datetime
    price: float
    score_technical: float
    score_sentiment: float
    score_ml: float
    score_composite: float
    signal: str
    rsi: Optional[float]
    macd: Optional[float]
    macd_signal: Optional[float]
    ma50: Optional[float]
    ma200: Optional[float]
    bb_upper: Optional[float]
    bb_lower: Optional[float]
    sentiment_label: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class ScreenerRow(BaseModel):
    ticker: str
    name: str
    category: str
    price: float
    signal: str
    score_composite: float
    score_technical: float
    score_sentiment: float
    score_ml: float
    rsi: Optional[float]
    ma50: Optional[float]
    ma200: Optional[float]
    sentiment_label: Optional[str]
    timestamp: datetime
