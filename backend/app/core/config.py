from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    finnhub_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./data/trading.db"
    refresh_interval_hours: int = 1
    env: str = "development"

    # Pondérations du score composite
    weight_technical: float = 0.50
    weight_sentiment: float = 0.20
    weight_ml: float = 0.30

    # Seuils de signal
    signal_buy_threshold: float = 0.3
    signal_sell_threshold: float = -0.3

    # Liste des tickers surveillés par défaut (actions neon)
    default_tickers: list[str] = [
        # Swiss
        "NESN.SW", "NOVN.SW", "ROG.SW", "ABBN.SW", "UBSG.SW",
        "ZURN.SW", "CSGN.SW", "LONN.SW", "SREN.SW", "GIVN.SW",
        # Tech US
        "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN",
        # ETF
        "SPY", "VTI", "QQQ", "IWDA.AS",
        # Crypto ETP
        "BTCE.SW", "ETHE.SW",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
