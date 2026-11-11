"""
Financial Query Intent Classifier & Entity Extractor
Determines analytical intent and extracts ticker symbols and parameters.
Supports Stock Comparison, Buy/Sell Scenario Simulation, Technicals, Fundamentals, and News.
"""
from typing import List, Optional, Set
import re
from enum import Enum
from pydantic import BaseModel

class FinancialIntent(str, Enum):
    PRICE_CHECK = "PRICE_CHECK"
    TECHNICAL_ANALYSIS = "TECHNICAL_ANALYSIS"
    FUNDAMENTAL_ANALYSIS = "FUNDAMENTAL_ANALYSIS"
    COMPANY_PROFILE = "COMPANY_PROFILE"
    NEWS_SENTIMENT = "NEWS_SENTIMENT"
    PORTFOLIO_QUERY = "PORTFOLIO_QUERY"
    STOCK_COMPARISON = "STOCK_COMPARISON"
    SCENARIO_SIMULATION = "SCENARIO_SIMULATION"
    PYTHON_CALCULATION = "PYTHON_CALCULATION"
    GENERAL_QUERY = "GENERAL_QUERY"

class ExtractedEntities(BaseModel):
    symbols: List[str] = []
    intent: FinancialIntent
    indicators_requested: List[str] = []
    confidence: float

class IntentClassifier:
    """Classifies user messages and resolves entities deterministically."""

    # Common ticker dictionary to avoid false positives
    KNOWN_TICKERS = {
        "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "TSLA", "META", "BRK.A", "BRK.B",
        "JPM", "V", "UNH", "XOM", "JNJ", "WMT", "MA", "PG", "HD", "LLY", "AVGO", "ORCL",
        "MRK", "CVX", "COST", "KO", "PEP", "BAC", "ADBE", "CSCO", "TMO", "ACN", "NFLX",
        "CRM", "INTC", "AMD", "QCOM", "TXN", "HON", "LIN", "PM", "IBM", "AMAT", "CAT",
        "GE", "NOW", "ISRG", "SPGI", "UBER", "INTU", "BKNG", "PLTR", "GS", "MS", "BLK",
        "RTX", "LOW", "PFE", "AMGN", "SYK", "MDT", "BSX", "COP", "EOG", "SLB", "DE",
        "LMT", "BA", "UNP", "MMM", "DIS", "CMCSA", "NKE", "MCD", "SBUX", "T", "VZ", "NEE",
        "HSBA", "HSBA.L", "7203", "7203.T", "6758", "6758.T", "8306", "8306.T",
        "NESN", "NESN.SW", "NOVN", "NOVN.SW", "ROG", "ROG.SW",
        "TM", "NSRGY", "SONY", "MUFG", "ASML", "TSM", "NVO", "BABA", "SAP", "SHEL"
    }

    COMPANY_NAME_MAP = {
        "nvidia": "NVDA",
        "apple": "AAPL",
        "microsoft": "MSFT",
        "amazon": "AMZN",
        "google": "GOOGL",
        "alphabet": "GOOGL",
        "tesla": "TSLA",
        "meta": "META",
        "facebook": "META",
        "amd": "AMD",
        "broadcom": "AVGO",
        "toyota": "TM",
        "nestle": "NSRGY",
        "hsbc": "HSBA.L",
        "sony": "SONY",
        "mitsubishi": "MUFG",
        "palantir": "PLTR",
        "intel": "INTC",
        "qualcomm": "QCOM",
        "jpmorgan": "JPM",
        "netflix": "NFLX"
    }

    COMPARISON_KEYWORDS = [
        "compare", "versus", "vs", "which is better", "which one", "which should i buy",
        "more attractive", "which is stronger", "difference between", "head to head"
    ]

    SCENARIO_KEYWORDS = [
        "if i sell", "what if i sell", "sell all", "sell some", "reallocate", "rebalance",
        "what will happen if i sell", "what will my portfolio look like", "invest proceeds",
        "sell my", "move into", "switch from"
    ]

    TECHNICAL_KEYWORDS = [
        "sma", "ema", "rsi", "macd", "bollinger", "moving average",
        "indicator", "technical", "chart", "candlestick", "volatility",
        "trend", "overbought", "oversold", "momentum"
    ]

    FUNDAMENTAL_KEYWORDS = [
        "pe", "p/e", "margin", "roe", "roa", "debt", "equity", "income",
        "balance sheet", "cash flow", "revenue", "profit", "fcf", "earnings",
        "fundamental", "financials", "eps", "ebitda"
    ]

    NEWS_KEYWORDS = [
        "news", "headline", "sentiment", "event", "article", "press release"
    ]

    PORTFOLIO_KEYWORDS = [
        "portfolio", "holding", "allocation", "excel", "herfindahl", "diversification", "weights"
    ]

    NON_TICKER_TERMS = {
        "I", "A", "THE", "AND", "FOR", "AI", "OR", "ON", "IN", "IS", "TO", "OF",
        "SHOW", "WHAT", "BUY", "SELL", "VS", "IF", "MY", "WITH", "FROM", "AT",
        "BY", "AN", "BE", "DO", "HOW", "WHY", "CAN", "ALL", "NEW", "GET",
        "RSI", "SMA", "EMA", "MACD", "BB", "ATR", "VWAP", "EPS", "PE", "ROE",
        "ROA", "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CEO", "CFO",
        "SEC", "API", "NAV", "HHI", "EOD", "ETF", "ADR", "MIC", "CIK", "FY"
    }

    def extract_symbols(self, text: str) -> List[str]:
        """Extracts ticker symbols from uppercase patterns or known company names."""
        found: Set[str] = set()

        # 1. Company name mapping
        lower_text = text.lower()
        for name, sym in self.COMPANY_NAME_MAP.items():
            if re.search(r'\b' + re.escape(name) + r'\b', lower_text):
                found.add(sym)

        # 2. Uppercase word matches: 1-5 letters or dots (e.g. HSBA.L)
        raw_words = re.findall(r'\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b', text)
        for word in raw_words:
            if word not in self.NON_TICKER_TERMS:
                if word in self.KNOWN_TICKERS or (len(word) >= 2 and not word.isdigit()):
                    found.add(word)

        return sorted(list(found))

    def classify(self, text: str) -> ExtractedEntities:
        """Determines the primary financial intent."""
        lower = text.lower()
        symbols = self.extract_symbols(text)

        # Detect technical indicators
        indicators = []
        for kw in ["sma", "ema", "rsi", "macd", "bollinger", "volatility"]:
            if kw in lower:
                indicators.append(kw.upper())

        # Check for scenario simulation intent
        is_scenario = any(kw in lower for kw in self.SCENARIO_KEYWORDS) or ("sell" in lower and "buy" in lower)
        if is_scenario:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.SCENARIO_SIMULATION, confidence=0.95)

        # Check for stock comparison intent
        has_comp_word = any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in ["vs", "versus", "better", "which", "compare", "compared"])
        is_comparison = any(kw in lower for kw in self.COMPARISON_KEYWORDS) or has_comp_word
        if is_comparison and len(symbols) >= 2:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.STOCK_COMPARISON, confidence=0.94)

        # Other intent scorings
        is_portfolio = any(kw in lower for kw in self.PORTFOLIO_KEYWORDS)
        is_news = any(kw in lower for kw in self.NEWS_KEYWORDS)
        is_technical = any(kw in lower for kw in self.TECHNICAL_KEYWORDS)
        is_fundamental = any(kw in lower for kw in self.FUNDAMENTAL_KEYWORDS)
        is_price = any(kw in lower for kw in ["price", "quote", "cost", "worth", "trading at", "current value"])

        if is_portfolio:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.PORTFOLIO_QUERY, confidence=0.9)
        elif is_news:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.NEWS_SENTIMENT, confidence=0.88)
        elif is_technical or indicators:
            return ExtractedEntities(
                symbols=symbols,
                intent=FinancialIntent.TECHNICAL_ANALYSIS,
                indicators_requested=indicators,
                confidence=0.9
            )
        elif is_fundamental:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.FUNDAMENTAL_ANALYSIS, confidence=0.88)
        elif is_price and symbols:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.PRICE_CHECK, confidence=0.92)
        elif "profile" in lower or "who is" in lower or "about" in lower:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.COMPANY_PROFILE, confidence=0.85)
        elif symbols:
            return ExtractedEntities(symbols=symbols, intent=FinancialIntent.PRICE_CHECK, confidence=0.7)
        else:
            return ExtractedEntities(symbols=[], intent=FinancialIntent.GENERAL_QUERY, confidence=0.6)

intent_classifier = IntentClassifier()

def classify_intent(text: str):
    """Convenience helper returning (intent, symbols, indicators)."""
    res = intent_classifier.classify(text)
    return res.intent, res.symbols, res.indicators_requested
