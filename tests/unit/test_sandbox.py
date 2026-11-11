"""
Unit Tests for Python Analytical Execution Sandbox
Verifies AST validation, safe calculation, forbidden import blocking, and timeout enforcement.
"""
import pytest
from src.backend.sandbox.executor import sandbox_executor, SandboxSecurityError

@pytest.mark.asyncio
async def test_safe_calculation():
    code = "print(sum([x**2 for x in range(10)]))"
    result = await sandbox_executor.execute_code(code, timeout_seconds=3.0)
    assert result.success is True
    assert result.stdout.strip() == "285"
    assert result.error is None
    assert result.execution_time_ms > 0

@pytest.mark.asyncio
async def test_forbidden_module_rejection():
    code = "import os\nprint(os.getcwd())"
    result = await sandbox_executor.execute_code(code)
    assert result.success is False
    assert "Forbidden import 'os'" in result.error

@pytest.mark.asyncio
async def test_forbidden_from_import_rejection():
    code = "from subprocess import Popen\nprint('pwned')"
    result = await sandbox_executor.execute_code(code)
    assert result.success is False
    assert "Forbidden import 'subprocess'" in result.error

@pytest.mark.asyncio
async def test_forbidden_eval_call_rejection():
    code = "x = eval('2 + 2')\nprint(x)"
    result = await sandbox_executor.execute_code(code)
    assert result.success is False
    assert "Forbidden call to 'eval()'" in result.error

@pytest.mark.asyncio
async def test_timeout_enforcement():
    # Infinite loop must abort when timeout triggers
    code = "while True:\n    pass"
    result = await sandbox_executor.execute_code(code, timeout_seconds=1.0)
    assert result.success is False
    assert "exceeded strict limit of 1.0 seconds" in result.error

@pytest.mark.asyncio
async def test_structured_json_output_extraction():
    code = "import json\nres = {'status': 'calculated', 'roi': 15.5, 'symbol': 'NVDA'}\nprint(json.dumps(res))"
    result = await sandbox_executor.execute_code(code)
    assert result.success is True
    assert result.output_data is not None
    assert result.output_data["roi"] == 15.5
    assert result.output_data["symbol"] == "NVDA"

@pytest.mark.asyncio
async def test_dunder_attribute_rejection():
    code = "().__class__.__bases__[0].__subclasses__()"
    result = await sandbox_executor.execute_code(code)
    assert result.success is False
    assert "Forbidden attribute access" in result.error

