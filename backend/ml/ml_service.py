import pandas as pd
import numpy as np
from typing import Optional
import logging
import warnings

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Prépare les features pour XGBoost depuis l'historique OHLCV."""
    d = df.copy()
    close = d["Close"]

    # Indicateurs techniques comme features
    d["rsi"] = _rsi(close)
    d["macd"] = close.ewm(span=12).mean() - close.ewm(span=26).mean()
    d["ma20"] = close.rolling(20).mean()
    d["ma50"] = close.rolling(50).mean()
    d["vol_ratio"] = d["Volume"] / d["Volume"].rolling(20).mean()
    d["return_1d"] = close.pct_change(1)
    d["return_5d"] = close.pct_change(5)
    d["return_20d"] = close.pct_change(20)
    d["volatility"] = close.rolling(20).std() / close.rolling(20).mean()
    d["price_vs_ma20"] = (close - d["ma20"]) / d["ma20"]
    d["price_vs_ma50"] = (close - d["ma50"]) / d["ma50"]

    # Target : rendement à 5 jours (>0 = haussier)
    d["target"] = (close.shift(-5) > close).astype(int)

    return d.dropna()


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


FEATURE_COLS = [
    "rsi", "macd", "vol_ratio",
    "return_1d", "return_5d", "return_20d",
    "volatility", "price_vs_ma20", "price_vs_ma50"
]


def train_and_predict_xgboost(df: pd.DataFrame) -> Optional[float]:
    """
    Entraîne XGBoost sur l'historique et prédit le signal sur la dernière entrée.
    Retourne une probabilité (0..1) que le prix monte.
    """
    try:
        from xgboost import XGBClassifier

        featured = prepare_features(df)
        if len(featured) < 60:
            return None

        X = featured[FEATURE_COLS].values
        y = featured["target"].values

        # Train/test split temporel (80/20)
        split = int(len(X) * 0.8)
        X_train, y_train = X[:split], y[:split]
        X_pred = X[-1:] # dernière ligne = aujourd'hui

        model = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            use_label_encoder=False,
            eval_metric="logloss",
            verbosity=0,
        )
        model.fit(X_train, y_train)
        prob = model.predict_proba(X_pred)[0][1]  # probabilité classe 1 (hausse)
        return round(float(prob), 4)

    except Exception as e:
        logger.error(f"XGBoost error: {e}")
        return None


def predict_prophet(df: pd.DataFrame, days_ahead: int = 5) -> Optional[float]:
    """
    Utilise Prophet pour prédire la tendance à court terme.
    Retourne un score normalisé -1..+1 basé sur la tendance prédite.
    """
    try:
        from prophet import Prophet

        close = df["Close"].reset_index()
        close.columns = ["ds", "y"]
        close["ds"] = pd.to_datetime(close["ds"]).dt.tz_localize(None)

        if len(close) < 30:
            return None

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.05,
        )
        import logging as _log; _log.getLogger("prophet").setLevel(_log.ERROR); _log.getLogger("cmdstanpy").setLevel(_log.ERROR); model.fit(close)

        future = model.make_future_dataframe(periods=days_ahead)
        forecast = model.predict(future)

        last_actual = close["y"].iloc[-1]
        future_pred = forecast["yhat"].iloc[-1]
        trend_pct = (future_pred - last_actual) / last_actual

        # Normalise : ±5% → ±1.0
        score = max(-1.0, min(1.0, trend_pct / 0.05))
        return round(float(score), 4)

    except Exception as e:
        logger.error(f"Prophet error: {e}")
        return None


def score_ml(df: pd.DataFrame) -> float:
    """
    Combine XGBoost (probabilité) + Prophet (tendance).
    Retourne score -1..+1.
    """
    xgb_prob = train_and_predict_xgboost(df)
    prophet_score = predict_prophet(df)

    scores = []
    weights = []

    if xgb_prob is not None:
        # Convertit probabilité [0,1] en score [-1,+1]
        scores.append((xgb_prob - 0.5) * 2)
        weights.append(0.6)

    if prophet_score is not None:
        scores.append(prophet_score)
        weights.append(0.4)

    if not scores:
        return 0.0

    total_weight = sum(weights)
    combined = sum(s * w for s, w in zip(scores, weights)) / total_weight
    return round(max(-1.0, min(1.0, combined)), 4)
