@echo off
title AI Stock Market Assistant - Backend (Port 8000)
echo ========================================================
echo   Starting FastAPI Backend Server on http://localhost:8000
echo ========================================================
python -m uvicorn src.backend.main:app --reload --port 8000
pause
