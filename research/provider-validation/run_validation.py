import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

# Path setup
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_PATH = os.path.join(BASE_DIR, ".env")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_JSON_PATH = os.path.join(OUTPUT_DIR, "provider_test_results.json")

def load_env(env_path):
    config = {}
    if not os.path.exists(env_path):
        return config
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip()
    return config

env_vars = load_env(ENV_PATH)
ALPHA_VANTAGE_KEY = env_vars.get("ALPHA_VANTAGE_API_KEY", "")
TWELVE_DATA_KEY = env_vars.get("TWELVE_DATA_API_KEY", "")
FMP_KEY = env_vars.get("FMP_API_KEY", "")
NEWSAPI_KEY = env_vars.get("NEWSAPI_API_KEY", "")
NASDAQ_KEY = env_vars.get("NASDAQ_DATA_LINK_API_KEY", "")

# Collect results
results = []

def sanitize_url(url, keys_to_mask):
    sanitized = url
    for k in keys_to_mask:
        if k and k in sanitized:
            sanitized = sanitized.replace(k, "[REDACTED]")
    return sanitized

def sanitize_text(text, keys_to_mask):
    if not isinstance(text, str):
        text = str(text)
    for k in keys_to_mask:
        if k and k in text:
            text = text.replace(k, "[REDACTED]")
    return text

ALL_KEYS = [k for k in [ALPHA_VANTAGE_KEY, TWELVE_DATA_KEY, FMP_KEY, NEWSAPI_KEY, NASDAQ_KEY] if k]

def make_request(url, headers=None, timeout=15):
    """
    Executes an HTTP GET request, catches errors, sanitizes text, and returns a dict with status, body, headers.
    """
    req_headers = {
        "User-Agent": "InkVectorResearch/1.0 (contact@inkvector.com; Academic & Financial Research)",
        "Accept": "application/json"
    }
    if headers:
        req_headers.update(headers)
    
    req = urllib.request.Request(url, headers=req_headers)
    start_t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = round(time.time() - start_t, 3)
            status_code = resp.status
            content_type = resp.headers.get("Content-Type", "")
            raw_body = resp.read().decode("utf-8", errors="replace")
            try:
                json_data = json.loads(raw_body)
            except Exception:
                json_data = None
            return {
                "success": True,
                "http_status": status_code,
                "elapsed_sec": elapsed,
                "content_type": content_type,
                "json": json_data,
                "raw": raw_body[:2000],
                "error": None
            }
    except urllib.error.HTTPError as e:
        elapsed = round(time.time() - start_t, 3)
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            json_data = json.loads(err_body)
        except Exception:
            json_data = None
        return {
            "success": False,
            "http_status": e.code,
            "elapsed_sec": elapsed,
            "content_type": e.headers.get("Content-Type", ""),
            "json": json_data,
            "raw": sanitize_text(err_body[:2000], ALL_KEYS),
            "error": f"HTTPError {e.code}: {e.reason}"
        }
    except Exception as e:
        elapsed = round(time.time() - start_t, 3)
        return {
            "success": False,
            "http_status": None,
            "elapsed_sec": elapsed,
            "content_type": None,
            "json": None,
            "raw": None,
            "error": sanitize_text(str(e), ALL_KEYS)
        }

def record_result(provider, endpoint, test_purpose, status, http_status, error_details,
                  company, symbol, exchange, currency, latest_data_date, fields_returned, extra=None):
    rec = {
        "provider": provider,
        "endpoint": sanitize_url(endpoint, ALL_KEYS),
        "test_purpose": test_purpose,
        "status": status,
        "http_status": http_status,
        "sanitized_error": sanitize_text(error_details, ALL_KEYS) if error_details else None,
        "company": company,
        "symbol": symbol,
        "exchange_or_region": exchange,
        "currency": currency,
        "latest_data_date": latest_data_date,
        "data_fields_returned": fields_returned,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "extra_info": extra or {}
    }
    results.append(rec)
    print(f"[{provider}] {test_purpose} -> Status: {status} (HTTP {http_status})")
    return rec

print("=== Starting API Provider Validation Suite ===")
print(f"Time: {datetime.now(timezone.utc).isoformat()}")

# -------------------------------------------------------------
# 1. ALPHA VANTAGE
# -------------------------------------------------------------
print("\n--- Validating Alpha Vantage ---")
if not ALPHA_VANTAGE_KEY:
    print("Alpha Vantage: NOT CONFIGURED")
    record_result("Alpha Vantage", "N/A", "Configuration Check", "NOT CONFIGURED", None, "Missing API Key",
                  "N/A", "N/A", "N/A", "N/A", "N/A", [])
else:
    # 1.A Symbol Search
    av_searches = [
        ("NVIDIA", "NVIDIA"),
        ("HSBC Holdings", "HSBC"),
        ("Toyota Motor Corporation", "Toyota"),
        ("Nestle SA", "Nestle")
    ]
    for company_name, query in av_searches:
        url = f"https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={urllib.parse.quote(query)}&apikey={ALPHA_VANTAGE_KEY}"
        resp = make_request(url)
        time.sleep(12)  # Respect free tier rate limit of 5 requests/min
        
        status = "FAILED"
        fields = []
        best_match = None
        error_msg = resp["error"]
        
        if resp["success"] and resp["json"]:
            if "bestMatches" in resp["json"]:
                status = "SUCCESS"
                matches = resp["json"]["bestMatches"]
                fields = list(matches[0].keys()) if matches else []
                best_match = matches[:3] if matches else []
            elif "Note" in resp["json"]:
                status = "RATE_LIMITED"
                error_msg = resp["json"]["Note"]
            elif "Error Message" in resp["json"]:
                status = "API_ERROR"
                error_msg = resp["json"]["Error Message"]
            elif "Information" in resp["json"]:
                status = "RATE_LIMITED_OR_TIER"
                error_msg = resp["json"]["Information"]
        
        record_result(
            "Alpha Vantage",
            "https://www.alphavantage.co/query?function=SYMBOL_SEARCH",
            f"Symbol Search for {company_name}",
            status,
            resp["http_status"],
            error_msg,
            company_name,
            query,
            "Global Search",
            None,
            None,
            fields,
            {"matches_found": len(best_match) if best_match else 0, "sample_matches": best_match}
        )

    # 1.B Historical Daily Prices
    # Candidates to test:
    # NVDA (US), HSBA.LON (UK), 7203.TKS (Toyota Tokyo candidate) or 7203.TYO / TM, NESN.SWI (Nestle SIX Swiss candidate) or NESN.SW
    av_daily_candidates = [
        ("NVIDIA", "NVDA", "US", "USD"),
        ("HSBC Holdings", "HSBA.LON", "LSE (UK)", "GBp"),
        ("Toyota Motor Corporation", "7203.TKS", "Tokyo Stock Exchange", "JPY"),
        ("Nestle SA", "NESN.SWI", "SIX Swiss Exchange", "CHF"),
        # Also test alternate Tokyo & Swiss symbol formats to be thorough as instructed:
        ("Toyota Motor (Alternative)", "7203.TYO", "Tokyo Stock Exchange Candidate 2", "JPY"),
        ("Nestle SA (Alternative)", "NESN.SW", "SIX Swiss Exchange Candidate 2", "CHF")
    ]
    
    for comp, sym, exch, expected_curr in av_daily_candidates:
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={urllib.parse.quote(sym)}&apikey={ALPHA_VANTAGE_KEY}"
        resp = make_request(url)
        time.sleep(12)  # Respect 5 calls/min
        
        status = "FAILED"
        fields = []
        latest_date = None
        error_msg = resp["error"]
        extra_data = {}
        
        if resp["success"] and resp["json"]:
            if "Time Series (Daily)" in resp["json"]:
                status = "SUCCESS"
                ts = resp["json"]["Time Series (Daily)"]
                dates = sorted(ts.keys(), reverse=True)
                if dates:
                    latest_date = dates[0]
                    fields = list(ts[latest_date].keys())
                    extra_data = {
                        "latest_date": latest_date,
                        "open": ts[latest_date].get("1. open"),
                        "high": ts[latest_date].get("2. high"),
                        "low": ts[latest_date].get("3. low"),
                        "close": ts[latest_date].get("4. close"),
                        "volume": ts[latest_date].get("5. volume"),
                        "total_trading_days": len(dates)
                    }
            elif "Note" in resp["json"]:
                status = "RATE_LIMITED"
                error_msg = resp["json"]["Note"]
            elif "Error Message" in resp["json"]:
                status = "UNSUPPORTED_SYMBOL_OR_TIER"
                error_msg = resp["json"]["Error Message"]
            elif "Information" in resp["json"]:
                status = "TIER_RESTRICTION_OR_RATE_LIMIT"
                error_msg = resp["json"]["Information"]
        
        record_result(
            "Alpha Vantage",
            "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY",
            f"Daily OHLCV for {comp} ({sym})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            sym,
            exch,
            expected_curr if status == "SUCCESS" else None,
            latest_date,
            fields,
            extra_data
        )

# -------------------------------------------------------------
# 2. TWELVE DATA
# -------------------------------------------------------------
print("\n--- Validating Twelve Data ---")
if not TWELVE_DATA_KEY:
    print("Twelve Data: NOT CONFIGURED")
    record_result("Twelve Data", "N/A", "Configuration Check", "NOT CONFIGURED", None, "Missing API Key",
                  "N/A", "N/A", "N/A", "N/A", "N/A", [])
else:
    # 2.A Symbol Search & Exchange Resolution
    td_searches = [
        ("NVIDIA", "NVDA"),
        ("HSBC", "HSBA"),
        ("Toyota", "7203"),
        ("Nestle", "NESN")
    ]
    for comp, query in td_searches:
        url = f"https://api.twelvedata.com/symbol_search?symbol={urllib.parse.quote(query)}"
        resp = make_request(url)
        time.sleep(8)  # Free tier 8 req/min
        
        status = "FAILED"
        fields = []
        sample_results = []
        error_msg = resp["error"]
        
        if resp["success"] and resp["json"]:
            if "data" in resp["json"]:
                status = "SUCCESS"
                data = resp["json"]["data"]
                fields = list(data[0].keys()) if data else []
                sample_results = data[:4] if data else []
            elif "code" in resp["json"] and resp["json"].get("status") == "error":
                status = "API_ERROR"
                error_msg = resp["json"].get("message")
        
        record_result(
            "Twelve Data",
            "https://api.twelvedata.com/symbol_search",
            f"Symbol Search for {comp} ({query})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            query,
            "Global Search",
            None,
            None,
            fields,
            {"sample_matches": sample_results}
        )

    # 2.B Historical Time Series Tests
    td_targets = [
        ("NVIDIA", "NVDA", "NASDAQ", "United States", "USD"),
        ("HSBC Holdings", "HSBA", "LSE", "United Kingdom", "GBp"),
        ("Toyota Motor", "7203", "TSE", "Japan", "JPY"),
        ("Nestle SA", "NESN", "SWX", "Switzerland", "CHF")
    ]
    
    for comp, sym, exch, region, expected_curr in td_targets:
        url = f"https://api.twelvedata.com/time_series?symbol={sym}&exchange={exch}&interval=1day&outputsize=5&apikey={TWELVE_DATA_KEY}"
        resp = make_request(url)
        time.sleep(8)  # Free tier 8 req/min
        
        status = "FAILED"
        fields = []
        latest_date = None
        error_msg = resp["error"]
        currency = None
        extra = {}
        
        if resp["success"] and resp["json"]:
            if "values" in resp["json"]:
                status = "SUCCESS"
                meta = resp["json"].get("meta", {})
                currency = meta.get("currency")
                values = resp["json"]["values"]
                if values:
                    latest_date = values[0].get("datetime")
                    fields = list(values[0].keys())
                    extra = {
                        "meta": meta,
                        "latest_bar": values[0],
                        "total_bars_returned": len(values)
                    }
            elif "code" in resp["json"] and resp["json"].get("status") == "error":
                code = resp["json"].get("code")
                msg = resp["json"].get("message", "")
                if code == 429:
                    status = "RATE_LIMITED"
                elif "plan" in msg.lower() or code == 403 or "not available" in msg.lower():
                    status = "TIER_RESTRICTED"
                else:
                    status = "API_ERROR"
                error_msg = f"Code {code}: {msg}"
        
        record_result(
            "Twelve Data",
            "https://api.twelvedata.com/time_series",
            f"Daily OHLCV for {comp} ({sym} on {exch})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            sym,
            f"{exch} ({region})",
            currency or expected_curr,
            latest_date,
            fields,
            extra
        )

# -------------------------------------------------------------
# 3. FINANCIAL MODELING PREP (FMP)
# -------------------------------------------------------------
print("\n--- Validating Financial Modeling Prep (FMP) ---")
if not FMP_KEY:
    print("FMP: NOT CONFIGURED")
    record_result("Financial Modeling Prep", "N/A", "Configuration Check", "NOT CONFIGURED", None, "Missing API Key",
                  "N/A", "N/A", "N/A", "N/A", "N/A", [])
else:
    # 3.A Company Search
    fmp_search_url = f"https://financialmodelingprep.com/api/v3/search?query=NVIDIA&limit=3&apikey={FMP_KEY}"
    resp = make_request(fmp_search_url)
    time.sleep(2)
    status = "SUCCESS" if resp["success"] and isinstance(resp["json"], list) and len(resp["json"]) > 0 else "FAILED"
    fields = list(resp["json"][0].keys()) if status == "SUCCESS" else []
    record_result(
        "Financial Modeling Prep",
        "https://financialmodelingprep.com/api/v3/search",
        "Company Search (NVIDIA)",
        status,
        resp["http_status"],
        resp["error"] if status == "FAILED" else (resp["json"].get("Error Message") if isinstance(resp["json"], dict) else None),
        "NVIDIA",
        "NVDA",
        "NASDAQ",
        "USD",
        None,
        fields,
        {"sample": resp["json"][:2] if isinstance(resp["json"], list) else resp["json"]}
    )

    # 3.B Profile: NVDA, HSBC, TM, NESN.SW
    fmp_profile_targets = [
        ("NVIDIA", "NVDA", "NASDAQ", "USD"),
        ("HSBC Holdings", "HSBC", "NYSE", "USD"),
        ("HSBC Holdings UK", "HSBA.L", "LSE", "GBp"),
        ("Toyota Motor Corp", "TM", "NYSE", "USD"),
        ("Toyota Motor Tokyo", "7203.T", "TSE", "JPY"),
        ("Nestle SA Swiss", "NESN.SW", "SIX", "CHF")
    ]
    for comp, sym, exch, curr in fmp_profile_targets:
        url = f"https://financialmodelingprep.com/api/v3/profile/{sym}?apikey={FMP_KEY}"
        resp = make_request(url)
        time.sleep(2)
        
        status = "FAILED"
        fields = []
        error_msg = resp["error"]
        extra = {}
        ret_curr = curr
        
        if resp["success"]:
            if isinstance(resp["json"], list) and len(resp["json"]) > 0:
                status = "SUCCESS"
                prof = resp["json"][0]
                fields = list(prof.keys())
                ret_curr = prof.get("currency", curr)
                extra = {
                    "companyName": prof.get("companyName"),
                    "exchange": prof.get("exchangeShortName"),
                    "price": prof.get("price"),
                    "mktCap": prof.get("mktCap")
                }
            elif isinstance(resp["json"], dict):
                if "Error Message" in resp["json"]:
                    status = "TIER_RESTRICTED_OR_ERROR"
                    error_msg = resp["json"]["Error Message"]
                else:
                    status = "EMPTY_RESPONSE"
            elif isinstance(resp["json"], list) and len(resp["json"]) == 0:
                status = "NOT_FOUND_OR_RESTRICTED"
                error_msg = "Empty list returned (symbol not found or plan restricted)"
        
        record_result(
            "Financial Modeling Prep",
            "https://financialmodelingprep.com/api/v3/profile",
            f"Company Profile for {comp} ({sym})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            sym,
            exch,
            ret_curr,
            None,
            fields,
            extra
        )

    # 3.C Financial Statements: Income Statement, Balance Sheet, Cash Flow (NVDA and HSBC)
    stmt_targets = [
        ("Income Statement", "income-statement", "NVDA", "NVIDIA"),
        ("Balance Sheet", "balance-sheet-statement", "NVDA", "NVIDIA"),
        ("Cash Flow Statement", "cash-flow-statement", "NVDA", "NVIDIA"),
        ("Income Statement", "income-statement", "HSBC", "HSBC Holdings"),
        ("Income Statement UK Listing", "income-statement", "HSBA.L", "HSBC Holdings UK")
    ]
    for stmt_name, endpoint_name, sym, comp in stmt_targets:
        url = f"https://financialmodelingprep.com/api/v3/{endpoint_name}/{sym}?limit=5&apikey={FMP_KEY}"
        resp = make_request(url)
        time.sleep(2)
        
        status = "FAILED"
        fields = []
        latest_date = None
        error_msg = resp["error"]
        extra = {}
        curr = None
        
        if resp["success"]:
            if isinstance(resp["json"], list) and len(resp["json"]) > 0:
                status = "SUCCESS"
                latest_stmt = resp["json"][0]
                latest_date = latest_stmt.get("date")
                curr = latest_stmt.get("reportedCurrency")
                fields = list(latest_stmt.keys())
                extra = {
                    "periods_returned": len(resp["json"]),
                    "calendarYear": latest_stmt.get("calendarYear"),
                    "period": latest_stmt.get("period"),
                    "revenue": latest_stmt.get("revenue") or latest_stmt.get("netIncome")
                }
            elif isinstance(resp["json"], dict) and "Error Message" in resp["json"]:
                status = "TIER_RESTRICTED"
                error_msg = resp["json"]["Error Message"]
            elif isinstance(resp["json"], list) and len(resp["json"]) == 0:
                status = "NOT_FOUND_OR_RESTRICTED"
                error_msg = "Empty list returned"
        
        record_result(
            "Financial Modeling Prep",
            f"https://financialmodelingprep.com/api/v3/{endpoint_name}",
            f"{stmt_name} for {comp} ({sym})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            sym,
            "US / Global",
            curr,
            latest_date,
            fields,
            extra
        )

    # 3.D Historical Prices: NVDA & HSBC
    for sym, comp in [("NVDA", "NVIDIA"), ("HSBC", "HSBC Holdings"), ("7203.T", "Toyota TSE")]:
        url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{sym}?timeseries=5&apikey={FMP_KEY}"
        resp = make_request(url)
        time.sleep(2)
        
        status = "FAILED"
        fields = []
        latest_date = None
        error_msg = resp["error"]
        extra = {}
        
        if resp["success"]:
            if isinstance(resp["json"], dict) and "historical" in resp["json"]:
                hist = resp["json"]["historical"]
                if hist:
                    status = "SUCCESS"
                    latest_date = hist[0].get("date")
                    fields = list(hist[0].keys())
                    extra = {
                        "latest_bar": hist[0],
                        "bars_returned": len(hist)
                    }
            elif isinstance(resp["json"], dict) and "Error Message" in resp["json"]:
                status = "TIER_RESTRICTED"
                error_msg = resp["json"]["Error Message"]
        
        record_result(
            "Financial Modeling Prep",
            "https://financialmodelingprep.com/api/v3/historical-price-full",
            f"Historical Daily Prices for {comp} ({sym})",
            status,
            resp["http_status"],
            error_msg,
            comp,
            sym,
            "US / Global",
            None,
            latest_date,
            fields,
            extra
        )

# -------------------------------------------------------------
# 4. NEWSAPI
# -------------------------------------------------------------
print("\n--- Validating NewsAPI ---")
if not NEWSAPI_KEY:
    print("NewsAPI: NOT CONFIGURED")
    record_result("NewsAPI", "N/A", "Configuration Check", "NOT CONFIGURED", None, "Missing API Key",
                  "N/A", "N/A", "N/A", "N/A", "N/A", [])
else:
    news_queries = [
        ("NVIDIA", "NVIDIA stock OR NVDA"),
        ("HSBC", "HSBC Holdings"),
        ("Toyota", "Toyota Motor"),
        ("Nestle", "Nestle SA"),
        ("Global Markets", "global stock markets OR Wall Street")
    ]
    for topic, query in news_queries:
        url = f"https://newsapi.org/v2/everything?q={urllib.parse.quote(query)}&sortBy=publishedAt&pageSize=3&apiKey={NEWSAPI_KEY}"
        resp = make_request(url)
        time.sleep(2)
        
        status = "FAILED"
        fields = []
        latest_date = None
        error_msg = resp["error"]
        sample_articles = []
        
        if resp["success"] and resp["json"]:
            if resp["json"].get("status") == "ok":
                status = "SUCCESS"
                articles = resp["json"].get("articles", [])
                if articles:
                    latest_date = articles[0].get("publishedAt")
                    fields = list(articles[0].keys())
                    for art in articles[:3]:
                        sample_articles.append({
                            "title": art.get("title"),
                            "source": art.get("source", {}).get("name"),
                            "publishedAt": art.get("publishedAt"),
                            "url": art.get("url")
                        })
            elif resp["json"].get("status") == "error":
                code = resp["json"].get("code")
                msg = resp["json"].get("message")
                status = f"API_ERROR_{code}"
                error_msg = f"{code}: {msg}"
        
        record_result(
            "NewsAPI",
            "https://newsapi.org/v2/everything",
            f"News Search for {topic}",
            status,
            resp["http_status"],
            error_msg,
            topic,
            "N/A",
            "Global News",
            None,
            latest_date,
            fields,
            {"articles_count": len(sample_articles), "samples": sample_articles}
        )

# -------------------------------------------------------------
# 5. NASDAQ DATA LINK
# -------------------------------------------------------------
print("\n--- Validating Nasdaq Data Link ---")
if not NASDAQ_KEY:
    print("Nasdaq Data Link: NOT CONFIGURED")
    record_result("Nasdaq Data Link", "N/A", "Configuration Check", "NOT CONFIGURED", None, "Missing API Key",
                  "N/A", "N/A", "N/A", "N/A", "N/A", [])
else:
    # 5.A Dataset search query
    nd_search_url = f"https://data.nasdaq.com/api/v3/datasets.json?query=stock+prices&per_page=3&api_key={NASDAQ_KEY}"
    resp = make_request(nd_search_url)
    time.sleep(2)
    
    status = "FAILED"
    fields = []
    error_msg = resp["error"]
    sample_datasets = []
    
    if resp["success"] and resp["json"]:
        if "datasets" in resp["json"]:
            status = "SUCCESS"
            dsets = resp["json"]["datasets"]
            fields = list(dsets[0].keys()) if dsets else []
            for d in dsets[:3]:
                sample_datasets.append({
                    "database_code": d.get("database_code"),
                    "dataset_code": d.get("dataset_code"),
                    "name": d.get("name"),
                    "premium": d.get("premium"),
                    "newest_available_date": d.get("newest_available_date")
                })
        elif "quandl_error" in resp["json"]:
            status = "API_ERROR"
            error_msg = resp["json"]["quandl_error"].get("message")
    
    record_result(
        "Nasdaq Data Link",
        "https://data.nasdaq.com/api/v3/datasets.json",
        "Dataset Search (stock prices)",
        status,
        resp["http_status"],
        error_msg,
        "General Market",
        "N/A",
        "Global / US",
        None,
        None,
        fields,
        {"sample_datasets": sample_datasets}
    )

    # 5.B Test specific free dataset (FRED/GDP)
    fred_url = f"https://data.nasdaq.com/api/v3/datasets/FRED/GDP.json?rows=3&api_key={NASDAQ_KEY}"
    resp_fred = make_request(fred_url)
    time.sleep(2)
    
    status_fred = "FAILED"
    fields_fred = []
    latest_date_fred = None
    err_fred = resp_fred["error"]
    extra_fred = {}
    
    if resp_fred["success"] and resp_fred["json"]:
        if "dataset" in resp_fred["json"]:
            status_fred = "SUCCESS"
            ds = resp_fred["json"]["dataset"]
            fields_fred = ds.get("column_names", [])
            latest_date_fred = ds.get("newest_available_date")
            extra_fred = {
                "name": ds.get("name"),
                "database_code": ds.get("database_code"),
                "dataset_code": ds.get("dataset_code"),
                "frequency": ds.get("frequency"),
                "sample_data": ds.get("data")[:2]
            }
        elif "quandl_error" in resp_fred["json"]:
            status_fred = "API_ERROR"
            err_fred = resp_fred["json"]["quandl_error"].get("message")
            
    record_result(
        "Nasdaq Data Link",
        "https://data.nasdaq.com/api/v3/datasets/FRED/GDP.json",
        "Fetch Free Economic Dataset (FRED/GDP)",
        status_fred,
        resp_fred["http_status"],
        err_fred,
        "US Macro",
        "FRED/GDP",
        "United States",
        "USD (Billions)",
        latest_date_fred,
        fields_fred,
        extra_fred
    )

    # 5.C Test Equity dataset availability on free account (WIKI/NVDA or Sharadar)
    wiki_url = f"https://data.nasdaq.com/api/v3/datasets/WIKI/NVDA.json?rows=3&api_key={NASDAQ_KEY}"
    resp_wiki = make_request(wiki_url)
    time.sleep(2)
    
    status_wiki = "FAILED"
    fields_wiki = []
    latest_date_wiki = None
    err_wiki = resp_wiki["error"]
    extra_wiki = {}
    
    if resp_wiki["success"] and resp_wiki["json"]:
        if "dataset" in resp_wiki["json"]:
            ds = resp_wiki["json"]["dataset"]
            latest_date_wiki = ds.get("newest_available_date")
            fields_wiki = ds.get("column_names", [])
            # Note WIKI was ended in 2018
            status_wiki = "SUCCESS_OBSOLETE_DATA"
            extra_wiki = {
                "dataset_name": ds.get("name"),
                "oldest_available_date": ds.get("oldest_available_date"),
                "newest_available_date": ds.get("newest_available_date"),
                "notice": "WIKI dataset ceased updates in March 2018; not suitable for active markets"
            }
        elif "quandl_error" in resp_wiki["json"]:
            status_wiki = "API_ERROR"
            err_wiki = resp_wiki["json"]["quandl_error"].get("message")
            
    record_result(
        "Nasdaq Data Link",
        "https://data.nasdaq.com/api/v3/datasets/WIKI/NVDA.json",
        "Check Legacy Free US Equity Dataset (WIKI/NVDA)",
        status_wiki,
        resp_wiki["http_status"],
        err_wiki,
        "NVIDIA",
        "WIKI/NVDA",
        "United States",
        "USD",
        latest_date_wiki,
        fields_wiki,
        extra_wiki
    )

    # 5.D Test Premium Equity dataset access on free account (Sharadar SEP)
    sharadar_url = f"https://data.nasdaq.com/api/v3/datatables/SHARADAR/SEP.json?ticker=NVDA&api_key={NASDAQ_KEY}"
    resp_sh = make_request(sharadar_url)
    time.sleep(2)
    
    status_sh = "FAILED"
    err_sh = resp_sh["error"]
    if resp_sh["http_status"] in (401, 403):
        status_sh = "PREMIUM_LOCKED (403/401)"
    elif resp_sh["json"] and "quandl_error" in resp_sh["json"]:
        status_sh = "PREMIUM_LOCKED"
        err_sh = resp_sh["json"]["quandl_error"].get("message")
        
    record_result(
        "Nasdaq Data Link",
        "https://data.nasdaq.com/api/v3/datatables/SHARADAR/SEP.json",
        "Check Modern US Equity Premium Dataset (SHARADAR/SEP)",
        status_sh,
        resp_sh["http_status"],
        err_sh,
        "NVIDIA",
        "SHARADAR/SEP",
        "United States",
        "USD",
        None,
        [],
        {"access_permitted": False if status_sh.startswith("PREMIUM") else True}
    )

# -------------------------------------------------------------
# 6. SEC EDGAR
# -------------------------------------------------------------
print("\n--- Validating SEC EDGAR (Public API) ---")
# Fair access header
sec_headers = {
    "User-Agent": "InkVectorFintech Research/1.0 (contact@inkvector.com; Academic & Financial Research)",
    "Accept": "application/json"
}

# 6.A Ticker to CIK Lookup
sec_tickers_url = "https://www.sec.gov/files/company_tickers.json"
resp_tickers = make_request(sec_tickers_url, headers=sec_headers)
time.sleep(1)

status_sec_tick = "FAILED"
fields_sec_tick = []
err_sec_tick = resp_tickers["error"]
extra_sec_tick = {}

if resp_tickers["success"] and resp_tickers["json"]:
    status_sec_tick = "SUCCESS"
    sample_entry = resp_tickers["json"].get("0", {})
    fields_sec_tick = list(sample_entry.keys())
    extra_sec_tick = {
        "total_tickers_indexed": len(resp_tickers["json"]),
        "sample_entry": sample_entry
    }

record_result(
    "SEC EDGAR",
    "https://www.sec.gov/files/company_tickers.json",
    "Company Ticker to CIK Directory Lookup",
    status_sec_tick,
    resp_tickers["http_status"],
    err_sec_tick,
    "Global Index",
    "ALL",
    "United States SEC Registry",
    None,
    None,
    fields_sec_tick,
    extra_sec_tick
)

# 6.B Submissions: NVDA, HSBC, Toyota
# NVIDIA CIK: 0001045810
# HSBC Holdings CIK: 0001140465 (Foreign Private Issuer: 20-F, 6-K)
# Toyota Motor Corp CIK: 0001094517 (Foreign Private Issuer: 20-F, 6-K)
# Nestle SA ADR CIK: 0000071373 or 0001046179 (Exempt 12g3-2(b) or OTC ADR)
sec_targets = [
    ("NVIDIA", "0001045810", "NVDA", "Domestic 10-K / 10-Q"),
    ("HSBC Holdings plc", "0001140465", "HSBC", "Foreign Private Issuer (20-F / 6-K)"),
    ("Toyota Motor Corp", "0001094517", "TM", "Foreign Private Issuer (20-F / 6-K)")
]

for comp, cik, ticker, filing_type in sec_targets:
    sub_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    resp_sub = make_request(sub_url, headers=sec_headers)
    time.sleep(1)
    
    status_sub = "FAILED"
    fields_sub = []
    latest_filing_date = None
    err_sub = resp_sub["error"]
    extra_sub = {}
    
    if resp_sub["success"] and resp_sub["json"]:
        status_sub = "SUCCESS"
        data = resp_sub["json"]
        fields_sub = ["cik", "entityType", "sic", "name", "tickers", "exchanges", "filings"]
        recent = data.get("filings", {}).get("recent", {})
        if recent and "filingDate" in recent and recent["filingDate"]:
            latest_filing_date = recent["filingDate"][0]
            extra_sub = {
                "cik": data.get("cik"),
                "sic": data.get("sic"),
                "sicDescription": data.get("sicDescription"),
                "name": data.get("name"),
                "tickers": data.get("tickers"),
                "exchanges": data.get("exchanges"),
                "latest_filing_form": recent.get("form", [""])[0],
                "latest_filing_date": latest_filing_date,
                "recent_filings_count": len(recent.get("form", []))
            }
            
    record_result(
        "SEC EDGAR",
        "https://data.sec.gov/submissions/CIK{cik}.json",
        f"Company Submissions for {comp} ({filing_type})",
        status_sub,
        resp_sub["http_status"],
        err_sub,
        comp,
        ticker,
        "SEC Submissions",
        None,
        latest_filing_date,
        fields_sub,
        extra_sub
    )

# 6.C Company Facts (XBRL Financial Data) for NVIDIA
facts_url = "https://data.sec.gov/api/xbrl/companyfacts/CIK0001045810.json"
resp_facts = make_request(facts_url, headers=sec_headers)
time.sleep(1)

status_facts = "FAILED"
fields_facts = []
err_facts = resp_facts["error"]
extra_facts = {}

if resp_facts["success"] and resp_facts["json"]:
    status_facts = "SUCCESS"
    facts_data = resp_facts["json"]
    us_gaap = facts_data.get("facts", {}).get("us-gaap", {})
    dei = facts_data.get("facts", {}).get("dei", {})
    fields_facts = list(us_gaap.keys())[:15]
    extra_facts = {
        "entityName": facts_data.get("entityName"),
        "cik": facts_data.get("cik"),
        "us_gaap_concepts_count": len(us_gaap),
        "dei_concepts_count": len(dei),
        "sample_concepts": list(us_gaap.keys())[:10]
    }

record_result(
    "SEC EDGAR",
    "https://data.sec.gov/api/xbrl/companyfacts/CIK0001045810.json",
    "Company Facts / XBRL Financials for NVIDIA",
    status_facts,
    resp_facts["http_status"],
    err_facts,
    "NVIDIA",
    "NVDA",
    "US GAAP XBRL",
    "USD",
    None,
    fields_facts,
    extra_facts
)

# -------------------------------------------------------------
# Save Results to JSON
# -------------------------------------------------------------
print(f"\nWriting test results to {RESULTS_JSON_PATH}...")
with open(RESULTS_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump({
        "validation_metadata": {
            "validation_date_utc": datetime.now(timezone.utc).isoformat(),
            "environment": "Windows Sandbox / Python 3.14",
            "total_tests_executed": len(results),
            "providers_evaluated": [
                "Alpha Vantage",
                "Twelve Data",
                "Financial Modeling Prep",
                "NewsAPI",
                "Nasdaq Data Link",
                "SEC EDGAR"
            ]
        },
        "results": results
    }, f, indent=2)

print("=== Validation Suite Completed Successfully ===")
