"""
Portfolio Management & Spreadsheet Ingestion Service
Supports Excel/CSV parsing with fuzzy column matching, FX currency normalization, and institutional analytics.
"""
from typing import List, Dict, Any, Optional
import io
import csv
from decimal import Decimal, InvalidOperation, getcontext
import openpyxl
from pydantic import BaseModel, Field
from src.backend.data_ingestion.router import financial_router, FinancialDataRouter
from src.backend.services.market_service import market_service, MarketDataService
from src.backend.core.logging import logger

getcontext().prec = 28

class RawHoldingInput(BaseModel):
    symbol: str
    quantity: float
    average_cost: float
    currency: str = "USD"

class EvaluatedPosition(BaseModel):
    symbol: str
    quantity: float
    reported_currency: str
    original_cost: float
    base_currency: str
    normalized_cost: float
    current_price: float
    market_value: float
    cost_basis: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    weight_percent: float

class PortfolioAnalytics(BaseModel):
    base_currency: str
    total_market_value: float
    total_cost_basis: float
    total_unrealized_pnl: float
    total_unrealized_pnl_percent: float
    herfindahl_index: float
    concentration_risk_level: str  # DIVERSIFIED, MODERATE, HIGH_CONCENTRATION
    risk_warnings: List[str]
    positions: List[EvaluatedPosition]

class PortfolioManagementService:
    """Institutional portfolio ingestion, currency conversion, and concentration analysis."""

    def __init__(
        self,
        router: FinancialDataRouter = financial_router,
        market_svc: MarketDataService = market_service
    ):
        self.router = router
        self.market_svc = market_svc

    def parse_spreadsheet(self, file_bytes: bytes, filename: str) -> List[RawHoldingInput]:
        """Parses spreadsheet bytes (.xlsx or .csv) with intelligent fuzzy column detection."""
        holdings: List[RawHoldingInput] = []

        if filename.lower().endswith(".csv"):
            text_stream = io.StringIO(file_bytes.decode("utf-8", errors="replace"))
            reader = csv.reader(text_stream)
            rows = list(reader)
        else:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
            rows = [[str(cell.value) if cell.value is not None else "" for cell in row] for row in sheet.rows]

        if not rows:
            return []

        header = [col.strip().lower() for col in rows[0]]

        # Fuzzy match columns
        sym_idx = self._find_col_index(header, ["symbol", "ticker", "instrument", "code", "asset"])
        qty_idx = self._find_col_index(header, ["quantity", "shares", "units", "qty", "amount", "size"])
        cost_idx = self._find_col_index(header, ["average_cost", "avg_cost", "cost_basis", "buy_price", "purchase_price", "cost", "price"])
        ccy_idx = self._find_col_index(header, ["currency", "ccy", "denom", "curr"])

        if sym_idx is None or qty_idx is None:
            raise ValueError("Spreadsheet must contain identifiable 'Symbol' and 'Quantity' columns.")

        for row_idx, r in enumerate(rows[1:], start=2):
            if not r or len(r) <= sym_idx or not r[sym_idx].strip():
                continue
            sym = r[sym_idx].strip().upper()

            try:
                qty_raw = r[qty_idx].replace(",", "").strip() if len(r) > qty_idx else "0"
                qty = float(qty_raw) if qty_raw else 0.0

                cost_raw = r[cost_idx].replace(",", "").strip() if (cost_idx is not None and len(r) > cost_idx) else "0"
                cost = float(cost_raw) if cost_raw else 0.0

                ccy = r[ccy_idx].strip().upper() if (ccy_idx is not None and len(r) > ccy_idx and r[ccy_idx].strip()) else "USD"

                if qty > 0:
                    holdings.append(RawHoldingInput(
                        symbol=sym,
                        quantity=qty,
                        average_cost=cost,
                        currency=ccy
                    ))
            except (ValueError, TypeError) as e:
                logger.warning("Skipping invalid row %d: %s (%s)", row_idx, r, e)
                continue

        return holdings

    def _find_col_index(self, header: List[str], candidates: List[str]) -> Optional[int]:
        for candidate in candidates:
            for idx, col in enumerate(header):
                if candidate in col:
                    return idx
        return None

    async def evaluate_portfolio(
        self,
        raw_holdings: List[RawHoldingInput],
        base_currency: str = "USD"
    ) -> PortfolioAnalytics:
        """Converts holdings to base currency, fetches live quotes, and computes portfolio risk."""
        base_ccy = base_currency.upper()
        positions: List[EvaluatedPosition] = []
        total_market_value = 0.0
        total_cost_basis = 0.0

        for h in raw_holdings:
            # 1. Fetch FX rate if foreign currency
            fx_rate = Decimal("1.0")
            if h.currency.upper() != base_ccy:
                try:
                    fx_data = await self.router.get_fx_rate(h.currency, base_ccy)
                    fx_rate = fx_data.rate
                except Exception as e:
                    logger.warning("FX conversion failed for %s to %s: %s. Using 1.0", h.currency, base_ccy, e)

            norm_cost = float(Decimal(str(h.average_cost)) * fx_rate)

            # 2. Fetch market price
            curr_price = norm_cost  # Fallback to cost if quote fails
            try:
                quote = await self.market_svc.get_realtime_quote(h.symbol)
                # Convert quote currency to portfolio base currency if different
                quote_fx = Decimal("1.0")
                if quote.currency.upper() != base_ccy:
                    try:
                        q_fx_data = await self.router.get_fx_rate(quote.currency, base_ccy)
                        quote_fx = q_fx_data.rate
                    except Exception:
                        pass
                curr_price = float(quote.price * quote_fx)
            except Exception as e:
                logger.warning("Could not fetch quote for holding %s: %s", h.symbol, e)

            market_val = h.quantity * curr_price
            cost_basis = h.quantity * norm_cost
            pnl = market_val - cost_basis
            pnl_pct = (pnl / cost_basis * 100.0) if cost_basis > 0 else 0.0

            total_market_value += market_val
            total_cost_basis += cost_basis

            positions.append(EvaluatedPosition(
                symbol=h.symbol.upper(),
                quantity=h.quantity,
                reported_currency=h.currency.upper(),
                original_cost=round(h.average_cost, 2),
                base_currency=base_ccy,
                normalized_cost=round(norm_cost, 2),
                current_price=round(curr_price, 2),
                market_value=round(market_val, 2),
                cost_basis=round(cost_basis, 2),
                unrealized_pnl=round(pnl, 2),
                unrealized_pnl_percent=round(pnl_pct, 2),
                weight_percent=0.0  # Will calculate in next step
            ))

        # Calculate allocation weights & HHI
        hhi = 0.0
        warnings = []
        for pos in positions:
            w = (pos.market_value / total_market_value) if total_market_value > 0 else 0.0
            pos.weight_percent = round(w * 100.0, 2)
            hhi += (w ** 2)

            if pos.weight_percent > 25.0:
                warnings.append(f"High single-stock concentration: {pos.symbol} represents {pos.weight_percent}% of total portfolio.")

        # Classify HHI concentration level
        if hhi > 0.25:
            risk_level = "HIGH_CONCENTRATION"
            warnings.append(f"Herfindahl Index of {round(hhi, 3)} exceeds safe diversification thresholds (> 0.25).")
        elif hhi > 0.15:
            risk_level = "MODERATE"
        else:
            risk_level = "DIVERSIFIED"

        tot_pnl = total_market_value - total_cost_basis
        tot_pnl_pct = (tot_pnl / total_cost_basis * 100.0) if total_cost_basis > 0 else 0.0

        return PortfolioAnalytics(
            base_currency=base_ccy,
            total_market_value=round(total_market_value, 2),
            total_cost_basis=round(total_cost_basis, 2),
            total_unrealized_pnl=round(tot_pnl, 2),
            total_unrealized_pnl_percent=round(tot_pnl_pct, 2),
            herfindahl_index=round(hhi, 4),
            concentration_risk_level=risk_level,
            risk_warnings=warnings,
            positions=sorted(positions, key=lambda p: p.market_value, reverse=True)
        )

portfolio_service = PortfolioManagementService()
