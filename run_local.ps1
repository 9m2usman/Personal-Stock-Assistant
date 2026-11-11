# AI Stock Market Assistant - Local Development Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AI Stock Market Assistant - Local Development Launcher  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check Python environment
Write-Host "[1/3] Verifying Python backend dependencies..." -ForegroundColor Yellow
python -c "import fastapi, sqlalchemy, pydantic, celery, openpyxl; print('Python dependencies verified.')"

# Check Node environment
Write-Host "[2/3] Verifying React frontend..." -ForegroundColor Yellow
if (-not (Test-Path "src/frontend/dist")) {
    Write-Host "Building frontend assets..." -ForegroundColor Yellow
    Push-Location "src/frontend"
    npm run build
    Pop-Location
}
Write-Host "Frontend verified." -ForegroundColor Green

# Launch instructions
Write-Host "[3/3] Ready to launch!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the FastAPI Backend server:" -ForegroundColor White
Write-Host "    uvicorn src.backend.main:app --reload --port 8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the React 19 Frontend dev server:" -ForegroundColor White
Write-Host "    cd src/frontend ; npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or launch the full containerized stack via Docker Compose:" -ForegroundColor White
Write-Host "    docker compose up --build" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
