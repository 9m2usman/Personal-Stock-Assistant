@echo off
title INKVECTOR - Celery Background Worker
cd /d %~dp0
echo ===================================================
echo Starting INKVECTOR Celery Worker (Pool: Solo)...
echo ===================================================
python -m celery -A src.backend.workers.celery_app worker -P solo -l info
pause
