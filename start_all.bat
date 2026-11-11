@echo off
title AI Stock Market Assistant Launcher
echo ========================================================
echo   Launching AI Stock Market Assistant (No Docker Needed)
echo ========================================================
echo Starting Backend in a new window...
start "Backend (FastAPI)" cmd /c start_backend.bat

echo Starting Frontend in a new window...
start "Frontend (React 19)" cmd /c start_frontend.bat

echo.
echo Both servers have been launched!
echo - Web Dashboard: http://localhost:3000
echo - Swagger API Docs: http://localhost:8000/docs
echo.
pause
