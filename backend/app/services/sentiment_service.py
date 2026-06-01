import finnhub
import logging
from datetime import datetime, timedelta
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from app.core.config import settings

logger = logging.getLogger(__name__)
analyzer = SentimentIntensityAnalyzer()

# Client Finnhub (lazy init)
_finnhub_client = None


def get_finnhub_client():
    global _finnhub_client
    if _finnhub_client is None and settings.finnhub_api_key:
        _finnhub_client = finnhub.Client(api_key=settings.finnhub_api_key)
    return _finnhub_client


def fetch_news(ticker: str, days: int = 3) -> list[str]:
    """Récupère les titres de news des X derniers jours via Finnhub."""
    client = get_finnhub_client()
    if not client:
        return []
    try:
        end = datetime.now()
        start = end - timedelta(days=days)
        news = client.company_news(
            ticker,
            _from=start.strftime("%Y-%m-%d"),
            to=end.strftime("%Y-%m-%d")
        )
        return [item["headline"] for item in news[:20] if "headline" in item]
    except Exception as e:
        logger.error(f"Finnhub news error {ticker}: {e}")
        return []


def analyze_sentiment(texts: list[str]) -> tuple[float, str]:
    """
    Analyse le sentiment d'une liste de textes.
    Retourne (score -1..+1, label).
    """
    if not texts:
        return 0.0, "NEUTRAL"

    scores = []
    for text in texts:
        vs = analyzer.polarity_scores(text)
        scores.append(vs["compound"])

    avg = sum(scores) / len(scores)

    if avg >= 0.2:
        label = "POSITIVE"
    elif avg <= -0.2:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"

    return round(avg, 4), label


def score_sentiment(ticker: str) -> tuple[float, str]:
    """
    Score sentiment normalisé pour un ticker.
    Retourne (score -1..+1, label).
    """
    headlines = fetch_news(ticker)
    if not headlines:
        return 0.0, "NEUTRAL"
    return analyze_sentiment(headlines)
