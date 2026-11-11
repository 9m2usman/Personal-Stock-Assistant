"""
AI Financial Research Assistant - Modular Orchestrator
Coordinates conversation context, intent identification, instrument resolution,
policy permission validation, tool execution, and institutional response synthesis.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import time

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
        if not symbols and ctx.current_symbol and intent != FinancialIntent.GENERAL_QUERY:
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
            # 3. Dispatch & Tool Execution via Registry
            if intent == FinancialIntent.TECHNICAL_ANALYSIS and active_symbol:
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
                    f"*Would you like me to calculate technical indicators (RSI, SMA, MACD) or show fundamental ratios for {active_symbol}?*"
                )

                widgets.append(UIWidget(
                    widget_type="QUOTE_CARD",
                    title=f"{active_symbol} Quote",
                    data=quote_data
                ))
                citations.append(f"{provider} market quote feed")

            elif intent == FinancialIntent.NEWS_SENTIMENT:
                query = active_symbol if active_symbol else user_text
                tool_name = "get_company_news"
                args = {"query": query, "limit": 4}
                self.policy.validate_tool_permission(user_id, tool_name)
                args = self.policy.validate_and_sanitize_arguments(tool_name, args)

                t0 = time.perf_counter()
                news_data = await self.tools.execute(tool_name, args)
                tool_executions.append({"tool": tool_name, "args": args, "duration_ms": round((time.perf_counter() - t0) * 1000, 2)})

                articles = news_data.get("articles", [])
                if articles:
                    response_text = f"### Market News & Sentiment for **{query.upper()}**\n\n"
                    for a in articles:
                        response_text += f"- **[{a.get('title')}]({a.get('url')})** ({a.get('source')})\n  *{a.get('summary', '')}*\n\n"

                    widgets.append(UIWidget(
                        widget_type="NEWS_FEED",
                        title=f"News: {query.upper()}",
                        data={"articles": articles}
                    ))
                    citations.append("NewsAPI financial headlines")
                else:
                    response_text = f"No recent news articles found for query '{query}'. Try searching for a major ticker or company name."

            elif intent == FinancialIntent.PORTFOLIO_QUERY:
                response_text = (
                    "### Institutional Portfolio Analytics & Excel Ingestion\n\n"
                    "I support automated spreadsheet ingestion (`.xlsx` / `.csv`), multi-currency FX normalization "
                    "via European Central Bank daily benchmark rates, and quantitative risk metrics including:\n\n"
                    "- **Herfindahl-Hirschman Concentration Index (HHI)**\n"
                    "- **Unrealized Gain / Loss tracking by position and currency**\n"
                    "- **Hypothetical What-If Reallocations and Stress Tests**\n\n"
                    "Upload your spreadsheet in the **Portfolio & Excel** tab, or ask me: *'What happens if I sell 20 shares of NVDA and buy AAPL?'*"
                )

            else:
                # Institutional Overview & Instrument Directory Search Suggestions
                instruments = await instrument_service.search(query="", limit=6)
                inst_bullets = "\n".join([f"- **{i.display_symbol}** ({i.company_name}) — *{i.exchange_name} ({i.currency})*" for i in instruments])

                response_text = (
                    "Hello! I am your institutional AI Stock Market Assistant. "
                    "I provide zero-hallucination quantitative research, empirical market quotes, and 3-statement fundamental valuation.\n\n"
                    "#### Supported Analytical Queries:\n"
                    "1. **Real-time Quotes:** *'What is the price of NVDA?'* or *'Quote for Apple'* or *'Check HSBC (HSBA.L)'*\n"
                    "2. **Technical Analysis:** *'Calculate 14-day RSI and 50-day SMA for TSLA'* or *'Show MACD for Microsoft'*\n"
                    "3. **Fundamental Valuation:** *'Show P/E, profit margins and ROE for Amazon'*\n"
                    "4. **Financial News & Sentiment:** *'Latest news on Tesla'* or *'Sentiment for NVIDIA'*\n"
                    "5. **Python Analytical Sandbox:** *'Run a Python calculation to compute compound return'*\n"
                    "6. **Multi-Stock Watchlist:**\n"
                    f"{inst_bullets}\n\n"
                    "Which company or portfolio would you like to analyze?"
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
            execution_trace={
                "intent": intent.value if hasattr(intent, "value") else str(intent),
                "symbols": symbols,
                "tool_executions": tool_executions,
                "total_duration_ms": elapsed_total_ms
            }
        )

ai_orchestrator = AIOrchestrator()
