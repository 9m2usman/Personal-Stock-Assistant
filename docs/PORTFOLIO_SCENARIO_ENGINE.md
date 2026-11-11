# INKVECTOR — Institutional Portfolio Scenario & Reallocation Engine

## 1. Engine Purpose

The **INKVECTOR Portfolio Scenario Engine** (`src/backend/services/scenario_service.py`) provides institutional portfolio managers and retail investors with a mathematical decision-support simulation environment.

It answers the quintessential investment question:
> *"If I sell an existing holding (e.g., TSLA) and allocate 60% of the proceeds into NVIDIA and 40% into AMD, what happens to my overall portfolio Net Asset Value (NAV), cash balance, sector exposure, and concentration risk?"*

---

## 2. Mathematical Modeling & Formulas

### 2.1 Sale Proceeds Calculation
For each sell leg $i \in \text{Sells}$:
$$\text{Shares Sold}_i = 
\begin{cases} 
\text{Available Shares}_i & \text{if Sell All} \\
\text{Available Shares}_i \times \frac{\text{Percent}_i}{100} & \text{if Percentage} \\
\min(\text{Available Shares}_i, \text{Quantity}_i) & \text{if Fixed Shares}
\end{cases}$$

$$\text{Gross Proceeds} = \sum_{i} \left( \text{Shares Sold}_i \times P_i^{\text{market}} \right)$$

$$\text{Deployable Capital} = \text{Gross Proceeds} + \text{Capital Injection}$$

---

### 2.2 Target Equity Deployment
For each buy leg $j \in \text{Buys}$ with allocation weight $w_j$ where $\sum w_j = 1.0$:
$$\text{Capital Deployed}_j = \text{Deployable Capital} \times w_j$$

$$\text{Shares Purchased}_j = \frac{\text{Capital Deployed}_j}{P_j^{\text{market}}}$$

$$\text{Remaining Cash} = \text{Deployable Capital} - \sum_{j} \text{Capital Deployed}_j$$

---

### 2.3 Herfindahl-Hirschman Concentration Index (HHI)
Concentration risk is evaluated across all active positions $k = 1, \dots, N$:
$$s_k = \frac{\text{Market Value}_k}{\text{Total NAV}}$$

$$\text{HHI} = \sum_{k=1}^{N} s_k^2$$

$$\Delta \text{HHI} = \text{HHI}_{\text{simulated}} - \text{HHI}_{\text{baseline}}$$

- **HHI < 0.15:** Diversified portfolio.
- **0.15 ≤ HHI ≤ 0.25:** Moderately concentrated.
- **HHI > 0.25:** High concentration risk.

---

## 3. End-to-End Simulation Data Structures

```python
class ComprehensiveScenarioResult(BaseModel):
    before_nav: float                   # Baseline Portfolio NAV ($)
    after_nav: float                    # Simulated Portfolio NAV ($)
    nav_change: float                   # Absolute Net NAV Delta ($)
    nav_change_percent: float           # Percentage NAV Delta (%)
    before_cash: float                  # Starting portfolio cash
    after_cash: float                   # Post-reallocation cash remainder
    total_sale_proceeds: float          # Gross proceeds generated from sells
    total_purchase_cost: float          # Total capital deployed into buys
    transactions: List[TransactionDetail] # Itemized transaction receipts
    current_positions: List[PositionSnapshot]      # Baseline holdings
    hypothetical_positions: List[PositionSnapshot] # Post-reallocation holdings
    before_hhi: float                   # Starting Herfindahl Index
    after_hhi: float                    # Projected Herfindahl Index
    hhi_delta: float                    # Shift in portfolio concentration
    risk_observations: List[str]        # Quantitative risk insights
    assumptions: List[str]              # Explicit modeling assumptions
    timestamp_utc: str                  # Execution timestamp
```

---

## 4. Regulatory & Execution Disclosures

The engine adheres to strict regulatory and compliance guidelines:
1. **Hypothetical Simulation:** No real brokerage orders are placed; all trade executions exist solely in memory for decision modeling.
2. **Exclusions:** Taxes (capital gains), transaction slippage, and broker execution fees are excluded by default.
3. **Mandatory Disclaimer:** Displayed prominently on the UI and in API response payloads:
   > *"Hypothetical simulation for decision-support purposes only. No actual trade has been placed. Taxes, slippage, and brokerage commissions are excluded."*
