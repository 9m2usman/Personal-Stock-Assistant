"""
Institutional Portfolio Scenario & Reallocation Engine
Simulates multi-leg hypothetical buy/sell rebalancing, proceeds allocation,
cash adjustments, concentration shifts (HHI), and risk observations.
"""
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
import re
from pydantic import BaseModel, Field

from src.backend.services.portfolio_service import (
    portfolio_service,
    EvaluatedPosition,
    PortfolioAnalytics
)
from src.backend.services.market_service import market_service
from src.backend.services.instrument_service import instrument_service
from src.backend.core.logging import logger

class SellOrder(BaseModel):
    """Specification of a position to sell in a hypothetical reallocation."""
    symbol: str
    sell_all: bool = True
    quantity: Optional[float] = None
    percent: Optional[float] = None  # e.g. 50.0 for 50%

class BuyOrder(BaseModel):
    """Specification of an instrument to purchase with proceeds or injected cash."""
    symbol: str
    allocation_percent: Optional[float] = None  # e.g. 60.0 for 60% of proceeds
    target_amount: Optional[float] = None       # e.g. $5,000 fixed
    target_shares: Optional[float] = None       # e.g. 10 shares

class TransactionDetail(BaseModel):
    """Record of a simulated execution transaction."""
    action: str  # SELL or BUY
    symbol: str
    company_name: str
    shares: float
    price: float
    total_amount: float
    currency: str

class PositionSnapshot(BaseModel):
    """Portfolio position state before or after simulation."""
    symbol: str
    company_name: str
    quantity: float
    market_price: float
    market_value: float
    weight_percent: float
    currency: str
    sector: Optional[str] = "N/A"

class ComprehensiveScenarioResult(BaseModel):
    """Full quantitative output of a hypothetical reallocation scenario."""
    before_nav: float
    after_nav: float
    nav_change: float
    nav_change_percent: float
    before_cash: float
    after_cash: float
    total_sale_proceeds: float
    total_purchase_cost: float
    transactions: List[TransactionDetail]
    current_positions: List[PositionSnapshot]
    hypothetical_positions: List[PositionSnapshot]
    before_hhi: float
    after_hhi: float
    hhi_delta: float
    before_sector_allocation: Dict[str, float]
    after_sector_allocation: Dict[str, float]
    risk_observations: List[str]
    assumptions: List[str]
    timestamp_utc: str

class ScenarioParameter(BaseModel):
    market_shock_percent: float = 0.0          # e.g. -10.0 for -10% market crash
    capital_injection: float = 0.0             # e.g. +$10,000 cash added
    reallocations: Dict[str, float] = {}       # e.g. {"NVDA": 5000.0, "AAPL": -2000.0}

class SimulatedPosition(BaseModel):
    symbol: str
    original_value: float
    simulated_value: float
    value_change: float
    new_weight_percent: float

class ScenarioSimulationResult(BaseModel):
    original_total_value: float
    simulated_total_value: float
    total_value_change: float
    total_value_change_percent: float
    original_hhi: float
    simulated_hhi: float
    simulated_positions: List[SimulatedPosition]

class PortfolioScenarioEngine:
    """Institutional mathematical engine for portfolio what-if rebalancing."""

    @staticmethod
    def simulate_scenario(
        current_analytics: PortfolioAnalytics,
        scenario: ScenarioParameter
    ) -> ScenarioSimulationResult:
        """Backwards-compatible legacy market shock simulator."""
        orig_total = current_analytics.total_market_value
        shock_mult = 1.0 + (scenario.market_shock_percent / 100.0)

        sim_positions: List[SimulatedPosition] = []
        new_total_value = 0.0

        for pos in current_analytics.positions:
            orig_val = pos.market_value
            shocked_val = orig_val * shock_mult
            realloc = scenario.reallocations.get(pos.symbol.upper(), 0.0)
            final_pos_val = max(0.0, shocked_val + realloc)
            new_total_value += final_pos_val

            sim_positions.append(SimulatedPosition(
                symbol=pos.symbol,
                original_value=round(orig_val, 2),
                simulated_value=round(final_pos_val, 2),
                value_change=round(final_pos_val - orig_val, 2),
                new_weight_percent=0.0
            ))

        new_total_value += scenario.capital_injection
        new_hhi = 0.0
        for sp in sim_positions:
            w = (sp.simulated_value / new_total_value) if new_total_value > 0 else 0.0
            sp.new_weight_percent = round(w * 100.0, 2)
            new_hhi += (w ** 2)

        tot_change = new_total_value - orig_total
        tot_change_pct = (tot_change / orig_total * 100.0) if orig_total > 0 else 0.0

        return ScenarioSimulationResult(
            original_total_value=round(orig_total, 2),
            simulated_total_value=round(new_total_value, 2),
            total_value_change=round(tot_change, 2),
            total_value_change_percent=round(tot_change_pct, 2),
            original_hhi=current_analytics.herfindahl_index,
            simulated_hhi=round(new_hhi, 4),
            simulated_positions=sim_positions
        )

    async def execute_reallocation_scenario(
        self,
        current_analytics: PortfolioAnalytics,
        sells: List[SellOrder],
        buys: List[BuyOrder],
        capital_injection: float = 0.0
    ) -> ComprehensiveScenarioResult:
        """
        Executes a rigorous mathematical reallocation scenario.
        1. Evaluates existing holdings.
        2. Calculates net sale proceeds at latest market quotes.
        3. Deploys capital into buy legs based on exact percentage or dollar weights.
        4. Recalculates before/after NAV, cash, weights, sector exposure, and HHI.
        """
        # 1. Index current holdings
        holdings_by_symbol: Dict[str, EvaluatedPosition] = {
            pos.symbol.upper(): pos for pos in current_analytics.positions
        }

        # Collect all involved symbols to fetch live quotes
        all_symbols = set(holdings_by_symbol.keys())
        for s in sells:
            all_symbols.add(s.symbol.upper())
        for b in buys:
            all_symbols.add(b.symbol.upper())

        # Fetch latest quotes for all involved symbols concurrently
        quotes: Dict[str, float] = {}
        for sym in all_symbols:
            try:
                q = await market_service.get_realtime_quote(sym)
                quotes[sym] = float(q.price)
            except Exception as e:
                # Fallback to evaluated position price if available
                if sym in holdings_by_symbol:
                    quotes[sym] = holdings_by_symbol[sym].current_price
                else:
                    logger.warning("Could not fetch price for %s, using baseline 100.0: %s", sym, e)
                    quotes[sym] = 100.0

        # Build current position snapshots
        current_snapshots: List[PositionSnapshot] = []
        orig_nav = current_analytics.total_market_value
        initial_cash = 0.0  # Can be expanded if cash position is tracked

        for pos in current_analytics.positions:
            p_inst = instrument_service.get_by_symbol(pos.symbol)
            c_name = p_inst.company_name if p_inst else pos.symbol
            c_curr = pos.reported_currency if hasattr(pos, "reported_currency") else "USD"
            c_shares = pos.quantity if hasattr(pos, "quantity") else getattr(pos, "shares", 0.0)
            current_snapshots.append(PositionSnapshot(
                symbol=pos.symbol,
                company_name=c_name,
                quantity=round(float(c_shares), 4),
                market_price=round(float(pos.current_price), 2),
                market_value=round(float(pos.market_value), 2),
                weight_percent=round(float(pos.weight_percent), 2),
                currency=c_curr,
                sector=p_inst.sector if p_inst and p_inst.sector else "Equities"
            ))

        # 2. Process Sells
        simulated_shares: Dict[str, float] = {
            sym: (pos.quantity if hasattr(pos, "quantity") else getattr(pos, "shares", 0.0)) for sym, pos in holdings_by_symbol.items()
        }
        transactions: List[TransactionDetail] = []
        total_proceeds = 0.0

        for s in sells:
            sym = s.symbol.upper()
            curr_pos = holdings_by_symbol.get(sym)
            if not curr_pos:
                continue

            available_shares = simulated_shares.get(sym, 0.0)
            if available_shares <= 0:
                continue

            # Determine shares to sell
            if s.sell_all:
                shares_to_sell = available_shares
            elif s.percent is not None:
                shares_to_sell = available_shares * (min(100.0, max(0.0, s.percent)) / 100.0)
            elif s.quantity is not None:
                shares_to_sell = min(available_shares, max(0.0, s.quantity))
            else:
                shares_to_sell = available_shares

            price = quotes.get(sym, curr_pos.current_price)
            amount = shares_to_sell * price
            total_proceeds += amount
            simulated_shares[sym] = max(0.0, simulated_shares[sym] - shares_to_sell)

            c_inst = instrument_service.get_by_symbol(sym)
            c_name = c_inst.company_name if c_inst else sym
            c_curr = curr_pos.reported_currency if hasattr(curr_pos, "reported_currency") else "USD"

            transactions.append(TransactionDetail(
                action="SELL",
                symbol=sym,
                company_name=c_name,
                shares=round(shares_to_sell, 4),
                price=round(price, 2),
                total_amount=round(amount, 2),
                currency=c_curr
            ))

        # 3. Process Buys
        deployable_cash = total_proceeds + capital_injection
        total_deployed = 0.0

        # Normalize buy allocation percentages if provided
        pct_buys = [b for b in buys if b.allocation_percent is not None]
        fixed_buys = [b for b in buys if b.target_amount is not None or b.target_shares is not None]

        # If buys have no explicit allocations, split deployable cash equally
        if buys and not pct_buys and not fixed_buys:
            equal_pct = 100.0 / len(buys)
            for b in buys:
                b.allocation_percent = equal_pct
            pct_buys = list(buys)

        # Execute fixed buys first
        for b in fixed_buys:
            sym = b.symbol.upper()
            price = quotes.get(sym, 100.0)
            if b.target_amount:
                spend = min(deployable_cash - total_deployed, b.target_amount)
                shares_bought = spend / price if price > 0 else 0.0
            elif b.target_shares:
                needed = b.target_shares * price
                spend = min(deployable_cash - total_deployed, needed)
                shares_bought = spend / price if price > 0 else 0.0
            else:
                continue

            total_deployed += spend
            simulated_shares[sym] = simulated_shares.get(sym, 0.0) + shares_bought
            b_inst = instrument_service.get_by_symbol(sym)
            c_name = b_inst.company_name if b_inst else sym

            transactions.append(TransactionDetail(
                action="BUY",
                symbol=sym,
                company_name=c_name,
                shares=round(shares_bought, 4),
                price=round(price, 2),
                total_amount=round(spend, 2),
                currency="USD"
            ))

        # Execute percentage buys with remaining deployable cash
        cash_for_pct = max(0.0, deployable_cash - total_deployed)
        total_pct = sum(b.allocation_percent for b in pct_buys if b.allocation_percent)
        if total_pct > 0 and cash_for_pct > 0:
            for b in pct_buys:
                norm_weight = b.allocation_percent / total_pct
                spend = cash_for_pct * norm_weight
                sym = b.symbol.upper()
                price = quotes.get(sym, 100.0)
                shares_bought = spend / price if price > 0 else 0.0

                total_deployed += spend
                simulated_shares[sym] = simulated_shares.get(sym, 0.0) + shares_bought
                b_inst = instrument_service.get_by_symbol(sym)
                c_name = b_inst.company_name if b_inst else sym

                transactions.append(TransactionDetail(
                    action="BUY",
                    symbol=sym,
                    company_name=c_name,
                    shares=round(shares_bought, 4),
                    price=round(price, 2),
                    total_amount=round(spend, 2),
                    currency="USD"
                ))

        remaining_cash = max(0.0, deployable_cash - total_deployed)

        # 4. Construct Hypothetical Portfolio Snapshots & Metrics
        hypo_snapshots: List[PositionSnapshot] = []
        new_total_equity = 0.0

        for sym, qty in simulated_shares.items():
            if qty > 0.0001:
                price = quotes.get(sym, 100.0)
                mval = qty * price
                new_total_equity += mval

                inst = instrument_service.get_by_symbol(sym)
                c_name = inst.company_name if inst else sym
                sec = inst.sector if inst and inst.sector else "Equities"

                hypo_snapshots.append(PositionSnapshot(
                    symbol=sym,
                    company_name=c_name,
                    quantity=round(qty, 4),
                    market_price=round(price, 2),
                    market_value=round(mval, 2),
                    weight_percent=0.0,  # Computed below
                    currency=inst.currency if inst else "USD",
                    sector=sec
                ))

        new_nav = new_total_equity + remaining_cash
        after_hhi = 0.0
        before_sector: Dict[str, float] = {}
        after_sector: Dict[str, float] = {}

        # Compute new weights and HHI
        for hp in hypo_snapshots:
            w = (hp.market_value / new_nav) if new_nav > 0 else 0.0
            hp.weight_percent = round(w * 100.0, 2)
            after_hhi += (w ** 2)
            after_sector[hp.sector] = round(after_sector.get(hp.sector, 0.0) + hp.weight_percent, 2)

        # Compute original sector distribution
        for cp in current_snapshots:
            before_sector[cp.sector] = round(before_sector.get(cp.sector, 0.0) + cp.weight_percent, 2)

        before_hhi = current_analytics.herfindahl_index
        hhi_delta = after_hhi - before_hhi

        # Formulate risk observations
        risk_obs = []
        if hhi_delta > 0.05:
            risk_obs.append(f"Concentration Risk Increased: HHI rose by +{hhi_delta:.4f} (from {before_hhi:.4f} to {after_hhi:.4f}).")
        elif hhi_delta < -0.05:
            risk_obs.append(f"Diversification Benefit: HHI reduced by {abs(hhi_delta):.4f} (from {before_hhi:.4f} to {after_hhi:.4f}).")
        else:
            risk_obs.append(f"Concentration Neutral: Portfolio HHI changed negligibly ({hhi_delta:+.4f}).")

        # Top holding risk check
        top_pos = max(hypo_snapshots, key=lambda p: p.weight_percent, default=None)
        if top_pos and top_pos.weight_percent >= 40.0:
            risk_obs.append(f"Single-Stock Overexposure: {top_pos.symbol} represents {top_pos.weight_percent:.1f}% of total portfolio value.")

        if remaining_cash > 1.0:
            risk_obs.append(f"Unallocated Cash: ${remaining_cash:,.2f} remains in cash reserves.")

        assumptions = [
            "All market executions calculated using latest available snapshot prices.",
            "Transaction fees, exchange commissions, and slippage are excluded.",
            "Capital gains taxes and dividend withholding taxes are excluded.",
            "Hypothetical simulation for decision support only. No brokerage orders were executed."
        ]

        nav_change = new_nav - orig_nav
        nav_pct = (nav_change / orig_nav * 100.0) if orig_nav > 0 else 0.0

        return ComprehensiveScenarioResult(
            before_nav=round(orig_nav, 2),
            after_nav=round(new_nav, 2),
            nav_change=round(nav_change, 2),
            nav_change_percent=round(nav_pct, 2),
            before_cash=round(initial_cash, 2),
            after_cash=round(remaining_cash, 2),
            total_sale_proceeds=round(total_proceeds, 2),
            total_purchase_cost=round(total_deployed, 2),
            transactions=transactions,
            current_positions=current_snapshots,
            hypothetical_positions=hypo_snapshots,
            before_hhi=round(before_hhi, 4),
            after_hhi=round(after_hhi, 4),
            hhi_delta=round(hhi_delta, 4),
            before_sector_allocation=before_sector,
            after_sector_allocation=after_sector,
            risk_observations=risk_obs,
            assumptions=assumptions,
            timestamp_utc=datetime.now(timezone.utc).isoformat()
        )

    @staticmethod
    def parse_natural_language_scenario(
        text: str,
        available_symbols: Optional[List[str]] = None
    ) -> Tuple[List[SellOrder], List[BuyOrder], float]:
        """
        Parses natural language prompts into structured sell/buy orders and capital injections.
        Example: "If I sell my Tesla holdings and invest 60% of the proceeds in NVIDIA and 40% in AMD"
        """
        lower = text.lower()
        sells: List[SellOrder] = []
        buys: List[BuyOrder] = []
        injection = 0.0

        # Detect capital injection: e.g. "$5,000", "5000 dollars"
        inj_match = re.search(r'(?:invest|add|deposit)\s+(?:another\s+)?\$?([0-9,]+(?:\.[0-9]{2})?)', lower)
        if inj_match:
            try:
                injection = float(inj_match.group(1).replace(",", ""))
            except Exception:
                injection = 0.0

        # Company mapping
        name_map = {
            "tesla": "TSLA", "tsla": "TSLA",
            "nvidia": "NVDA", "nvda": "NVDA",
            "apple": "AAPL", "aapl": "AAPL",
            "amd": "AMD", "advanced micro devices": "AMD",
            "microsoft": "MSFT", "msft": "MSFT",
            "amazon": "AMZN", "amzn": "AMZN",
            "meta": "META", "google": "GOOGL", "alphabet": "GOOGL",
            "hsbc": "HSBA.L", "toyota": "TM", "nestle": "NESN.SW"
        }

        # 1. Detect Sells: "sell (all|some|\d+%)? (of )?(my )?(\w+)"
        sell_patterns = [
            r'sell\s+(?:all\s+)?(?:of\s+)?(?:my\s+)?([a-z0-9\.\-]+)\s+(?:shares|holdings|stock)',
            r'sell\s+([0-9]+)%\s+(?:of\s+)?(?:my\s+)?([a-z0-9\.\-]+)',
            r'sell\s+([a-z0-9\.\-]+)'
        ]

        for pat in sell_patterns:
            matches = re.finditer(pat, lower)
            for m in matches:
                groups = m.groups()
                if len(groups) == 1:
                    raw_sym = groups[0]
                    resolved = name_map.get(raw_sym, raw_sym.upper())
                    if resolved and not any(s.symbol == resolved for s in sells):
                        sells.append(SellOrder(symbol=resolved, sell_all=True))
                elif len(groups) == 2:
                    pct_val, raw_sym = groups
                    resolved = name_map.get(raw_sym, raw_sym.upper())
                    try:
                        pct = float(pct_val)
                    except Exception:
                        pct = 100.0
                    if resolved and not any(s.symbol == resolved for s in sells):
                        sells.append(SellOrder(symbol=resolved, sell_all=(pct >= 100.0), percent=pct))

        # 2. Detect Buys: e.g. "buy nvidia and amd", "invest 60% in nvidia and 40% in amd"
        pct_buy_pattern = r'([0-9]+)%\s+(?:of\s+(?:the\s+)?proceeds\s+)?(?:in|into)\s+([a-z0-9\.\-]+)'
        pct_matches = list(re.finditer(pct_buy_pattern, lower))

        if pct_matches:
            for m in pct_matches:
                pct_str, raw_sym = m.groups()
                resolved = name_map.get(raw_sym, raw_sym.upper())
                try:
                    pct = float(pct_str)
                except Exception:
                    pct = 50.0
                buys.append(BuyOrder(symbol=resolved, allocation_percent=pct))
        else:
            # General buy pattern: "buy nvidia and amd"
            buy_match = re.search(r'buy\s+([a-z0-9\.\-\s,]+)', lower)
            if buy_match:
                buy_chunk = buy_match.group(1)
                tokens = re.split(r'[,and\s]+', buy_chunk)
                for tok in tokens:
                    tok_clean = tok.strip()
                    if tok_clean in name_map:
                        resolved = name_map[tok_clean]
                        if not any(b.symbol == resolved for b in buys):
                            buys.append(BuyOrder(symbol=resolved))
                    elif tok_clean.upper() in ["NVDA", "AAPL", "MSFT", "AMZN", "AMD", "TSLA", "META", "GOOGL"]:
                        resolved = tok_clean.upper()
                        if not any(b.symbol == resolved for b in buys):
                            buys.append(BuyOrder(symbol=resolved))

        return sells, buys, injection

scenario_engine = PortfolioScenarioEngine()
scenario_service = scenario_engine
