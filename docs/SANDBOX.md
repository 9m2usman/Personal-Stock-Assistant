# AI Stock Market Assistant — Python Analytical Execution Sandbox

**Architecture Document:** Isolation Boundaries, AST Security Policies, and Execution Verification

---

## 1. Architectural Purpose

Quantitative stock research, what-if portfolio simulations, and financial scenario models require running dynamic mathematical code. The Python Analytical Sandbox guarantees that arbitrary user or AI-generated calculations run in an isolated execution environment, completely separate from the core FastAPI application process.

---

## 2. Security & Isolation Mechanism

### Local Windows Development Environment:
In local development on Windows, subprocess-level process isolation is combined with strict AST (Abstract Syntax Tree) pre-execution inspection:

1. **AST Security Pre-Validation:**
   Before any subprocess is created, `validate_code_ast()` inspects the parsed syntax tree. The execution is blocked immediately if:
   - **Forbidden Modules are Imported:** `os`, `sys`, `subprocess`, `socket`, `http`, `urllib`, `requests`, `httpx`, `shutil`, `ctypes`, `multiprocessing`, `threading`, `pty`, `posix`, `builtins`, `importlib`, `pathlib`, `tempfile`, `signal`, `inspect`, `pickle`.
   - **Dangerous Built-ins are Called:** `eval()`, `exec()`, `compile()`, `open()`, `__import__()`, `globals()`, `locals()`, `getattr()`, `setattr()`, `delattr()`, `input()`.
   - **Dunder Introspection Attributes are Accessed:** `__subclasses__`, `__builtins__`, `__globals__`, `__code__`, `__class__`, `__bases__`, `__mro__`.
2. **Subprocess Process Boundary:**
   Code executes in an independent `python.exe` process spawned with `asyncio.create_subprocess_exec()` using `-c`.
3. **Execution Timeout Enforcement:**
   Calls are governed by an `asyncio.wait_for(timeout=...)` guard (default 5.0 seconds). If a timeout occurs:
   - The process is terminated.
   - On Windows, a process tree kill (`taskkill /F /T /PID <pid>`) is executed to ensure no orphan child processes remain.
4. **Structured JSON Output Extraction:**
   If the script outputs valid JSON (or a dictionary), it is automatically extracted into `SandboxExecutionResult.output_data`.

### Production / Containerized Architecture (Linux / AWS):
In production, the sandbox runs inside a dedicated, non-privileged Docker container or AWS Lambda sandbox:
- **Rootless Execution:** Runs under an unprivileged `nobody` UID.
- **Read-Only Root Filesystem:** Prevents filesystem persistence.
- **Dropped Linux Capabilities:** `cap_drop: ALL`.
- **Network Isolation:** `--network none` (zero egress/ingress).
- **Resource Limits:** `mem_limit: 256m`, `cpus: 0.5`.

---

## 3. Verification & Smoke Test Results

All sandbox capabilities are covered in `tests/unit/test_sandbox.py` and `tests/integration/test_e2e_api.py`:

```powershell
pytest tests/unit/test_sandbox.py -v
```

### Verified Test Cases:
| Test Case | Description | Result |
| :--- | :--- | :---: |
| `test_safe_calculation` | Evaluates quadratic summation `sum([x**2 for x in range(10)])` | **PASSED** (Output: `285`) |
| `test_forbidden_module_rejection` | Rejects `import os; print(os.getcwd())` | **PASSED** (Blocked by AST) |
| `test_forbidden_from_import_rejection` | Rejects `from subprocess import Popen` | **PASSED** (Blocked by AST) |
| `test_forbidden_eval_call_rejection` | Rejects `eval('2 + 2')` | **PASSED** (Blocked by AST) |
| `test_timeout_enforcement` | Rejects infinite loop `while True: pass` after 1.0s | **PASSED** (Terminated) |
| `test_structured_json_output_extraction` | Parses `json.dumps({'roi': 15.5})` into `output_data` | **PASSED** (`output_data["roi"] == 15.5`) |
| `test_dunder_attribute_rejection` | Rejects `().__class__.__bases__[0].__subclasses__()` | **PASSED** (Blocked by AST) |
| `test_sandbox_execution_e2e` | ASGI POST `/api/v1/sandbox/execute` evaluating `math.sqrt(144.0)` | **PASSED** (Output: `12.0`) |
