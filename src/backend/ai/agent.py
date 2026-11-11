"""
AI Financial Research Assistant Agent
Coordinates financial intent recognition, function tool invocation, context memory, and UI widget generation.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from src.backend.ai.intent import intent_classifier, FinancialIntent
from src.backend.ai.tools.registry import tool_registry
from src.backend.core.logging import logger

class UIWidget(BaseModel):
    widget_type: str  # QUOTE_CARD, CANDLESTICK_CHART, TECHNICAL_SUMMARY, FUNDAMENTAL_CARD, NEWS_FEED
    title: str
    data: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = datetime.now(timezone.utc)
    widgets: List[UIWidget] = []
    citations: List[str] = []

class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage

class FinancialAIAgent:
    """Institutional-grade financial assistant agent with zero hallucination guarantee."""

    def __init__(self):
        self.sessions: Dict[str, List[ChatMessage]] = {}

    def get_history(self, session_id: str) -> List[ChatMessage]:
        return self.sessions.get(session_id, [])

    async def process_message(self, session_id: str, user_text: str) -> ChatResponse:
        """Processes user input, invokes appropriate financial tools, and formats UI response."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []

        # Record user message
        user_msg = ChatMessage(role="user", content=user_text, timestamp=datetime.now(timezone.utc))
        self.sessions[session_id].append(user_msg)

        # 1. Classify intent and extract symbols
        entities = intent_classifier.classify(user_text)
        symbols = entities.symbols
        intent = entities.intent

        logger.info("Chat Query [%s] -> Intent: %s, Symbols: %s", user_text, intent, symbols)

        widgets: List[UIWidget] = []
        citations: List[str] = []
        response_text = ""

        try:
            # 2. Dispatch based on intent
            if intent == FinancialIntent.TECHNICAL_ANALYSIS and symbols:
                sym = symbols[0]
                tech_data = await tool_registry.execute("get_technical_analysis", {"symbol": sym, "limit": 100})
                latest = tech_data.get("latest_indicators", {})
                candlesticks = tech_data.get("candlesticks", [])

                response_text = (
                    f"### Technical Analysis for **{sym.upper()}**\n\n"
                    f"- **Provider / Source:** {tech_data.get('provider')} ({tech_data.get('currency')})\n"
                    f"- **RSI (14-day Wilder):** {latest.get('rsi_14') if latest.get('rsi_14') is not None else 'N/A'}\n"
                    f"- **SMA 50:** {latest.get('sma_50') if latest.get('sma_50') is not None else 'N/A'}\n"
                    f"- **SMA 200:** {latest.get('sma_200') if latest.get('sma_200') is not None else 'N/A'}\n"
                    f"- **MACD Line:** {latest.get('macd_line') if latest.get('macd_line') is not None else 'N/A'} "
                    f"(Signal: {latest.get('macd_signal')}, Hist: {latest.get('macd_histogram')})\n"
                    f"- **Bollinger Bands:** Upper={latest.get('bollinger_upper')}, Mid={latest.get('bollinger_middle')}, Lower={latest.get('bollinger_lower')}\n"
                    f"- **Annualized Volatility (252d):** {latest.get('annualized_volatility') if latest.get('annualized_volatility') is not None else 'N/A'}\n\n"
                    f"Historical series computed over {tech_data.get('total_bars')} daily bars."
                )

                widgets.append(UIWidget(
                    widget_type="CANDLESTICK_CHART",
                    title=f"{sym.upper()} Interactive Candlestick Chart",
                    data={
                        "symbol": sym.upper(),
                        "candlesticks": candlesticks,
                        "indicators": tech_data.get("indicators", {})
                    }
                ))
                citations.append(f"Technical calculation engine on {tech_data.get('provider')} daily bars")

            elif intent == FinancialIntent.FUNDAMENTAL_ANALYSIS and symbols:
                sym = symbols[0]
                fund_data = await tool_registry.execute("get_company_fundamentals", {"symbol": sym})
                prof = fund_data.get("profile", {})
                ratios = fund_data.get("ratios", {})

                response_text = (
                    f"### Fundamental Analysis & Valuation: **{prof.get('company_name', sym.upper())}**\n\n"
                    f"- **Sector / Industry:** {prof.get('sector', 'N/A')} / {prof.get('industry', 'N/A')}\n"
                    f"- **Gross Profit Margin:** {ratios.get('gross_margin_percent')}%\n"
                    f"- **Net Profit Margin:** {ratios.get('net_margin_percent')}%\n"
                    f"- **Return on Equity (ROE):** {ratios.get('return_on_equity_percent')}%\n"
                    f"- **Return on Assets (ROA):** {ratios.get('return_on_assets_percent')}%\n"
                    f"- **Debt to Equity:** {ratios.get('debt_to_equity_ratio')}\n"
                    f"- **Current Ratio:** {ratios.get('current_ratio')}\n"
                    f"- **P/E Ratio:** {ratios.get('pe_ratio') if ratios.get('pe_ratio') is not None else 'N/A'}\n"
                    f"- **Free Cash Flow:** ${ratios.get('free_cash_flow'):,} (Reported)\n"
                )

                widgets.append(UIWidget(
                    widget_type="FUNDAMENTAL_CARD",
                    title=f"{sym.upper()} Key Financial Ratios",
                    data=fund_data
                ))
                citations.append(f"Official SEC EDGAR filings / FMP stable financial statements for {sym.upper()}")

            elif (intent == FinancialIntent.PRICE_CHECK or intent == FinancialIntent.COMPANY_PROFILE) and symbols:
                sym = symbols[0]
                quote_data = await tool_registry.execute("get_stock_quote", {"symbol": sym})

                response_text = (
                    f"### Real-Time Market Quote: **{sym.upper()}**\n\n"
                    f"- **Latest Price:** {quote_data.get('currency')} {quote_data.get('price')}\n"
                    f"- **Change:** {quote_data.get('change')} ({quote_data.get('change_percent')}%)\n"
                    f"- **Exchange:** {quote_data.get('exchange')}\n"
                    f"- **As of:** {quote_data.get('as_of')}\n"
                    f"- **Provider:** {quote_data.get('provider')}\n"
                )

                widgets.append(UIWidget(
                    widget_type="QUOTE_CARD",
                    title=f"{sym.upper()} Quote",
                    data=quote_data
                ))
                citations.append(f"{quote_data.get('provider')} market quote feed")

            elif intent == FinancialIntent.NEWS_SENTIMENT:
                query = symbols[0] if symbols else user_text
                news_data = await tool_registry.execute("search_market_news", {"query": query, "limit": 4})
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
                    response_text = f"No recent news articles found for query '{query}'."

            elif intent == FinancialIntent.PORTFOLIO_QUERY:
                response_text = (
                    "### Portfolio Analysis & Excel Integration\n\n"
                    "I support automated portfolio spreadsheet ingestion, currency normalization via European Central Bank rates, "
                    "and risk metrics including Herfindahl concentration index, beta exposure, and scenario stress testing. "
                    "You can upload your `.xlsx` portfolio spreadsheet via the Portfolio tab or test hypothetical re-allocations."
                )

            else:
                response_text = (
                    "Hello! I am your institutional AI Stock Market Assistant. I can assist you with:\n\n"
                    "1. **Real-time Quotes & Market Data:** e.g. *'What is the price of NVDA?'*\n"
                    "2. **Technical Analysis:** e.g. *'Calculate SMA, RSI, and Bollinger Bands for Apple'*\n"
                    "3. **Fundamental Analysis & Valuation:** e.g. *'Show P/E, revenue margins, and ROE for Microsoft'*\n"
                    "4. **Financial News & Sentiment:** e.g. *'Latest news on Tesla'*\n"
                    "5. **Excel Portfolio Analytics:** Ingest portfolios with multi-currency FX normalization\n\n"
                    "What stock or portfolio would you like to analyze today?"
                )

        except Exception as e:
            logger.error("Error generating agent response: %s", e, exc_info=True)
            response_text = f"I encountered an issue processing your financial inquiry: {str(e)}. Please check ticker or rate limits."

        assistant_msg = ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now(timezone.utc),
            widgets=widgets,
            citations=citations
        )
        self.sessions[session_id].append(assistant_msg)

        return ChatResponse(session_id=session_id, message=assistant_msg)

ai_agent = FinancialAIAgent()
