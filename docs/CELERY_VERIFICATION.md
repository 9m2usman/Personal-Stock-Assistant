# AI Stock Market Assistant — Celery & Redis Worker Verification

**Document Purpose:** Distributed Task Queue Verification, Worker Pooling, and Health Diagnostic Telemetry

---

## 1. Celery Architecture & Configuration

The asynchronous background processing engine in `src/backend/workers/` executes long-running analytical tasks:
- **Application Instance:** `celery_app = Celery("personal_stock_assistant", broker=REDIS_URL, backend=REDIS_URL)`
- **Broker & Result Backend:** Backed by Redis (`redis://localhost:6379/0`).
- **Serializer:** Strict JSON serialization (`task_serializer="json"`, `accept_content=["json"]`).
- **Time Limits:** Soft time limit of 240 seconds; hard limit of 300 seconds.
- **TTL:** Results expire after 86,400 seconds (24 hours).
- **Graceful Eager Fallback:** Controlled by `CELERY_TASK_ALWAYS_EAGER`. If local Redis is offline, Celery runs synchronously in the caller thread, guaranteeing zero downtime or hard crashes during local testing.

---

## 2. Registered Domain Tasks

The worker registers 3 core domain tasks in `src/backend/workers/tasks.py`:

1. `tasks.generate_deep_research_report(symbol: str)`
   - Asynchronously gathers quotes, technical indicators, audited 3-statement financials, and recent news articles.
   - Compiles an institutional research memo with valuation multiples and sentiment summary.
   - Updates task state to `STARTED` with progress metadata.
2. `tasks.batch_fetch_market_quotes(symbols: List[str])`
   - Concurrently fetches normalized quotes across a list of tickers.
3. `tasks.rebalance_portfolio_simulation(current_holdings, target_weights)`
   - Computes target capital reallocation, turnover ratios, and buy/sell execution plans.

---

## 3. Windows Worker Execution Protocol

On Windows platforms, Celery's default `prefork` pool is incompatible with the Windows process management model. A dedicated execution pool must be used:

### Windows Worker Launch Command:
```powershell
# From project root:
celery -A src.backend.workers.celery_app worker --loglevel=info --pool=solo
```

The `--pool=solo` flag instructs Celery to run tasks inside the main worker process without fork-based concurrency, preventing Windows IPC deadlocks and memory corruption.

---

## 4. Health Diagnostic Telemetry Endpoint

The rescue effort introduced an automated health diagnostic endpoint:

### `GET /api/v1/jobs/health`

**Sample Response (Redis Offline / Eager Mode):**
```json
{
  "status": "EAGER_MODE_ACTIVE",
  "broker_url": "redis://localhost:6379/0",
  "redis_connection": "DISCONNECTED",
  "redis_ping_latency_ms": null,
  "redis_error": "Connection timed out",
  "task_always_eager": true,
  "registered_domain_tasks": [
    "tasks.generate_deep_research_report",
    "tasks.batch_fetch_market_quotes",
    "tasks.rebalance_portfolio_simulation"
  ],
  "timezone": "UTC",
  "task_time_limit_sec": 300
}
```

**Sample Response (Redis Online):**
```json
{
  "status": "HEALTHY",
  "broker_url": "redis://localhost:6379/0",
  "redis_connection": "CONNECTED",
  "redis_ping_latency_ms": 1.45,
  "redis_error": null,
  "task_always_eager": false,
  "registered_domain_tasks": [
    "tasks.generate_deep_research_report",
    "tasks.batch_fetch_market_quotes",
    "tasks.rebalance_portfolio_simulation"
  ],
  "timezone": "UTC",
  "task_time_limit_sec": 300
}
```

---

## 5. Automated Verification Results

- `tests/unit/test_workers.py::test_rebalance_portfolio_simulation`: **PASSED**
- `tests/unit/test_workers.py::test_batch_quotes_mock`: **PASSED**
- `tests/integration/test_e2e_api.py::test_jobs_health_and_research_task_e2e`: **PASSED**
