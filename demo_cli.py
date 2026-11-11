"""
AI Stock Market Assistant - Interactive CLI Utility
Allows testing market quotes, technicals, fundamentals, portfolio valuation, and AI chat directly in the terminal.
"""
import sys
import asyncio
from decimal import Decimal
from src.backend.services.market_service import market_service
from src.backend.services.fundamental_service import fundamental_service
from src.backend.services.portfolio_service import portfolio_service
from src.backend.ai.agent import ai_agent

async def main():
    if len(sys.argv) < 2:
        print("\n=== AI Stock Market Assistant CLI Utility ===")
        print("Usage:")
        print("  python demo_cli.py quote <SYMBOL>                 Fetch live quote")
        print("  python demo_cli.py technicals <SYMBOL>            Compute SMA, RSI, Bollinger Bands")
        print("  python demo_cli.py fundamentals <SYMBOL>          Show P/E, Margins, ROE")
        print("  python demo_cli.py portfolio <EXCEL_FILE>         Ingest and evaluate portfolio")
        print("  python demo_cli.py chat \"<QUERY>\"                 Ask Conversational Assistant")
        print("\nExample:")
        print("  python demo_cli.py quote NVDA")
        print("  python demo_cli.py chat \"Analyze NVIDIA\"\n")
        return

    cmd = sys.argv[1].lower()

    if cmd == "quote":
        sym = sys.argv[2] if len(sys.argv) > 2 else "NVDA"
        print(f"\n[+] Fetching live quote for {sym.upper()}...")
        q = await market_service.get_realtime_quote(sym)
        print(f"    Symbol:         {q.symbol}")
        print(f"    Price:          {q.currency} {q.price}")
        print(f"    Change:         {q.change} ({q.change_percent}%)")
        print(f"    Exchange:       {q.exchange}")
        print(f"    Provider:       {q.provider}")
        print(f"    Timestamp:      {q.as_of}\n")

    elif cmd == "technicals":
        sym = sys.argv[2] if len(sys.argv) > 2 else "NVDA"
        print(f"\n[+] Calculating quantitative indicators for {sym.upper()}...")
        t = await market_service.get_technicals(sym, limit=100)
        ind = t.latest_indicators
        print(f"    Provider:       {t.provider} ({t.currency})")
        print(f"    Total Bars:     {t.total_bars}")
        print(f"    SMA 50:         ${ind.sma_50}")
        print(f"    SMA 200:        ${ind.sma_200}")
        print(f"    14-Day RSI:     {ind.rsi_14}")
        print(f"    MACD Line:      {ind.macd_line} (Signal: {ind.macd_signal}, Hist: {ind.macd_histogram})")
        print(f"    Bollinger Mid:  ${ind.bollinger_middle} [${ind.bollinger_lower} - ${ind.bollinger_upper}]")
        print(f"    Volatility:     {float(ind.annualized_volatility) * 100:.1f}%\n" if ind.annualized_volatility else "    Volatility: N/A\n")

    elif cmd == "fundamentals":
        sym = sys.argv[2] if len(sys.argv) > 2 else "NVDA"
        print(f"\n[+] Retrieving audited financials & ratios for {sym.upper()}...")
        f = await fundamental_service.get_fundamentals(sym)
        p = f.profile
        r = f.ratios
        print(f"    Company:        {p.company_name} ({p.exchange})")
        print(f"    Sector:         {p.sector} / {p.industry}")
        print(f"    P/E Ratio:      {r.pe_ratio}")
        print(f"    Gross Margin:   {r.gross_margin_percent}%")
        print(f"    Net Margin:     {r.net_margin_percent}%")
        print(f"    ROE:            {r.return_on_equity_percent}%")
        print(f"    Debt/Equity:    {r.debt_to_equity_ratio}")
        print(f"    Current Ratio:  {r.current_ratio}\n")

    elif cmd == "portfolio":
        filepath = sys.argv[2] if len(sys.argv) > 2 else "examples/sample_portfolio.xlsx"
        print(f"\n[+] Ingesting portfolio spreadsheet: {filepath}...")
        with open(filepath, "rb") as fp:
            content = fp.read()
        holdings = portfolio_service.parse_spreadsheet(content, filepath)
        print(f"    Detected {len(holdings)} positions. Evaluating with spot FX...")
        analytics = await portfolio_service.evaluate_portfolio(holdings, base_currency="USD")
        print(f"    Total Value:    ${analytics.total_market_value:,.2f} {analytics.base_currency}")
        print(f"    Cost Basis:     ${analytics.total_cost_basis:,.2f}")
        print(f"    Unrealized P/L: ${analytics.total_unrealized_pnl:,.2f} ({analytics.total_unrealized_pnl_percent}%)")
        print(f"    Herfindahl HHI: {analytics.herfindahl_index:.4f} ({analytics.concentration_risk_level})\n")
        print("    Positions Breakdown:")
        for pos in analytics.positions:
            print(f"      - {pos.symbol:<6}: {pos.quantity} shares | Value: ${pos.market_value:,.2f} | Weight: {pos.weight_percent}%")
        print()

    elif cmd == "chat":
        query = sys.argv[2] if len(sys.argv) > 2 else "Analyze NVDA"
        print(f"\n[User]: {query}\n")
        res = await ai_agent.process_message("cli_session", query)
        print(f"[AI Assistant]:\n{res.message.content}\n")
        if res.message.citations:
            print(f"Sources: {', '.join(res.message.citations)}\n")

    else:
        print(f"Unknown command: '{cmd}'. Run 'python demo_cli.py' for usage.")

if __name__ == "__main__":
    asyncio.run(main())
