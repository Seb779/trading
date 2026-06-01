import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def fetch_history(ticker: str, period: str = "1y") -> Optional[pd.DataFrame]:
    """Télécharge l'historique OHLCV via yfinance."""
    try:
        t = yf.Ticker(ticker)
        df = t.history(period=period)
        if df.empty:
            logger.warning(f"Pas de données pour {ticker}")
            return None
        return df
    except Exception as e:
        logger.error(f"Erreur yfinance {ticker}: {e}")
        return None


def fetch_current_price(ticker: str) -> Optional[float]:
    """Prix actuel via yfinance fast_info."""
    try:
        t = yf.Ticker(ticker)
        price = t.fast_info.get("last_price") or t.fast_info.get("regularMarketPrice")
        return float(price) if price else None
    except Exception as e:
        logger.error(f"Erreur prix {ticker}: {e}")
        return None


def fetch_company_name(ticker: str) -> str:
    """Nom de la société."""
    try:
        info = yf.Ticker(ticker).info
        return info.get("longName") or info.get("shortName") or ticker
    except Exception:
        return ticker


def compute_rsi(series: pd.Series, period: int = 14) -> float:
    """Calcule le RSI sur la dernière valeur."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return round(float(rsi.iloc[-1]), 2)


def compute_macd(series: pd.Series):
    """Retourne (macd, signal) dernière valeur."""
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    return round(float(macd.iloc[-1]), 4), round(float(signal.iloc[-1]), 4)


def compute_bollinger(series: pd.Series, period: int = 20):
    """Retourne (upper, lower, pct_b)."""
    ma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper = ma + 2 * std
    lower = ma - 2 * std
    last_price = series.iloc[-1]
    last_upper = upper.iloc[-1]
    last_lower = lower.iloc[-1]
    pct_b = (last_price - last_lower) / (last_upper - last_lower) if (last_upper - last_lower) != 0 else 0.5
    return round(float(last_upper), 4), round(float(last_lower), 4), round(float(pct_b), 4)


def compute_moving_averages(series: pd.Series):
    """Retourne (ma50, ma200)."""
    ma50 = series.rolling(window=50).mean().iloc[-1] if len(series) >= 50 else None
    ma200 = series.rolling(window=200).mean().iloc[-1] if len(series) >= 200 else None
    return (round(float(ma50), 4) if ma50 else None,
            round(float(ma200), 4) if ma200 else None)


def score_technical(rsi: float, macd: float, macd_sig: float,
                    price: float, ma50: Optional[float], ma200: Optional[float],
                    pct_b: float) -> float:
    """
    Score technique normalisé entre -1 et +1.
    Positif = signal haussier, négatif = baissier.
    """
    score = 0.0
    count = 0

    # RSI
    if rsi < 30:
        score += 1.0
    elif rsi > 70:
        score -= 1.0
    elif rsi < 45:
        score += 0.3
    elif rsi > 55:
        score -= 0.3
    count += 1

    # MACD vs signal
    if macd > macd_sig:
        score += 0.8 if (macd > 0) else 0.4
    else:
        score -= 0.8 if (macd < 0) else 0.4
    count += 1

    # MA50 vs MA200 (Golden/Death cross)
    if ma50 and ma200:
        if ma50 > ma200:
            score += 0.6
        else:
            score -= 0.6
        count += 1

    # Price vs MA50
    if ma50:
        if price > ma50:
            score += 0.4
        else:
            score -= 0.4
        count += 1

    # Bollinger %B
    if pct_b < 0.1:
        score += 0.8
    elif pct_b > 0.9:
        score -= 0.8
    count += 1

    return round(max(-1.0, min(1.0, score / count)), 4) if count > 0 else 0.0
