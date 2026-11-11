"""
Python Analytical Execution Sandbox
Provides safe, isolated evaluation of mathematical, portfolio, and quantitative algorithms.
Enforces strict timeouts, AST safety inspections, import restrictions, and structured output parsing.
"""
from typing import Optional, Dict, Any, List
import ast
import asyncio
import sys
import time
import json
import subprocess
from pydantic import BaseModel
from src.backend.core.logging import logger

class SandboxExecutionResult(BaseModel):
    success: bool
    stdout: str
    stderr: str
    execution_time_ms: float
    error: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None

class SandboxSecurityError(Exception):
    """Raised when code violates sandbox security rules or imports forbidden modules."""
    pass

class PythonSandboxExecutor:
    """Subprocess-isolated Python sandbox with strict AST validation."""

    # Disallowed modules that could access host OS or network
    FORBIDDEN_MODULES = {
        "os", "sys", "subprocess", "socket", "http", "urllib", "requests", "httpx",
        "shutil", "ctypes", "multiprocessing", "threading", "pty", "posix",
        "builtins", "importlib", "pathlib", "tempfile", "signal", "inspect", "pickle"
    }

    FORBIDDEN_CALLS = {
        "eval", "exec", "compile", "open", "__import__", "globals", "locals",
        "getattr", "setattr", "delattr", "input", "exit", "quit"
    }

    FORBIDDEN_ATTRIBUTES = {
        "__subclasses__", "__builtins__", "__globals__", "__code__", "__reduce__",
        "__class__", "__bases__", "__mro__"
    }

    def __init__(self, default_timeout_seconds: float = 5.0):
        self.default_timeout_seconds = default_timeout_seconds

    def validate_code_ast(self, code_str: str) -> None:
        """Parses AST to verify that no forbidden modules, file operations, dunder leaks or unsafe calls exist."""
        try:
            tree = ast.parse(code_str)
        except SyntaxError as e:
            raise SandboxSecurityError(f"Syntax Error: {e.msg} at line {e.lineno}")

        for node in ast.walk(tree):
            # Check import foo
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_pkg = alias.name.split(".")[0]
                    if root_pkg in self.FORBIDDEN_MODULES:
                        raise SandboxSecurityError(f"Forbidden import '{root_pkg}' is blocked by sandbox security policy.")

            # Check from foo import bar
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root_pkg = node.module.split(".")[0]
                    if root_pkg in self.FORBIDDEN_MODULES:
                        raise SandboxSecurityError(f"Forbidden import '{root_pkg}' is blocked by sandbox security policy.")

            # Check forbidden function calls
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in self.FORBIDDEN_CALLS:
                        raise SandboxSecurityError(f"Forbidden call to '{node.func.id}()' is blocked by sandbox security policy.")

            # Check forbidden attribute access (dunder introspection)
            elif isinstance(node, ast.Attribute):
                if node.attr in self.FORBIDDEN_ATTRIBUTES:
                    raise SandboxSecurityError(f"Forbidden attribute access '{node.attr}' is blocked by sandbox security policy.")

    async def execute_code(
        self,
        code_str: str,
        timeout_seconds: Optional[float] = None
    ) -> SandboxExecutionResult:
        """Executes code in an isolated Python subprocess with stdout capture and timeout."""
        timeout = timeout_seconds or self.default_timeout_seconds

        # 1. Validate AST before spawning subprocess
        try:
            self.validate_code_ast(code_str)
        except SandboxSecurityError as e:
            logger.warning("Sandbox blocked dangerous code: %s", e)
            return SandboxExecutionResult(
                success=False,
                stdout="",
                stderr="",
                execution_time_ms=0.0,
                error=str(e)
            )

        start_time = time.perf_counter()

        # Wrap code to run in a separate subprocess
        proc = None
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-c",
                code_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            stdout_str = stdout_bytes.decode(errors="replace")
            stderr_str = stderr_bytes.decode(errors="replace")

            success = (proc.returncode == 0)

            # Try to extract structured JSON output if present
            output_data = None
            if success and stdout_str.strip():
                try:
                    # Check if entire stdout or last line is JSON
                    lines = [ln.strip() for ln in stdout_str.strip().splitlines() if ln.strip()]
                    for candidate in [stdout_str.strip(), lines[-1]]:
                        if candidate.startswith("{") and candidate.endswith("}"):
                            output_data = json.loads(candidate)
                            break
                except Exception:
                    output_data = None

            return SandboxExecutionResult(
                success=success,
                stdout=stdout_str,
                stderr=stderr_str,
                execution_time_ms=round(elapsed_ms, 2),
                error=stderr_str if not success else None,
                output_data=output_data
            )

        except asyncio.TimeoutError:
            if proc:
                try:
                    proc.kill()
                    if sys.platform == "win32":
                        # Ensure tree kill on Windows
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                            capture_output=True,
                            timeout=2.0
                        )
                    await proc.wait()
                except Exception:
                    pass
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxExecutionResult(
                success=False,
                stdout="",
                stderr="Execution timed out.",
                execution_time_ms=round(elapsed_ms, 2),
                error=f"Execution exceeded strict limit of {timeout} seconds."
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxExecutionResult(
                success=False,
                stdout="",
                stderr=str(e),
                execution_time_ms=round(elapsed_ms, 2),
                error=str(e)
            )

sandbox_executor = PythonSandboxExecutor()
