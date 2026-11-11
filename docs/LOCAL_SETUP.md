# Local Development Setup Guide

**Project:** AI Stock Market Assistant  
**Repository:** `https://github.com/9m2usman/Personal-Stock-Assistant`  
**Working Directory:** `E:\finTech-inkVector`  

---

## 1. Environment Requirements
- **Operating System:** Windows 10/11, macOS, or Linux
- **Python:** 3.12+ (Tested on Python 3.14.10)
- **Node.js:** 20+ (Tested on v24.15.0 with npm 11.12.1)
- **Git:** 2.40+ (Tested on 2.49.0)

---

## 2. Windows PowerShell Quickstart Commands

### A. Environment Configuration
Verify that `.env` is present in the project root:
```powershell
# Copy the template if starting fresh
Copy-Item .env.example .env
```
Ensure your `.env` contains your valid API keys:
```dotenv
ALPHA_VANTAGE_API_KEY=your_key
TWELVE_DATA_API_KEY=your_key
FMP_API_KEY=your_key
NEWSAPI_API_KEY=your_key
NASDAQ_DATA_LINK_API_KEY=your_key
```

### B. Install Python Dependencies
```powershell
python -m pip install -e .
```

### C. Run Automated Tests
```powershell
python -m pytest tests/unit -v
```

### D. Start Backend Server
```powershell
python -m uvicorn src.backend.main:app --reload --port 8000
```
- Interactive Swagger API Documentation: `http://localhost:8000/docs`
- ReDoc API Documentation: `http://localhost:8000/redoc`
- System Healthcheck Endpoint: `http://localhost:8000/api/v1/health`

### E. Start Frontend Development Server
```powershell
Set-Location src/frontend
npm install
npm run dev
```
- Frontend Application URL: `http://localhost:5173`

---

## 3. Git Workflow & Remote Repository
The repository is tracked cleanly with `.gitignore` strictly excluding secrets (`.env`), cache folders, and build artifacts:
```powershell
git status
git add .
git commit -m "feat: complete Phase 0 foundation and architecture setup"
git push -u origin master
```
