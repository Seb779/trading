import logging
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.services.data_service import (
    fetch_history, fetch_current_price, fetch_company_name,
    compute_rsi, compute_macd, compute_bollinger, compute_moving_averages,
    score_technical
)
from app.services.sentiment_service import score_sentiment
from ml.ml_service import score_ml

logger = logging.getLogger(__name__)


def determine_signal(score: float) -> str:
    if score >= settings.signal_buy_threshold:
        return "BUY"
    elif score <= settings.signal_sell_threshold:
        return "SELL"
    return "HOLD"


def compute_composite(s_tech: float, s_sent: float, s_ml: float) -> float:
    w = settings
    composite = (
        s_tech * w.weight_technical +
        s_sent * w.weight_sentiment +
        s_ml * w.weight_ml
    )
    return round(max(-1.0, min(1.0, composite)), 4)


def analyze_ticker(ticker: str) -> Optional[dict]:
    """
    Pipeline complet pour un ticker :
    1. Données historiques
    2. Indicateurs techniques + score
    3. Sentiment + score
    4. ML + score
    5. Score composite + signal
    """
    logger.info(f"Analyse de {ticker}...")

    # ── Données ──────────────────────────────────────────────────
    df = fetch_history(ticker, period="1y")
    if df is None or df.empty:
        logger.warning(f"Pas d'historique pour {ticker}, skip.")
        return None

    price = fetch_current_price(ticker) or float(df["Close"].iloc[-1])
    name = fetch_company_name(ticker)

    # ── Indicateurs techniques ───────────────────────────────────
    close = df["Close"]
    rsi = compute_rsi(close)
    macd_val, macd_sig = compute_macd(close)
    bb_upper, bb_lower, pct_b = compute_bollinger(close)
    ma50, ma200 = compute_moving_averages(close)

    s_tech = score_technical(rsi, macd_val, macd_sig, price, ma50, ma200, pct_b)

    # ── Sentiment ────────────────────────────────────────────────
    s_sent, sent_label = score_sentiment(ticker)

    # ── ML ───────────────────────────────────────────────────────
    s_ml = score_ml(df)

    # ── Composite ────────────────────────────────────────────────
    s_composite = compute_composite(s_tech, s_sent, s_ml)
    signal = determine_signal(s_composite)

    return {
        "ticker": ticker,
        "name": name,
        "timestamp": datetime.utcnow(),
        "price": price,
        "score_technical": s_tech,
        "score_sentiment": s_sent,
        "score_ml": s_ml,
        "score_composite": s_composite,
        "signal": signal,
        "rsi": rsi,
        "macd": macd_val,
        "macd_signal": macd_sig,
        "ma50": ma50,
        "ma200": ma200,
        "bb_upper": bb_upper,
        "bb_lower": bb_lower,
        "sentiment_label": sent_label,
        "notes": None,
    }
