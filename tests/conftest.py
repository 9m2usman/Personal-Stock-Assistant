"""
Global Pytest Configuration and Environment Patches for Windows Sandbox
"""
import sys
import os
import pytest

# Windows Sandbox loopback socket and IOCP completion port cleanup mitigation
if sys.platform == "win32":
    import asyncio
    import asyncio.windows_events
    import _winapi

    class _SandboxDummySocket:
        def fileno(self): return -1
        def setblocking(self, b): pass
        def close(self): pass
        def send(self, b): return len(b)

    asyncio.windows_events.ProactorEventLoop._make_self_pipe = lambda self: (
        setattr(self, '_ssock', _SandboxDummySocket()),
        setattr(self, '_csock', _SandboxDummySocket()),
        setattr(self, '_self_reading_future', None),
        setattr(self, '_internal_fds', getattr(self, '_internal_fds', 0) + 1)
    )
    asyncio.windows_events.ProactorEventLoop._close_self_pipe = lambda self: None
    asyncio.windows_events.ProactorEventLoop._loop_self_reading = lambda self, f=None: None

    _orig_poll = asyncio.windows_events.IocpProactor._poll

    def _bounded_poll(self, timeout=None):
        # Bound infinite timeouts to 20ms so threadsafe worker callbacks (e.g. aiosqlite)
        # are reliably pumped without relying on blocked loopback sockets.
        if timeout is None or timeout > 0.02:
            timeout = 0.02
        return _orig_poll(self, timeout)

    asyncio.windows_events.IocpProactor._poll = _bounded_poll

    def _patched_iocp_close(self):
        if self._iocp is None:
            return
        self._cache.clear()
        self._results = []
        try:
            _winapi.CloseHandle(self._iocp)
        except Exception:
            pass
        self._iocp = None

    asyncio.windows_events.IocpProactor.close = _patched_iocp_close

def pytest_unconfigure(config):
    """Ensure clean process exit on Windows sandbox without hanging on lingering threads/sockets."""
    if sys.platform == "win32":
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
