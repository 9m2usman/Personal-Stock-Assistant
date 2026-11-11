"""
Celery Background Tasks
Executes heavy computations, deep research dossier generation, and batch market scans.
"""
from typing import List, Dict, Any
import asyncio
from decimal import Decimal
from src.backend.workers.celery_app import celery_app
from src.backend.services.market_service import market_service
from src.backend.services.fundamental_service import fundamental_service
from src.backend.data_ingestion.router import financial_router
from src.backend.core.logging import logger

def _run_async(coro):
    """Helper to run async coroutines inside synchronous Celery worker tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_running():
        # In nested event loop scenarios, run via a new loop in runner
        import nest_asyncio
        nest_asyncio.apply()
        return loop.run_until_complete(coro)
    return loop.run_until_complete(coro)

@celery_app.task(bind=True, name="tasks.ping_system")
def ping_system(self, payload: str = "ping") -> Dict[str, Any]:
    """Test verification task verifying Redis message queue and worker execution."""
    logger.info("Executing Celery ping_system test task (ID: %s, payload: %s)", self.request.id, payload)
    return {
        "task_id": self.request.id,
        "echo": payload,
        "status": "SUCCESS",
        "worker_verified": True
    }

@celery_app.task(bind=True, name="tasks.sync_catalog_task")
def sync_catalog_task(self, source: str = "curated") -> Dict[str, Any]:
    """Background task to synchronize global stock catalog from SEC EDGAR or curated universe."""
    logger.info("Starting background catalog synchronization from source: %s", source)
    from src.backend.services.catalog_sync_service import catalog_sync_service
    if source == "sec_edgar":
        count = _run_async(catalog_sync_service.sync_sec_edgar_tickers(max_records=2500))
    else:
        count = _run_async(catalog_sync_service.sync_curated_universe())
    stats = _run_async(catalog_sync_service.get_catalogue_statistics())
    return {
        "task_id": self.request.id,
        "source": source,
        "ingested_count": count,
        "stats": stats,
        "status": "COMPLETED"
    }

@celery_app.task(bind=True, name="tasks.generate_deep_research_report")
def generate_deep_research_report(self, symbol: str) -> Dict[str, Any]:
    """Compiles a comprehensive institutional research report for an equity."""
    logger.info("Starting deep research report task for %s (Task ID: %s)...", symbol, self.request.id)
    self.update_state(state="STARTED", meta={"progress": 10, "status": "Fetching quote & technicals"})

    async def _gather():
        # 1. Market summary
        summary = await market_service.get_market_summary(symbol)
        # 2. Fundamentals & Ratios
        fundamentals = await fundamental_service.get_fundamentals(symbol)
        # 3. News Articles
        news = await financial_router.search_news(symbol, limit=5)
        return summary, fundamentals, news

    summary, fundamentals, news = _run_async(_gather())

    report = {
        "symbol": symbol.upper(),
        "task_id": self.request.id,
        "company_name": fundamentals.profile.company_name,
        "exchange": fundamentals.profile.exchange,
        "sector": fundamentals.profile.sector,
        "market_price": float(summary.quote.price),
        "currency": summary.quote.currency,
        "technical_summary": {
            "sma_50": float(summary.technical_indicators.sma_50) if summary.technical_indicators and summary.technical_indicators.sma_50 else None,
            "rsi_14": float(summary.technical_indicators.rsi_14) if summary.technical_indicators and summary.technical_indicators.rsi_14 else None,
            "annualized_volatility": float(summary.technical_indicators.annualized_volatility) if summary.technical_indicators and summary.technical_indicators.annualized_volatility else None
        },
        "valuation_ratios": {
            "pe_ratio": float(fundamentals.ratios.pe_ratio) if fundamentals.ratios.pe_ratio else None,
            "gross_margin": float(fundamentals.ratios.gross_margin_percent) if fundamentals.ratios.gross_margin_percent else None,
            "net_margin": float(fundamentals.ratios.net_margin_percent) if fundamentals.ratios.net_margin_percent else None,
            "roe": float(fundamentals.ratios.return_on_equity_percent) if fundamentals.ratios.return_on_equity_percent else None,
            "debt_to_equity": float(fundamentals.ratios.debt_to_equity_ratio) if fundamentals.ratios.debt_to_equity_ratio else None,
            "free_cash_flow": float(fundamentals.ratios.free_cash_flow) if fundamentals.ratios.free_cash_flow else None
        },
        "recent_news_count": len(news),
        "status": "COMPLETED"
    }

    logger.info("Deep research report completed for %s.", symbol)
    return report

@celery_app.task(bind=True, name="tasks.batch_fetch_market_quotes")
def batch_fetch_market_quotes(self, symbols: List[str]) -> Dict[str, Any]:
    """Fetches quotes for multiple ticker symbols in parallel."""
    logger.info("Executing batch quote fetch for %s symbols (Task ID: %s)...", len(symbols), self.request.id)

    async def _fetch_all():
        results = {}
        for sym in symbols:
            try:
                q = await market_service.get_realtime_quote(sym)
                results[sym.upper()] = {
                    "price": float(q.price),
                    "change": float(q.change) if q.change else 0.0,
                    "change_percent": float(q.change_percent) if q.change_percent else 0.0,
                    "currency": q.currency,
                    "provider": q.provider
                }
            except Exception as e:
                results[sym.upper()] = {"error": str(e)}
        return results

    quotes = _run_async(_fetch_all())
    return {
        "task_id": self.request.id,
        "total_requested": len(symbols),
        "quotes": quotes
    }

@celery_app.task(bind=True, name="tasks.rebalance_portfolio_simulation")
def rebalance_portfolio_simulation(
    self,
    current_holdings: List[Dict[str, Any]],
    target_weights: Dict[str, float]
) -> Dict[str, Any]:
    """Calculates capital re-allocation deltas and estimated turnover."""
    total_value = sum(float(h.get("market_value", 0.0)) for h in current_holdings)
    if total_value <= 0:
        return {"error": "Portfolio has zero or negative total market value."}

    adjustments = []
    total_reallocation = 0.0

    for sym, target_w in target_weights.items():
        sym_upper = sym.upper()
        # Find current holding
        curr_val = 0.0
        for h in current_holdings:
            if h.get("symbol", "").upper() == sym_upper:
                curr_val = float(h.get("market_value", 0.0))
                break

        curr_weight = curr_val / total_value
        target_val = total_value * target_w
        delta_val = target_val - curr_val
        total_reallocation += abs(delta_val)

        adjustments.append({
            "symbol": sym_upper,
            "current_weight": round(curr_weight, 4),
            "target_weight": round(target_w, 4),
            "current_value": round(curr_val, 2),
            "target_value": round(target_val, 2),
            "delta_capital": round(delta_val, 2),
            "action": "BUY" if delta_val > 0 else ("SELL" if delta_val < 0 else "HOLD")
        })

    turnover_ratio = (total_reallocation / 2.0) / total_value

    return {
        "task_id": self.request.id,
        "total_portfolio_value": round(total_value, 2),
        "turnover_ratio": round(turnover_ratio, 4),
        "rebalance_plan": adjustments
    }
