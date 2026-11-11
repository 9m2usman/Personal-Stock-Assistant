# INKVECTOR — Celery Background Task Processing End-to-End Verification

## 1. System Overview

Celery powers asynchronous background task processing for INKVECTOR, ensuring long-running operations—such as deep equity research compilation, global stock universe synchronization, and heavy quantitative simulations—do not block FastAPI event loop workers or HTTP client response times.

- **Broker:** `redis://127.0.0.1:6379/1`
- **Result Backend:** `redis://127.0.0.1:6379/2`
- **Execution Pool:** `solo` (optimal for Windows environments)
- **App Module:** `src.backend.workers.celery_app:celery_app`

---

## 2. Background Task Registry

| Task Name | Signature | Purpose |
| :--- | :--- | :--- |
| `tasks.ping_system` | `ping_system(payload: str)` | Zero-cost health check and round-trip broker latency verification. |
| `tasks.sync_catalog_task` | `sync_catalog_task(source: str)` | Background SEC EDGAR (10,405 public equities) or curated sync. |
| `tasks.generate_deep_research_report` | `generate_deep_research_report(symbol: str)` | Compiles comprehensive equity research dossier across 3 providers. |

---

## 3. End-to-End Verification Evidence

### Step 1: Enqueue via Python REPL or API
```python
from src.backend.workers.tasks import ping_system
task = ping_system.delay("Institutional-End-To-End-Test")
print("Enqueued Task ID:", task.id)
```

### Step 2: Celery Worker Processing Log
```
[2026-11-11 21:35:55,758: INFO/MainProcess] Task tasks.ping_system[57aaae91-38cb-402a-995c-3f25c7eb2212] received
[2026-11-11 21:35:55,759: INFO/MainProcess] Executing Celery ping_system test task (ID: 57aaae91-38cb-402a-995c-3f25c7eb2212, payload: Institutional-End-To-End-Test)
[2026-11-11 21:35:55,763: INFO/MainProcess] Task tasks.ping_system[57aaae91-38cb-402a-995c-3f25c7eb2212] succeeded in 0.005s: {'task_id': '57aaae91-38cb-402a-995c-3f25c7eb2212', 'echo': 'Institutional-End-To-End-Test', 'status': 'SUCCESS', 'worker_verified': True}
```

### Step 3: Result Retrieval from Redis Backend
```python
result = task.get(timeout=5.0)
assert task.state == "SUCCESS"
assert result["status"] == "SUCCESS"
assert result["echo"] == "Institutional-End-To-End-Test"
```

---

## 4. REST API Integration

Clients track background tasks via the `/api/v1/jobs` endpoints:
- `POST /api/v1/jobs/research`: Enqueues an equity research task; returns `{ "task_id": "...", "status": "SUBMITTED" }`.
- `GET /api/v1/jobs/status/{task_id}`: Polls task state (`PENDING`, `STARTED`, `SUCCESS`, `FAILURE`) and extracts result payload upon completion.
- `GET /api/v1/jobs/health`: Verifies Redis ping, active workers, and queue depths.
