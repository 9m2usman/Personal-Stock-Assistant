# INKVECTOR — Native Windows Redis Server Setup & Protocol Compatibility

## 1. Zero-Docker Native Windows Architecture

To eliminate reliance on Docker, Linux virtual machines (WSL2), or third-party paid services, INKVECTOR embeds a lightweight, zero-dependency, native Windows port of Redis:

- **Location:** `E:\finTech-inkVector\tools\redis\`
- **Core Binary:** `tools/redis/redis-server.exe`
- **CLI Utility:** `tools/redis/redis-cli.exe`
- **Configuration:** `tools/redis/redis.windows.conf`
- **Default Port:** `6379` (Bound to `127.0.0.1` loopback)

---

## 2. Resolving Celery 5.7 / Kombu 5.5 Protocol Compatibility

Modern versions of Celery (v5.7) and Kombu (v5.5) with `redis-py` (v5.x+) assume modern Redis 7.x+ running on Linux and default to the **RESP3** protocol. When connecting to native Windows Redis ports, modern Celery fails with:
1. `Cannot connect to redis: unknown command HELLO with args beginning with 3` (RESP3 handshake rejected).
2. `redis.exceptions.RedisError: Maintenance notifications are only supported with hiredis and RESP3 parsers`.
3. `redis.exceptions.ResponseError: Error running script: @user_script:5: ERR syntax error` (Kombu's `REFRESH_BINDING` Lua script uses `ZADD ... 'GT'` which is only supported in Redis 6.2+).
4. `redis.exceptions.ResponseError: value is not an integer or out of range` in `client.zrange(byscore=True)`.

### Applied Compatibility Shims (`src/backend/workers/celery_app.py`)
INKVECTOR solves all four compatibility bottlenecks cleanly:

1. **RESP2 Protocol Enforcement:**
   Monkey-patched `ConnectionPool.__init__` to disable maintenance notifications and force protocol version 2:
   ```python
   from redis.connection import MaintNotificationsConfig
   kwargs["protocol"] = 2
   kwargs["maint_notifications_config"] = MaintNotificationsConfig(enabled=False)
   ```

2. **Kombu Lua Script Compatibility Patch:**
   Patched `kombu.transport.redis.REFRESH_BINDING` to remove the unsupported `GT` flag, allowing standard ZADD updates on all Redis versions:
   ```python
   kombu.transport.redis.REFRESH_BINDING = kombu.transport.redis.REFRESH_BINDING.replace(", 'GT',", ",")
   ```

3. **`zrange` Legacy Score Shim:**
   Redirects modern `client.zrange(..., byscore=True)` calls to backward-compatible `zrevrangebyscore` and `zrangebyscore` commands.

---

## 3. Operational Management

### Launch Redis Server
Double-click `start_redis.bat` or run:
```cmd
tools\redis\redis-server.exe tools\redis\redis.windows.conf
```

### Ping & Diagnostic Verification
```cmd
tools\redis\redis-cli.exe ping
# Returns: PONG
```

### Dedicated Launch Scripts
- `start_redis.bat`: Starts the background native Redis server.
- `start_celery.bat`: Starts the Celery solo-pool worker with protocol patches.
- `start_all.bat`: Comprehensive multi-process launcher starting Redis, Celery, FastAPI, and Vite simultaneously.
