@echo off
title INKVECTOR - Redis Server
cd /d %~dp0
echo ===================================================
echo Starting INKVECTOR Redis Server on Port 6379...
echo ===================================================
.\tools\redis\redis-server.exe .\tools\redis\redis.windows.conf
pause
