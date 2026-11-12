"""
AI Financial Research Assistant - Modular Orchestrator
Coordinates conversation context, intent identification, instrument resolution,
policy permission validation, tool execution, multi-company comparisons,
portfolio reallocation scenarios, and institutional response synthesis.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import time
import asyncio

from src.backend.ai.context import (
    ChatMessage,
    ChatResponse,
    UIWidget,
    ConversationContext,
    conversation_manager
)
from src.backend.ai.intent import intent_classifier, FinancialIntent
from src.backend.ai.tools.registry import tool_registry
from src.backend.ai.policy import policy_engine, PolicyViolationError
from src.backend.services.instrument_service import instrument_service
from src.backend.services.scenario_service import scenario_engine
from src.backend.ai.groq_service import groq_service
from src.backend.core.config import settings
from src.backend.core.logging import logger

class AIOrchestrator:
    """Institutional-grade financial AI orchestration engine."""

    def __init__(self):
        self.context_manager = conversation_manager
        self.policy = policy_engine
        self.tools = tool_registry

    async def run(
        self,
        session_id: str,
        user_text: str,
        user_id: str = "analyst_session"
    ) -> ChatResponse:
        start_time = time.perf_counter()
        ctx = self.context_manager.get_or_create(session_id, user_id=user_id)

        # 1. Record incoming user message
        user_msg = ChatMessage(
            role="user",
            content=user_text,
            timestamp=datetime.now(timezone.utc)
        )
        ctx.add_message(user_msg)

        # 2. Intent Classification & Entity Extraction
        entities = intent_classifier.classify(user_text)
        intent = entities.intent
        symbols = list(entities.symbols)

        # Context retention: if user didn't mention symbol, check active conversation context
        if not symbols and ctx.current_symbol and intent not in [FinancialIntent.GENERAL_QUERY, FinancialIntent.PORTFOLIO_QUERY]:
            symbols = [ctx.current_symbol]
        elif symbols:
            ctx.set_symbol(symbols[0])

        active_symbol = symbols[0].upper() if symbols else None
        logger.info(
            "Orchestrator [%s] -> Intent: %s, Symbols: %s (Active: %s)",
            session_id, intent, symbols, active_symbol
        )

        widgets: List[UIWidget] = []
        citations: List[str] = []
        tool_executions: List[Dict[str, Any]] = []
        response_text = ""

        try:
            # 3. Dispatch & Tool Execution

            # --- A. Stock Comparison Intent ---
            if intent == FinancialIntent.STOCK_COMPARISON and len(symbols) >= 2:
                sym_a = symbols[0].upper()
                sym_b = symbols[1].upper()
                tool_name = "compare_stocks"
                args = {"symbol_a": sym_a, "symbol_b": sym_b}
                self.policy.validate_tool_permission(user_id, tool_name)

                t0 = time.perf_counter()
                comp_data = await self.tools.execute(tool_name, args)
                tool_executions.append({
                    "tool": tool_name,
                    "args": args,
                    "duration_ms": round((time.perf_counter() - t0) * 1000, 2)
                })

                data_a = comp_data.get("symbol_a", {})
                data_b = comp_data.get("symbol_b", {})
                q_a = data_a.get("quote", {})
                q_b = data_b.get("quote", {})
                r_a = data_a.get("ratios", {})
                r_b = data_b.get("ratios", {})
                t_a = data_a.get("technicals", {})
                if hasattr(t_a, "model_dump"): t_a = t_a.model_dump(mode="json")
                elif not isinstance(t_a, dict): t_a = getattr(t_a, "__dict__", {}) or {}

                t_b = data_b.get("technicals", {})
                if hasattr(t_b, "model_dump"): t_b = t_b.model_dump(mode="json")
                elif not isinstance(t_b, dict): t_b = getattr(t_b, "__dict__", {}) or {}
                s_a = data_a.get("sentiment", {})
                s_b = data_b.get("sentiment", {})

                name_a = data_a.get("profile", {}).get("company_name", sym_a)
                name_b = data_b.get("profile", {}).get("company_name", sym_b)

                # Format financial ratio comparison
                response_text = (
                    f"### Institutional Equity Comparison: **{name_a} ({sym_a})** vs **{name_b} ({sym_b})**\n\n"
                    f"#### 1. Valuation & Financial Ratios\n"
                    f"| Metric | {sym_a} | {sym_b} | Superior Metric |\n"
                    f"| :--- | :--- | :--- | :--- |\n"
                    f"| **Market Price** | `{q_a.get('currency', 'USD')} {q_a.get('price', 'N/A')}` | `{q_b.get('currency', 'USD')} {q_b.get('price', 'N/A')}` | Snapshot |\n"
                    f"| **P/E Ratio** | `{r_a.get('pe_ratio', 'N/A')}` | `{r_b.get('pe_ratio', 'N/A')}` | Lower Multiple |\n"
                    f"| **Gross Margin** | `{r_a.get('gross_margin_percent', 'N/A')}%` | `{r_b.get('gross_margin_percent', 'N/A')}%` | Higher Profitability |\n"
                    f"| **Net Margin** | `{r_a.get('net_margin_percent', 'N/A')}%` | `{r_b.get('net_margin_percent', 'N/A')}%` | Operational Efficiency |\n"
                    f"| **Return on Equity (ROE)** | `{r_a.get('return_on_equity_percent', 'N/A')}%` | `{r_b.get('return_on_equity_percent', 'N/A')}%` | Capital Efficiency |\n"
                    f"| **Debt-to-Equity** | `{r_a.get('debt_to_equity_ratio', 'N/A')}` | `{r_b.get('debt_to_equity_ratio', 'N/A')}` | Balance Sheet Solvency |\n\n"
                    f"#### 2. Quantitative Technical & Momentum Indicators\n"
                    f"| Indicator | {sym_a} | {sym_b} | Trend Assessment |\n"
                    f"| :--- | :--- | :--- | :--- |\n"
                    f"| **14-Day RSI** | `{t_a.get('rsi_14', 'N/A')}` | `{t_b.get('rsi_14', 'N/A')}` | 30-70 Neutral Zone |\n"
                    f"| **50-Day SMA** | `${t_a.get('sma_50', 'N/A')}` | `${t_b.get('sma_50', 'N/A')}` | Medium-Term Trend |\n"
                    f"| **252d Realized Volatility** | `{float(t_a.get('annualized_volatility') or 0)*100:.1f}%` | `{float(t_b.get('annualized_volatility') or 0)*100:.1f}%` | Price Variance Risk |\n\n"
                    f"#### 3. Market News & Sentiment Intelligence\n"
                    f"- **{sym_a}:** Sentiment Score `{s_a.get('sentiment_score', 0.0):+.2f}` ({s_a.get('sentiment_label', 'NEUTRAL')}) across {s_a.get('total_articles_analyzed', 0)} articles.\n"
                    f"- **{sym_b}:** Sentiment Score `{s_b.get('sentiment_score', 0.0):+.2f}` ({s_b.get('sentiment_label', 'NEUTRAL')}) across {s_b.get('total_articles_analyzed', 0)} articles.\n\n"
                    f"#### Decision-Support Conclusion\n"
                    f"Evidence indicates **{sym_a}** and **{sym_b}** exhibit distinct strategic profiles: "
                    f"if your mandate prioritizes margin durability and ROE quality, compare the gross margins above; "
                    f"if seeking price momentum or valuation discount, review the P/E and RSI levels. "
                    f"*Note: Calculations use live market snapshots. This analysis is decision support and does not constitute a guaranteed return.*"
                )

                widgets.append(UIWidget(
                    widget_type="COMPARISON_MATRIX",
                    title=f"{sym_a} vs {sym_b} Head-to-Head Comparison",
                    data=comp_data
                ))
                citations.append(f"Multi-provider comparative engine on {q_a.get('provider', 'Market Feed')} & {q_b.get('provider', 'Market Feed')}")

            # --- B. Buy/Sell Scenario Simulation Intent ---
            elif intent == FinancialIntent.SCENARIO_SIMULATION:
                sells, buys, injection = scenario_engine.parse_natural_language_scenario(user_text)

                # Fallback if parser couldn't find symbols in text
                if not sells and active_symbol:
                    sells = [{"symbol": active_symbol, "sell_all": True}]
                if not buys and len(symbols) >= 2:
                    buys = [{"symbol": sym} for sym in symbols[1:]]

                tool_name = "simulate_portfolio_reallocation"
                args = {
                    "sells": [s.model_dump() if hasattr(s, "model_dump") else s for s in sells],
                    "buys": [b.model_dump() if hasattr(b, "model_dump") else b for b in buys],
                    "capital_injection": injection
                }
                self.policy.validate_tool_permission(user_id, tool_name)

                t0 = time.perf_counter()
                scen_data = await self.tools.execute(tool_name, args)
                tool_executions.append({
                    "tool": tool_name,
                    "args": args,
                    "duration_ms": round((time.perf_counter() - t0) * 1000, 2)
                })

                txs = scen_data.get("transactions", [])
                tx_lines = ""
                for t in txs:
                    tx_lines += f"- **{t.get('action')} {t.get('shares'):,.2f} shares of {t.get('symbol')}** @ ${t.get('price'):,.2f} = `${t.get('total_amount'):,.2f}`\n"

                risk_lines = "\n".join([f"- {r}" for r in scen_data.get("risk_observations", [])])
                assump_lines = "\n".join([f"- {a}" for r in scen_data.get("assumptions", []) for a in [r]])

                response_text = (
                    f"### Hypothetical Portfolio Reallocation Report\n\n"
                    f"Here is your simulated reallocation based on latest live market snapshots:\n\n"
                    f"#### 1. Capital & NAV Summary\n"
                    f"| Metric | Current Portfolio | Hypothetical Rebalanced | Net Delta |\n"
                    f"| :--- | :--- | :--- | :--- |\n"
                    f"| **Portfolio NAV** | `${scen_data.get('before_nav', 0.0):,.2f}` | `${scen_data.get('after_nav', 0.0):,.2f}` | `${scen_data.get('nav_change', 0.0):+,.2f}` ({scen_data.get('nav_change_percent', 0.0):+.2f}%) |\n"
                    f"| **Cash Reserves** | `${scen_data.get('before_cash', 0.0):,.2f}` | `${scen_data.get('after_cash', 0.0):,.2f}` | `${scen_data.get('total_sale_proceeds', 0.0) - scen_data.get('total_purchase_cost', 0.0):+,.2f}` |\n"
                    f"| **Herfindahl Index (HHI)** | `{scen_data.get('before_hhi', 0.0):.4f}` | `{scen_data.get('after_hhi', 0.0):.4f}` | `{scen_data.get('hhi_delta', 0.0):+.4f}` |\n\n"
                    f"#### 2. Executed Reallocation Transactions\n"
                    f"{tx_lines}\n"
                    f"- **Total Sale Proceeds:** `${scen_data.get('total_sale_proceeds', 0.0):,.2f}`\n"
                    f"- **Total Capital Deployed:** `${scen_data.get('total_purchase_cost', 0.0):,.2f}`\n"
                    f"- **Remaining Unallocated Cash:** `${scen_data.get('after_cash', 0.0):,.2f}`\n\n"
                    f"#### 3. Risk Observations & Concentration\n"
                    f"{risk_lines}\n\n"
                    f"#### 4. Compliance & Simulation Assumptions\n"
                    f"{assump_lines}\n"
                )

                widgets.append(UIWidget(
                    widget_type="SCENARIO_SIMULATION",
                    title="Hypothetical Reallocation Result",
                    data=scen_data
                ))
                citations.append("Real-time portfolio scenario simulator & mathematical rebalancing engine")

            # --- C. Technical Analysis Intent ---
            elif intent == FinancialIntent.TECHNICAL_ANALYSIS and active_symbol:
                tool_name = "get_technical_analysis"
                args = {"symbol": active_symbol, "limit": 100}
                self.policy.validate_tool_permission(user_id, tool_name)
                args = self.policy.validate_and_sanitize_arguments(tool_name, args)

                t0 = time.perf_counter()
                tech_data = await self.tools.execute(tool_name, args)
                tool_executions.append({"tool": tool_name, "args": args, "duration_ms": round((time.perf_counter() - t0) * 1000, 2)})

                latest = tech_data.get("latest_indicators", {})
                candlesticks = tech_data.get("candlesticks", [])

                rsi_val = latest.get("rsi_14")
                rsi_str = f"{rsi_val:.2f}" if isinstance(rsi_val, (int, float)) else str(rsi_val or "N/A")
                sma50_val = latest.get("sma_50")
                sma50_str = f"${sma50_val:.2f}" if isinstance(sma50_val, (int, float)) else str(sma50_val or "N/A")
                sma200_val = latest.get("sma_200")
                sma200_str = f"${sma200_val:.2f}" if isinstance(sma200_val, (int, float)) else str(sma200_val or "N/A")
                macd_val = latest.get("macd_line")
                macd_str = f"{macd_val:.2f}" if isinstance(macd_val, (int, float)) else str(macd_val or "N/A")
                vol_val = latest.get("annualized_volatility")
                vol_str = f"{float(vol_val) * 100:.1f}%" if vol_val else "N/A"

                rsi_status = "Neutral Momentum (30-70)"
                if isinstance(rsi_val, (int, float)):
                    if rsi_val >= 70:
                        rsi_status = "Overbought (>=70)"
                    elif rsi_val <= 30:
                        rsi_status = "Oversold (<=30)"

                response_text = (
                    f"### Quantitative Technical Report: **{active_symbol}**\n\n"
                    f"| Indicator | Computed Value | Interpretation |\n"
                    f"| :--- | :--- | :--- |\n"
                    f"| **14-Day RSI (Wilder)** | `{rsi_str}` | {rsi_status} |\n"
                    f"| **SMA 50-Day** | `{sma50_str}` | Medium-term trend benchmark |\n"
                    f"| **SMA 200-Day** | `{sma200_str}` | Long-term institutional baseline |\n"
                    f"| **MACD Line** | `{macd_str}` | Signal: `{latest.get('macd_signal', 'N/A')}` | Hist: `{latest.get('macd_histogram', 'N/A')}` |\n"
                    f"| **Bollinger Bands** | `${latest.get('bollinger_middle', 'N/A')}` | Range: `${latest.get('bollinger_lower', 'N/A')}` to `${latest.get('bollinger_upper', 'N/A')}` |\n"
                    f"| **Annualized Volatility (252d)** | `{vol_str}` | 1-year historical realized volatility |\n\n"
                    f"- **Data Provider:** `{tech_data.get('provider')}` ({tech_data.get('currency')})\n"
                    f"- **Sample Size:** {tech_data.get('total_bars', 0)} daily bars computed with 28-digit Decimal precision."
                )

                widgets.append(UIWidget(
                    widget_type="CANDLESTICK_CHART",
                    title=f"{active_symbol} Interactive Candlestick Chart",
                    data={
                        "symbol": active_symbol,
                        "candlesticks": candlesticks,
                        "indicators": tech_data.get("indicators", {})
                    }
                ))
                citations.append(f"Technical calculation engine on {tech_data.get('provider')} daily bars")

            # --- D. Fundamental Analysis Intent ---
            elif intent == FinancialIntent.FUNDAMENTAL_ANALYSIS and active_symbol:
                tool_name = "get_company_fundamentals"
                args = {"symbol": active_symbol}
                self.policy.validate_tool_permission(user_id, tool_name)
                args = self.policy.validate_and_sanitize_arguments(tool_name, args)

                t0 = time.perf_counter()
                fund_data = await self.tools.execute(tool_name, args)
                tool_executions.append({"tool": tool_name, "args": args, "duration_ms": round((time.perf_counter() - t0) * 1000, 2)})

                prof = fund_data.get("profile", {})
                ratios = fund_data.get("ratios", {})

                mcap_val = prof.get("market_cap")
                mcap_str = f"${float(mcap_val):,.0f}" if mcap_val else "N/A"
                fcf_val = ratios.get("free_cash_flow")
                fcf_str = f"${float(fcf_val):,.0f}" if fcf_val else "N/A"

                response_text = (
                    f"### Fundamental Analysis & Valuation: **{prof.get('company_name', active_symbol)}**\n\n"
                    f"- **Exchange / Sector:** {prof.get('exchange', 'US')} · {prof.get('sector', 'N/A')} ({prof.get('industry', 'N/A')})\n"
                    f"- **Market Capitalization:** {mcap_str}\n\n"
                    f"#### Audited Financial Ratios\n"
                    f"| Financial Metric | Reported Value | Benchmark Category |\n"
                    f"| :--- | :--- | :--- |\n"
                    f"| **Gross Profit Margin** | `{ratios.get('gross_margin_percent', 'N/A')}%` | Profitability |\n"
                    f"| **Net Profit Margin** | `{ratios.get('net_margin_percent', 'N/A')}%` | Profitability |\n"
                    f"| **Return on Equity (ROE)** | `{ratios.get('return_on_equity_percent', 'N/A')}%` | Management Efficiency |\n"
                    f"| **Return on Assets (ROA)** | `{ratios.get('return_on_assets_percent', 'N/A')}%` | Asset Efficiency |\n"
                    f"| **Debt-to-Equity Ratio** | `{ratios.get('debt_to_equity_ratio', 'N/A')}` | Solvency & Leverage |\n"
                    f"| **Current Ratio** | `{ratios.get('current_ratio', 'N/A')}` | Liquidity |\n"
                    f"| **Price-to-Earnings (P/E)** | `{ratios.get('pe_ratio', 'N/A')}` | Valuation Multiples |\n"
                    f"| **Free Cash Flow (FCF)** | `{fcf_str}` | Cash Generation |\n"
                )

                widgets.append(UIWidget(
                    widget_type="FUNDAMENTAL_CARD",
                    title=f"{active_symbol} Financial Valuation Card",
                    data=fund_data
                ))
                citations.append(f"Official SEC EDGAR filings / FMP stable financial statements for {active_symbol}")

            # --- E. Price Check & Profile Intent ---
            elif (intent == FinancialIntent.PRICE_CHECK or intent == FinancialIntent.COMPANY_PROFILE) and active_symbol:
                tool_name = "get_stock_quote"
                args = {"symbol": active_symbol}
                self.policy.validate_tool_permission(user_id, tool_name)
                args = self.policy.validate_and_sanitize_arguments(tool_name, args)

                t0 = time.perf_counter()
                quote_data = await self.tools.execute(tool_name, args)
                tool_executions.append({"tool": tool_name, "args": args, "duration_ms": round((time.perf_counter() - t0) * 1000, 2)})

                price_val = quote_data.get("price")
                change_val = quote_data.get("change", "0.00")
                pct_val = quote_data.get("change_percent", "0.00")
                curr = quote_data.get("currency", "USD")
                provider = quote_data.get("provider", "Market Feed")

                response_text = (
                    f"### Real-Time Market Quote: **{active_symbol}**\n\n"
                    f"- **Latest Price:** `{curr} {price_val}`\n"
                    f"- **Net Change:** `{change_val}` ({pct_val}%)\n"
                    f"- **Exchange / MIC:** {quote_data.get('exchange', 'US')}\n"
                    f"- **Timestamp:** {quote_data.get('as_of')}\n"
                    f"- **Data Provider:** {provider} ({quote_data.get('freshness', 'DELAYED')})\n\n"
                    f"*Would you like me to calculate technical indicators (RSI, SMA, MACD), show fundamental ratios, or compare {active_symbol} with another equity?*"
                )

                widgets.append(UIWidget(
                    widget_type="QUOTE_CARD",
                    title=f"{active_symbol} Quote",
                    data=quote_data
                ))
                citations.append(f"{provider} market quote feed")

            # --- F. News & Sentiment Intent ---
            elif intent == FinancialIntent.NEWS_SENTIMENT:
                query = active_symbol if active_symbol else user_text
                tool_name = "get_company_news"
                args = {"query": query, "limit": 6}
                self.policy.validate_tool_permission(user_id, tool_name)
                args = self.policy.validate_and_sanitize_arguments(tool_name, args)

                t0 = time.perf_counter()
                news_data = await self.tools.execute(tool_name, args)
                tool_executions.append({"tool": tool_name, "args": args, "duration_ms": round((time.perf_counter() - t0) * 1000, 2)})

                articles = news_data.get("articles", [])
                if articles:
                    response_text = f"### Market News & Financial Sentiment: **{query.upper()}**\n\n"
                    for a in articles:
                        sent_badge = f"`[{a.get('sentiment_label', 'NEUTRAL')}]`" if a.get('sentiment_label') else ""
                        response_text += f"- **[{a.get('title')}]({a.get('url')})** {sent_badge} ({a.get('source')})\n  *{a.get('summary', '')}*\n\n"

                    widgets.append(UIWidget(
                        widget_type="NEWS_FEED",
                        title=f"News: {query.upper()}",
                        data={"articles": articles}
                    ))
                    citations.append("Multi-source financial news aggregator & NewsAPI stream")
                else:
                    response_text = f"No recent news articles found for query '{query}'. Try searching for a major ticker or company name."

            # --- G. General Portfolio Analytics Intent ---
            elif intent == FinancialIntent.PORTFOLIO_QUERY:
                response_text = (
                    "### Institutional Portfolio Analytics & What-If Rebalancing\n\n"
                    "I support automated spreadsheet ingestion (`.xlsx` / `.csv`), multi-currency FX normalization "
                    "via European Central Bank benchmark rates, and quantitative risk metrics:\n\n"
                    "- **Herfindahl-Hirschman Concentration Index (HHI)**\n"
                    "- **Unrealized Gain / Loss tracking by position and currency**\n"
                    "- **Hypothetical What-If Buy/Sell Reallocations and Stress Tests**\n\n"
                    "Ask me: *'If I sell all my Tesla shares and buy NVIDIA and AMD, what will my portfolio look like?'*"
                )

            else:
                groq_answered = False
                if groq_service.is_available:
                    groq_ans = await groq_service.generate_financial_analysis(
                        user_query=user_text,
                        conversation_history=[{"role": m.role, "content": m.content} for m in ctx.history]
                    )
                    if groq_ans:
                        response_text = groq_ans
                        citations.append(f"Groq Cloud AI Analysis ({getattr(settings, 'GROQ_MODEL', 'qwen/qwen3.8-27b')})")
                        groq_answered = True

                if not groq_answered:
                    # Default Institutional Overview & Suggestions
                    instruments = await instrument_service.search(query="", limit=8)
                    inst_bullets = "\n".join([f"- **{i.display_symbol}** ({i.company_name}) — *{i.exchange_name} ({i.currency})*" for i in instruments])

                    response_text = (
                        "Hello! I am your institutional AI Stock Market Assistant. "
                        "I provide zero-hallucination quantitative research, empirical market quotes, and 3-statement fundamental valuation.\n\n"
                        "#### Supported Financial Research Commands:\n"
                        "1. **Stock Comparison:** *'Compare NVIDIA and AMD, which looks more attractive?'*\n"
                        "2. **Portfolio Rebalancing Simulation:** *'If I sell my Tesla shares and invest 60% in NVIDIA and 40% in AMD, what will my portfolio look like?'*\n"
                        "3. **Real-time Quotes:** *'What is the price of NVDA?'* or *'Check HSBC (HSBA.L)'*\n"
                        "4. **Technical Analysis:** *'Calculate 14-day RSI and 50-day SMA for TSLA'*\n"
                        "5. **Fundamental Valuation:** *'Show P/E, profit margins and ROE for Amazon'*\n"
                        "6. **Financial News & Sentiment:** *'Latest news and sentiment on Tesla'*\n"
                        "7. **Global Equities Discovery:**\n"
                        f"{inst_bullets}\n\n"
                        "Which company or scenario would you like to analyze?"
                    )

        except PolicyViolationError as pve:
            logger.warning("Policy violation during chat execution: %s", pve)
            response_text = f"**Policy Warning:** {str(pve)}"
        except Exception as e:
            logger.error("Error in AI Orchestrator execution: %s", e, exc_info=True)
            response_text = f"I encountered an error retrieving financial data: {str(e)}. Please verify the ticker symbol or check provider rate limits."

        elapsed_total_ms = round((time.perf_counter() - start_time) * 1000, 2)
        assistant_msg = ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now(timezone.utc),
            widgets=widgets,
            citations=citations,
            tool_calls=tool_executions
        )
        ctx.add_message(assistant_msg)

        return ChatResponse(
            session_id=session_id,
            message=assistant_msg,
            answer=response_text,
            ui_widgets=widgets,
            sources=citations,
            execution_trace={
                "intent": intent.value if hasattr(intent, "value") else str(intent),
                "symbols": symbols,
                "tool_executions": tool_executions,
                "total_duration_ms": elapsed_total_ms
            }
        )

    async def process_query(
        self,
        user_text: str,
        user_id: str = "analyst_session",
        session_id: str = "default_session"
    ):
        """Convenience evaluation helper returning an answer and ui_widgets."""
        resp = await self.run(session_id=session_id, user_text=user_text, user_id=user_id)

        class OrchestratorResult:
            def __init__(self, chat_resp: ChatResponse):
                self.answer = chat_resp.message.content
                self.ui_widgets = chat_resp.message.widgets
                self.citations = chat_resp.message.citations
                self.raw = chat_resp

        return OrchestratorResult(resp)

ai_orchestrator = AIOrchestrator()
FinancialAIOrchestrator = AIOrchestrator
