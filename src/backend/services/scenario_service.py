"""
Scenario & What-If Stress Testing Service
Simulates broad market shocks, hypothetical capital additions, and portfolio reallocations.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from src.backend.services.portfolio_service import EvaluatedPosition, PortfolioAnalytics

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

class ScenarioAnalysisService:
    """Computes what-if simulations and stress test impacts."""

    @staticmethod
    def simulate_scenario(
        current_analytics: PortfolioAnalytics,
        scenario: ScenarioParameter
    ) -> ScenarioSimulationResult:
        """Applies market shocks and hypothetical re-allocations to project future portfolio dynamics."""
        orig_total = current_analytics.total_market_value
        shock_mult = 1.0 + (scenario.market_shock_percent / 100.0)

        sim_positions: List[SimulatedPosition] = []
        new_total_value = 0.0

        for pos in current_analytics.positions:
            orig_val = pos.market_value
            # Apply market shock
            shocked_val = orig_val * shock_mult

            # Apply custom capital re-allocation if specified
            realloc = scenario.reallocations.get(pos.symbol.upper(), 0.0)
            final_pos_val = max(0.0, shocked_val + realloc)

            new_total_value += final_pos_val

            sim_positions.append(SimulatedPosition(
                symbol=pos.symbol,
                original_value=round(orig_val, 2),
                simulated_value=round(final_pos_val, 2),
                value_change=round(final_pos_val - orig_val, 2),
                new_weight_percent=0.0  # Computed next
            ))

        # Add unallocated injected cash if any
        new_total_value += scenario.capital_injection

        # Compute new allocation weights and new HHI
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

scenario_service = ScenarioAnalysisService()
