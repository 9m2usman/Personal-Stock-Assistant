"""
Data Ingestion Base Interfaces & Normalized Schemas
Defines domain data models and abstract provider contracts.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field

class DataFreshness(str, Enum):
    REAL_TIME = "REAL_TIME"
    DELAYED = "DELAYED"
    END_OF_DAY = "END_OF_DAY"
    HISTORICAL = "HISTORICAL"

class NormalizedBar(BaseModel):
    """Standardized OHLCV time-series bar."""
    trade_date: date
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int
    currency: str
    provider: str
    freshness: DataFreshness = DataFreshness.END_OF_DAY

class NormalizedQuote(BaseModel):
    """Standardized real-time or delayed quote snapshot."""
    symbol: str
    price: Decimal
    change: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None
    volume: Optional[int] = None
    currency: str
    exchange: str
    as_of: datetime
    provider: str
    freshness: DataFreshness = DataFreshness.DELAYED

class NormalizedInstrument(BaseModel):
    """Provider-independent normalized financial instrument."""
    id: str
    company_name: str
    display_symbol: str
    provider_symbols: Dict[str, str] = Field(default_factory=dict)
    exchange_mic: str
    exchange_name: str
    country: str
    currency: str
    instrument_type: str = "Common Stock"
    listing_type: str = "Primary"  # Primary, Secondary, ADR, ETF
    is_adr: bool = False
    related_adr_symbol: Optional[str] = None
    cik: Optional[str] = None
    provider_availability: Dict[str, bool] = Field(default_factory=dict)

class NormalizedProfile(BaseModel):
    """Standardized company profile information."""
    symbol: str
    company_name: str
    exchange: str
    currency: str
    industry: Optional[str] = None
    sector: Optional[str] = None
    market_cap: Optional[Decimal] = None
    beta: Optional[Decimal] = None
    description: Optional[str] = None
    cik: Optional[str] = None
    provider: str

class NormalizedFinancialStatement(BaseModel):
    """Standardized multi-period financial statement."""
    symbol: str
    statement_type: str  # INCOME, BALANCE_SHEET, CASH_FLOW
    fiscal_period: str   # FY, Q1, Q2, Q3, Q4
    fiscal_year: int
    filing_date: date
    reported_currency: str
    source: str
    metrics: Dict[str, Any]

class NormalizedNewsArticle(BaseModel):
    """Standardized financial news item."""
    title: str
    source: str
    url: str
    published_at: datetime
    summary: Optional[str] = None
    sentiment_label: Optional[str] = None  # POSITIVE, NEUTRAL, NEGATIVE
    provider: str

class NormalizedFXRate(BaseModel):
    """Standardized exchange rate."""
    base_currency: str
    target_currency: str
    rate: Decimal
    date: date
    source: str

class BaseMarketDataProvider(ABC):
    """Contract for stock quote and historical bar providers."""
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def get_daily_history(
        self,
        symbol: str,
        exchange: Optional[str] = None,
        limit: int = 100
    ) -> List[NormalizedBar]:
        pass

    @abstractmethod
    async def get_quote(self, symbol: str, exchange: Optional[str] = None) -> NormalizedQuote:
        pass

class BaseFundamentalProvider(ABC):
    """Contract for corporate fundamentals and statement providers."""
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def get_company_profile(self, symbol: str) -> NormalizedProfile:
        pass

    @abstractmethod
    async def get_income_statement(self, symbol: str, limit: int = 5) -> List[NormalizedFinancialStatement]:
        pass

class BaseNewsProvider(ABC):
    """Contract for financial news providers."""
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def search_news(self, query: str, limit: int = 5) -> List[NormalizedNewsArticle]:
        pass

class BaseFXProvider(ABC):
    """Contract for foreign exchange providers."""
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def get_rate(self, base_currency: str, target_currency: str) -> NormalizedFXRate:
        pass
