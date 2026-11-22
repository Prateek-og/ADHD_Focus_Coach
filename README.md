# ADHD Focus Coach / Focus Buddy

End-to-end prototype: Next.js web app + FastAPI backend, with real task,
focus, feedback, and progress APIs, a hybrid SVG/Rive avatar, and a point-gated
accessory Market.

## Quick start

```powershell
# Backend (must run from backend/ so .env is found)
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm run dev
```

Then open `http://localhost:3000`.

## Verify

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q      # 16 passed, 1 skipped

cd ../frontend
npm run lint
npm run build
```

## Documentation

See [RUNBOOK.md](RUNBOOK.md) for setup, architecture, test strategy, avatar /
accessory rules, router state, known issues, and the manual QA checklist.
