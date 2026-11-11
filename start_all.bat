@echo off
title INKVECTOR Platform Launcher
echo ========================================================
echo   Launching INKVECTOR Platform (Zero-Docker Full Stack)
echo ========================================================
echo Starting Redis Server on Port 6379...
start "Redis Server" cmd /c start_redis.bat

timeout /t 2 /nobreak >nul

echo Starting Celery Background Worker...
start "Celery Worker" cmd /c start_celery.bat

echo Starting Backend API (FastAPI) on Port 8000...
start "Backend (FastAPI)" cmd /c start_backend.bat

echo Starting Frontend UI (React 19) on Port 3000...
start "Frontend (React 19)" cmd /c start_frontend.bat

echo.
echo ========================================================
echo   All 4 INKVECTOR services launched successfully!
echo   - Web Terminal:    http://localhost:3000
echo   - Swagger API:      http://localhost:8000/docs
echo   - Redis Broker:     127.0.0.1:6379
echo   - Celery Worker:    Pool: solo (Active)
echo ========================================================
echo.
pause
