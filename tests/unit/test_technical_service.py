"""
Unit Tests for Technical Analysis Service & Market Data Service
Verifies mathematical correctness of SMA, EMA, RSI, MACD, Bollinger Bands, and market aggregation.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta, datetime, timezone
from src.backend.services.technical_service import TechnicalAnalysisService, technical_service
from src.backend.services.market_service import MarketDataService, MarketSummary
from src.backend.data_ingestion.base import NormalizedBar, NormalizedQuote

def test_calculate_sma():
    prices = [Decimal("10"), Decimal("11"), Decimal("12"), Decimal("13"), Decimal("14")]
    sma_3 = TechnicalAnalysisService.calculate_sma(prices, 3)
    assert len(sma_3) == 5
    assert sma_3[0] is None
    assert sma_3[1] is None
    assert sma_3[2] == Decimal("11.0000")  # (10+11+12)/3
    assert sma_3[3] == Decimal("12.0000")  # (11+12+13)/3
    assert sma_3[4] == Decimal("13.0000")  # (12+13+14)/3

def test_calculate_ema():
    prices = [Decimal(str(x)) for x in range(1, 11)]
    ema_3 = TechnicalAnalysisService.calculate_ema(prices, 3)
    assert len(ema_3) == 10
    assert ema_3[0] is None
    assert ema_3[1] is None
    # First EMA is SMA of first 3 elements: (1+2+3)/3 = 2.0
    assert ema_3[2] == Decimal("2.0000")
    # Multiplier = 2 / (3 + 1) = 0.5
    # Next EMA = (4 - 2.0) * 0.5 + 2.0 = 3.0
    assert ema_3[3] == Decimal("3.0000")

def test_calculate_rsi_always_rising():
    # 20 strictly increasing days
    prices = [Decimal(str(100 + i * 2)) for i in range(25)]
    rsi = TechnicalAnalysisService.calculate_rsi(prices, 14)
    assert len(rsi) == 25
    # Since prices only rose, RSI should be 100
    for val in rsi[14:]:
        assert val == Decimal("100.0000")

def test_calculate_bollinger_bands():
    prices = [Decimal("20")] * 25
    bb = TechnicalAnalysisService.calculate_bollinger_bands(prices, 20, 2.0)
    assert len(bb["middle"]) == 25
    assert bb["middle"][19] == Decimal("20.0000")
    # Zero standard deviation since all prices identical
    assert bb["upper"][19] == Decimal("20.0000")
    assert bb["lower"][19] == Decimal("20.0000")

def test_calculate_macd():
    prices = [Decimal(str(50 + i)) for i in range(40)]
    macd_res = TechnicalAnalysisService.calculate_macd(prices, 12, 26, 9)
    assert "macd" in macd_res
    assert "signal" in macd_res
    assert "histogram" in macd_res
    assert len(macd_res["macd"]) == 40

def test_annualized_volatility():
    prices = [Decimal(str(100 + (i % 3))) for i in range(30)]
    vol = TechnicalAnalysisService.calculate_annualized_volatility(prices, 20)
    assert vol is not None
    assert vol > Decimal("0")

def test_process_bars():
    base_date = date(2026, 1, 1)
    bars = []
    for i in range(60):
        d = base_date + timedelta(days=i)
        p = Decimal(str(100 + (i % 5)))
        bars.append(NormalizedBar(
            symbol="NVDA",
            trade_date=d,
            open=p,
            high=p + Decimal("2"),
            low=p - Decimal("1"),
            close=p + Decimal("0.5"),
            volume=1000000,
            currency="USD",
            provider="twelve_data"
        ))

    payload = technical_service.process_bars("NVDA", bars)
    assert payload.symbol == "NVDA"
    assert payload.total_bars == 60
    assert len(payload.candlesticks) == 60
    assert payload.candlesticks[0]["time"] == "2026-01-01"
    assert payload.latest_indicators.sma_50 is not None
    assert payload.latest_indicators.rsi_14 is not None

@pytest.mark.asyncio
async def test_market_service_summary(monkeypatch):
    class MockRouter:
        async def get_quote(self, symbol: str):
            return NormalizedQuote(
                symbol=symbol,
                price=Decimal("120.50"),
                change=Decimal("2.50"),
                change_percent=Decimal("2.11"),
                currency="USD",
                exchange="NASDAQ",
                as_of=datetime.now(timezone.utc),
                provider="mock"
            )

        async def get_daily_history(self, symbol: str, limit: int = 100):
            base_date = date(2026, 1, 1)
            bars = []
            for i in range(30):
                d = base_date + timedelta(days=i)
                p = Decimal("100") + Decimal(str(i))
                bars.append(NormalizedBar(
                    symbol=symbol,
                    trade_date=d,
                    open=p,
                    high=p + Decimal("1"),
                    low=p - Decimal("1"),
                    close=p,
                    volume=500000,
                    currency="USD",
                    provider="mock"
                ))
            return bars

    svc = MarketDataService(router=MockRouter())
    summary = await svc.get_market_summary("NVDA")
    assert summary.symbol == "NVDA"
    assert summary.quote.price == Decimal("120.50")
    assert summary.historical_bars_count == 30
    assert summary.technical_indicators is not None
