"""
Deterministic Quantitative & Technical Analysis Service
Calculates SMA, EMA, RSI, MACD, Bollinger Bands, and Volatility using arbitrary precision math.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal, getcontext
import math
from pydantic import BaseModel
from src.backend.data_ingestion.base import NormalizedBar

# Set high decimal precision for quantitative formulas
getcontext().prec = 28

class TechnicalIndicators(BaseModel):
    sma_50: Optional[Decimal] = None
    sma_200: Optional[Decimal] = None
    rsi_14: Optional[Decimal] = None
    macd_line: Optional[Decimal] = None
    macd_signal: Optional[Decimal] = None
    macd_histogram: Optional[Decimal] = None
    bollinger_upper: Optional[Decimal] = None
    bollinger_middle: Optional[Decimal] = None
    bollinger_lower: Optional[Decimal] = None
    annualized_volatility: Optional[Decimal] = None

class ChartReadyTechnicalPayload(BaseModel):
    symbol: str
    currency: str
    provider: str
    total_bars: int
    latest_indicators: TechnicalIndicators
    candlesticks: List[Dict[str, Any]]
    indicators: Dict[str, List[Dict[str, Any]]]

class TechnicalAnalysisService:
    """Provides deterministic financial indicator calculations."""

    @staticmethod
    def calculate_sma(prices: List[Decimal], window: int) -> List[Optional[Decimal]]:
        """Calculates Simple Moving Average (SMA)."""
        result: List[Optional[Decimal]] = []
        if window <= 0:
            return [None] * len(prices)

        for i in range(len(prices)):
            if i + 1 < window:
                result.append(None)
            else:
                subset = prices[i + 1 - window : i + 1]
                avg = sum(subset) / Decimal(str(window))
                result.append(round(avg, 4))
        return result

    @staticmethod
    def calculate_ema(prices: List[Decimal], window: int) -> List[Optional[Decimal]]:
        """Calculates Exponential Moving Average (EMA)."""
        result: List[Optional[Decimal]] = []
        if len(prices) < window or window <= 0:
            return [None] * len(prices)

        multiplier = Decimal("2.0") / Decimal(str(window + 1))
        # First EMA is initial SMA
        first_sma = sum(prices[:window]) / Decimal(str(window))
        for _ in range(window - 1):
            result.append(None)
        result.append(round(first_sma, 4))

        current_ema = first_sma
        for price in prices[window:]:
            current_ema = (price - current_ema) * multiplier + current_ema
            result.append(round(current_ema, 4))

        return result

    @staticmethod
    def calculate_rsi(prices: List[Decimal], window: int = 14) -> List[Optional[Decimal]]:
        """
        Calculates Relative Strength Index (RSI) using standard Wilder's smoothing.
        """
        if len(prices) <= window or window <= 0:
            return [None] * len(prices)

        result: List[Optional[Decimal]] = [None] * window
        deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

        gains = [d if d > Decimal("0") else Decimal("0") for d in deltas]
        losses = [-d if d < Decimal("0") else Decimal("0") for d in deltas]

        # Initial averages
        avg_gain = sum(gains[:window]) / Decimal(str(window))
        avg_loss = sum(losses[:window]) / Decimal(str(window))

        if avg_loss == Decimal("0"):
            result.append(Decimal("100.0000"))
        else:
            rs = avg_gain / avg_loss
            rsi = Decimal("100.0") - (Decimal("100.0") / (Decimal("1.0") + rs))
            result.append(round(rsi, 4))

        # Smoothed Wilder's approach for remaining points
        for i in range(window, len(deltas)):
            current_gain = gains[i]
            current_loss = losses[i]

            avg_gain = (avg_gain * Decimal(str(window - 1)) + current_gain) / Decimal(str(window))
            avg_loss = (avg_loss * Decimal(str(window - 1)) + current_loss) / Decimal(str(window))

            if avg_loss == Decimal("0"):
                rsi = Decimal("100.0000")
            else:
                rs = avg_gain / avg_loss
                rsi = Decimal("100.0") - (Decimal("100.0") / (Decimal("1.0") + rs))
            result.append(round(rsi, 4))

        return result

    @staticmethod
    def calculate_macd(
        prices: List[Decimal],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> Dict[str, List[Optional[Decimal]]]:
        """Calculates MACD line, signal line, and MACD histogram."""
        fast_ema = TechnicalAnalysisService.calculate_ema(prices, fast_period)
        slow_ema = TechnicalAnalysisService.calculate_ema(prices, slow_period)

        macd_line: List[Optional[Decimal]] = []
        valid_macd_points: List[Decimal] = []
        valid_macd_indices: List[int] = []

        for i in range(len(prices)):
            f = fast_ema[i]
            s = slow_ema[i]
            if f is not None and s is not None:
                diff = f - s
                macd_line.append(round(diff, 4))
                valid_macd_points.append(diff)
                valid_macd_indices.append(i)
            else:
                macd_line.append(None)

        signal_ema = TechnicalAnalysisService.calculate_ema(valid_macd_points, signal_period)
        signal_line: List[Optional[Decimal]] = [None] * len(prices)
        histogram: List[Optional[Decimal]] = [None] * len(prices)

        for local_idx, orig_idx in enumerate(valid_macd_indices):
            sig_val = signal_ema[local_idx]
            signal_line[orig_idx] = sig_val
            if macd_line[orig_idx] is not None and sig_val is not None:
                histogram[orig_idx] = round(macd_line[orig_idx] - sig_val, 4)

        return {
            "macd": macd_line,
            "signal": signal_line,
            "histogram": histogram
        }

    @staticmethod
    def calculate_bollinger_bands(
        prices: List[Decimal],
        window: int = 20,
        num_std: float = 2.0
    ) -> Dict[str, List[Optional[Decimal]]]:
        """Calculates Bollinger Bands (Middle SMA, Upper Band, Lower Band)."""
        middle = TechnicalAnalysisService.calculate_sma(prices, window)
        upper: List[Optional[Decimal]] = []
        lower: List[Optional[Decimal]] = []

        for i in range(len(prices)):
            mid_val = middle[i]
            if mid_val is None:
                upper.append(None)
                lower.append(None)
            else:
                subset = prices[i + 1 - window : i + 1]
                # Standard deviation
                variance = sum((p - mid_val) ** 2 for p in subset) / Decimal(str(window))
                std_dev = Decimal(str(math.sqrt(float(variance))))
                band_offset = std_dev * Decimal(str(num_std))
                upper.append(round(mid_val + band_offset, 4))
                lower.append(round(mid_val - band_offset, 4))

        return {
            "middle": middle,
            "upper": upper,
            "lower": lower
        }

    @staticmethod
    def calculate_annualized_volatility(prices: List[Decimal], window: int = 20) -> Optional[Decimal]:
        """Calculates annualized volatility based on 252 trading days."""
        if len(prices) < 2:
            return None
        recent_prices = prices[-window:] if len(prices) >= window else prices
        log_returns = []
        for i in range(1, len(recent_prices)):
            p0 = float(recent_prices[i - 1])
            p1 = float(recent_prices[i])
            if p0 > 0 and p1 > 0:
                log_returns.append(math.log(p1 / p0))

        if len(log_returns) < 2:
            return None

        mean = sum(log_returns) / len(log_returns)
        variance = sum((r - mean) ** 2 for r in log_returns) / (len(log_returns) - 1)
        daily_std = math.sqrt(variance)
        annualized = daily_std * math.sqrt(252.0)
        return round(Decimal(str(annualized)), 4)

    @classmethod
    def process_bars(cls, symbol: str, bars: List[NormalizedBar]) -> ChartReadyTechnicalPayload:
        """Processes bars sorted chronologically (oldest to newest) into chart-ready payloads."""
        # Ensure chronological order
        sorted_bars = sorted(bars, key=lambda b: b.trade_date)
        closes = [b.close for b in sorted_bars]

        sma_50 = cls.calculate_sma(closes, 50)
        sma_200 = cls.calculate_sma(closes, 200)
        rsi_14 = cls.calculate_rsi(closes, 14)
        macd_res = cls.calculate_macd(closes, 12, 26, 9)
        bb_res = cls.calculate_bollinger_bands(closes, 20, 2.0)
        vol = cls.calculate_annualized_volatility(closes, 20)

        # Candlesticks formatted for TradingView Lightweight Charts
        candlesticks = []
        for b in sorted_bars:
            candlesticks.append({
                "time": str(b.trade_date),
                "open": float(b.open),
                "high": float(b.high),
                "low": float(b.low),
                "close": float(b.close),
                "volume": b.volume
            })

        latest_ind = TechnicalIndicators(
            sma_50=sma_50[-1] if sma_50 else None,
            sma_200=sma_200[-1] if sma_200 else None,
            rsi_14=rsi_14[-1] if rsi_14 else None,
            macd_line=macd_res["macd"][-1] if macd_res["macd"] else None,
            macd_signal=macd_res["signal"][-1] if macd_res["signal"] else None,
            macd_histogram=macd_res["histogram"][-1] if macd_res["histogram"] else None,
            bollinger_upper=bb_res["upper"][-1] if bb_res["upper"] else None,
            bollinger_middle=bb_res["middle"][-1] if bb_res["middle"] else None,
            bollinger_lower=bb_res["lower"][-1] if bb_res["lower"] else None,
            annualized_volatility=vol
        )

        currency = sorted_bars[0].currency if sorted_bars else "USD"
        provider = sorted_bars[0].provider if sorted_bars else "unknown"

        return ChartReadyTechnicalPayload(
            symbol=symbol,
            currency=currency,
            provider=provider,
            total_bars=len(sorted_bars),
            latest_indicators=latest_ind,
            candlesticks=candlesticks,
            indicators={
                "sma_50": [{"time": str(sorted_bars[i].trade_date), "value": float(sma_50[i])} for i in range(len(sorted_bars)) if sma_50[i] is not None],
                "sma_200": [{"time": str(sorted_bars[i].trade_date), "value": float(sma_200[i])} for i in range(len(sorted_bars)) if sma_200[i] is not None],
                "rsi_14": [{"time": str(sorted_bars[i].trade_date), "value": float(rsi_14[i])} for i in range(len(sorted_bars)) if rsi_14[i] is not None],
            }
        )

technical_service = TechnicalAnalysisService()
