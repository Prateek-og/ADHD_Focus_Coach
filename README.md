# ADHD Focus Coach / Focus Buddy

End-to-end prototype: Next.js web app + FastAPI backend, with real task,
focus, feedback, and progress APIs, a hybrid SVG/Rive avatar, and a point-gated
accessory Market.

---

## 1. Prerequisites

- **Node.js 20+** and npm
- **Python 3.11+** (a virtualenv already exists at `backend/.venv`)
- **PostgreSQL** and **Redis** reachable from the backend
- **Clerk** keys (frontend publishable key + backend secret key / JWKS URL)
- **Ollama** with `qwen2.5:7b`, or an OpenAI API key

---

## 2. First-time setup

### Backend

```powershell
cd ADHD_Focus_Coach\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements_win.txt
```

Create `backend/.env` (gitignored — never commit it):

```dotenv
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b
```

Optional: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_BREAKDOWN_DAILY_LIMIT`,
`AI_PROMPT_VERSION`, `AI_RESPONSE_CACHE_TTL_SECONDS`.

> **Important:** `Settings` loads `.env` from the **current working directory**.
> Always start uvicorn from inside `backend/`, not from the repository root.

### Frontend

```powershell
cd ADHD_Focus_Coach\frontend
npm install
```

Create `frontend/.env.local` (gitignored) with your Clerk keys:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
```

`NEXT_PUBLIC_API_URL` is optional; it defaults to `http://127.0.0.1:8001`.

---

## 3. Run locally

Use **two terminals**, both started from the `ADHD_Focus_Coach` folder.

**Terminal 1 — backend API (port 8001):**

```powershell
cd ADHD_Focus_Coach\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

**Terminal 2 — web app (port 3000):**

```powershell
cd ADHD_Focus_Coach\frontend
npm run dev
```

Then open:

| What | URL |
|---|---|
| Web app | http://localhost:3000 |
| API docs (Swagger) | http://127.0.0.1:8001/docs |
| API health | http://127.0.0.1:8001/openapi.json |

Sign in with Clerk, then use Today → Start to run a focus session.
The Rive avatar files are served from `frontend/public/rive/` at
`/rive/ducky.riv`, `/rive/robo.riv`, `/rive/snek.riv`, `/rive/sobo.riv`.

### Production-style build (frontend)

```powershell
cd ADHD_Focus_Coach\frontend
npm run build
npm start
```

`npm start` serves the production build on port 3000.

---

## 4. Verify everything

```powershell
# Backend — full test suite (offline: AI + guardrails are mocked)
cd ADHD_Focus_Coach\backend
$env:PYTHONIOENCODING='utf-8'
.\.venv\Scripts\python.exe -m pytest tests -q
# expected: 16 passed, 1 skipped

# Contract tests only
.\.venv\Scripts\python.exe -m pytest tests/test_contracts.py -q
# expected: 5 passed

# Frontend
cd ..\frontend
npm run lint      # expected: no errors
npm run build     # expected: compiled successfully
```

The single skipped test is the device-router test; the device router is
intentionally disabled until that module is integrated.

---

## 5. Project layout

```
ADHD_Focus_Coach/
├── backend/
│   ├── app/api/          # FastAPI routers (auth, child, task, feedback, progress, telemetry)
│   ├── app/services/     # focus, AI, progress, notification services
│   ├── tests/            # contract + route tests (hermetic, no network)
│   └── .env              # gitignored
├── frontend/
│   ├── src/app/          # Next.js pages (/, /login, /signup, /child, /tasks, /progress, /focus/[taskId])
│   ├── src/lib/          # API client + collectibles/accessory rules
│   ├── public/rive/      # .riv avatar assets
│   └── .env.local        # gitignored
├── README.md             # this file
└── RUNBOOK.md            # detailed setup, rules, QA checklist, troubleshooting
```

---

## 6. Good to know

- Backend API version: `1.1`. The `device_router` is disabled on purpose.
- Accessories: Cap and Bow are free; Glasses unlock at 200 pts, Scarf at 300.
  Snek allows no accessories, Robo no glasses, Sobo no cap.
- Selecting a Rive buddy replaces the SVG dog as the main avatar; accessories
  are SVG overlays on top.
- The build prints a non-blocking warning about Next.js `middleware` being
  deprecated in favour of `proxy`.

Full operational details are in [RUNBOOK.md](RUNBOOK.md).
