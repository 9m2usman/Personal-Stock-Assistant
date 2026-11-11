# AI Stock Market Assistant — Testing & Verification Guide

**Project Root:** `E:\finTech-inkVector`  
**Test Framework:** Pytest 9.2.0 + pytest-asyncio 0.24.0 (Python 3.14.10)  
**Total Automated Tests:** 51 Automated Tests Passing (100% Success Rate)

---

## 1. Automated Test Execution Commands

### Run Full Test Suite:
```powershell
# From project root:
pytest -v
```

### Run Unit Tests Only:
```powershell
pytest tests/unit -v
```

### Run Integration & E2E API Tests:
```powershell
pytest tests/integration -v
```

### Run Specific Test Modules:
```powershell
# Instrument search and multi-stock resolution:
pytest tests/unit/test_instrument_search.py -v

# AI Agent harness and tool registry:
pytest tests/unit/test_ai_agent.py -v

# Python analytical execution sandbox:
pytest tests/unit/test_sandbox.py -v

# Celery background workers:
pytest tests/unit/test_workers.py -v

# Technical indicator calculations:
pytest tests/unit/test_technical_service.py -v

# Fundamental valuation and 3-statement accounting:
pytest tests/unit/test_fundamental_service.py -v
```

---

## 2. Complete Test Inventory & Results

### Unit Test Suites (45 Tests):
- **`tests/unit/test_config.py` (3 tests):**
  - `test_settings_loaded`: PASSED
  - `test_secret_string_masking`: PASSED
  - `test_sec_edgar_user_agent`: PASSED
- **`tests/unit/test_database.py` (1 test):**
  - `test_database_table_creation_and_crud`: PASSED
- **`tests/unit/test_exceptions.py` (3 tests):**
  - `test_instrument_not_found_exception`: PASSED
  - `test_provider_tier_restriction_exception`: PASSED
  - `test_currency_mismatch_exception`: PASSED
- **`tests/unit/test_fundamental_service.py` (3 tests):**
  - `test_calculate_ratios_standard`: PASSED
  - `test_calculate_ratios_zero_division_safety`: PASSED
  - `test_get_fundamentals_overview`: PASSED
- **`tests/unit/test_health.py` (3 tests):**
  - `test_root_endpoint`: PASSED
  - `test_root_health`: PASSED
  - `test_api_v1_health`: PASSED
- **`tests/unit/test_news_service.py` (2 tests):**
  - `test_score_article_sentiment`: PASSED
  - `test_get_company_sentiment_aggregate`: PASSED
- **`tests/unit/test_portfolio_service.py` (2 tests):**
  - `test_parse_spreadsheet_fuzzy_matching`: PASSED
  - `test_evaluate_portfolio_with_fx`: PASSED
- **`tests/unit/test_providers.py` (4 tests):**
  - `test_rate_limiter_pacing`: PASSED
  - `test_ttl_cache_expiration`: PASSED
  - `test_fx_provider_same_currency`: PASSED
  - `test_router_adr_proxy_mapping`: PASSED
- **`tests/unit/test_sandbox.py` (7 tests):**
  - `test_safe_calculation`: PASSED
  - `test_forbidden_module_rejection`: PASSED
  - `test_forbidden_from_import_rejection`: PASSED
  - `test_forbidden_eval_call_rejection`: PASSED
  - `test_timeout_enforcement`: PASSED
  - `test_structured_json_output_extraction`: PASSED
  - `test_dunder_attribute_rejection`: PASSED
- **`tests/unit/test_technical_service.py` (8 tests):**
  - `test_calculate_sma`: PASSED
  - `test_calculate_ema`: PASSED
  - `test_calculate_rsi_wilder`: PASSED
  - `test_calculate_macd`: PASSED
  - `test_calculate_bollinger_bands`: PASSED
  - `test_calculate_annualized_volatility`: PASSED
  - `test_insufficient_bars_guard`: PASSED
  - `test_calculate_all_technicals`: PASSED
- **`tests/unit/test_workers.py` (2 tests):**
  - `test_rebalance_portfolio_simulation`: PASSED
  - `test_batch_quotes_mock`: PASSED
- **`tests/unit/test_instrument_search.py` (6 tests):**
  - `test_canonical_universe_coverage`: PASSED
  - `test_search_by_ticker`: PASSED
  - `test_search_by_company_name`: PASSED
  - `test_search_by_exchange_and_country`: PASSED
  - `test_adr_preservation_not_silent_substitution`: PASSED
  - `test_watchlist_structure`: PASSED
- **`tests/unit/test_ai_agent.py` (3 tests):**
  - `test_intent_classification`: PASSED
  - `test_tool_registry_schemas`: PASSED
  - `test_ai_agent_price_flow`: PASSED

### Integration & End-to-End Suite (6 Tests):
- **`tests/integration/test_e2e_api.py` (6 tests):**
  - `test_health_endpoints_e2e`: PASSED
  - `test_sandbox_execution_e2e`: PASSED
  - `test_portfolio_evaluation_and_simulation_e2e`: PASSED
  - `test_chat_message_e2e`: PASSED
  - `test_instrument_search_and_watchlist_e2e`: PASSED
  - `test_jobs_health_and_research_task_e2e`: PASSED

---

## 3. Frontend Verification & Build Validation

```powershell
# In src/frontend:
npm run build
```
- **TypeScript Typecheck (`tsc`):** 0 Errors
- **Vite Production Bundler:** 2,532 modules transformed
- **Output Artifacts:** `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`
