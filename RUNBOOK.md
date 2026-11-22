# Focus Buddy / ADHD Focus Coach — Runbook

Local development, verification, and hand-off notes for the completed
end-to-end prototype (Phases 0–5).

---

## 1. What this project is

| Layer | Tech | Location |
|---|---|---|
| Web app | Next.js 16 (App Router), React 19, Tailwind 4 | `frontend/` |
| API | FastAPI modular monolith | `backend/app/` |
| Database | PostgreSQL (`DATABASE_URL`) | external |
| Cache / idempotency / rate limits | Redis (`REDIS_URL`) | external |
| Auth | Clerk (`CLERK_SECRET_KEY`, `CLERK_JWKS_URL`) | external |
| AI | Ollama (default) or OpenAI, NeMo Guardrails | `backend/app/ai/`, `backend/app/guardrails/` |
| Avatar | SVG dog (default) + Rive collectibles | `frontend/public/rive/` |

The frontend is a prototype shell backed by **real** task, focus, feedback,
and progress APIs. Authentication still uses Clerk.

---

## 2. Prerequisites

- Node.js 20+ and npm
- Python 3.11+ (Windows venv already present at `backend/.venv`)
- PostgreSQL and Redis reachable from the backend
- Clerk keys (frontend publishable key + backend secret key / JWKS URL)
- Ollama with `qwen2.5:7b` (or set `AI_PROVIDER=openai`)

---

## 3. First-time setup

### Backend

```powershell
cd ADHD_Focus_Coach\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements_win.txt
```

Create `backend/.env` (gitignored) with at least:

```dotenv
DATABASE_URL=postgresql+psycopg://...
REDIS_URL=redis://...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://.../.well-known/jwks.json
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b
```

Optional: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_BREAKDOWN_DAILY_LIMIT`,
`AI_PROMPT_VERSION`, `AI_RESPONSE_CACHE_TTL_SECONDS`.

> **Important:** `Settings` reads `.env` from the **current working directory**.
> Always start uvicorn from `backend/`, not from the repository root.

### Frontend

```powershell
cd ADHD_Focus_Coach\frontend
npm install
```

Create `frontend/.env.local` (gitignored) with your Clerk keys and, if needed,
`NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:8001`).

---

## 4. Running locally

Two terminals:

```powershell
# Terminal 1 — API
cd ADHD_Focus_Coach\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

```powershell
# Terminal 2 — web app
cd ADHD_Focus_Coach\frontend
npm run dev
```

- Web: `http://localhost:3000`
- API docs: `http://127.0.0.1:8001/docs`
- Health check: `http://127.0.0.1:8001/openapi.json`

---

## 5. Verification

### Backend tests (hermetic — no Ollama, Guardrails, or Clerk calls)

```powershell
cd ADHD_Focus_Coach\backend
$env:PYTHONIOENCODING='utf-8'
.\.venv\Scripts\python.exe -m pytest tests -q
```

Expected: **16 passed, 1 skipped** (the skip is the device-router test; see §7).

`tests/conftest.py` stubs:
- `app.services.ai_service.get_ai_provider` → deterministic offline provider
- `GuardrailsService.check_input` / `check_output` → no-ops

Tests that touch Redis use unique IDs/keys so repeated runs stay isolated.

Contract-only tests (Phase 1):

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_contracts.py -q
```

Expected: **5 passed**.

### Frontend checks

```powershell
cd ADHD_Focus_Coach\frontend
npm run lint     # 0 errors
npm run build    # compiles; Next.js 16 build
```

The build emits one known warning: `middleware` file convention deprecated in
favour of `proxy`. It is non-blocking.

---

## 6. Phase map and commits (branch `feat/completion`, local only)

| Phase | Scope | Commit |
|---|---|---|
| 0 | Safety baseline / compatibility guardrails | `fa89603` |
| 1 | Backend contracts (child creation, feedback, progress) | `4576ff7` |
| 2 | Focus flow | `1be6bfb` |
| 3 | Dashboard + progress against real APIs | `7c4e07c` |
| 4 | Hybrid avatar, collectibles, gating, alignment | `dab0c79` … `4d52c30` |
| 5 | Test stability, RUNBOOK, final QA | `11a3fca` + this document |

Nothing in this branch has been pushed.

---

## 7. API router state

Enabled in `backend/app/main.py`: auth, child, task, feedback, notification,
progress, telemetry.

**Disabled on purpose:** `device_router`. The corresponding test is skipped
with an explicit reason. Re-enable both together when the device module is
ready.

---

## 8. Avatar and accessory rules (Phase 4)

- **Default avatar:** inline SVG dog (`Buddy the Dog`).
- **Collectibles:** `ducky.riv`, `robo.riv`, `snek.riv`, `sobo.riv` in
  `frontend/public/rive/`, loaded lazily via `@rive-app/canvas` only when
  selected. Selecting one **replaces** the dog as the main avatar.
- The `.riv` files play their first linear animation. Rive-native state-machine
  inputs are intentionally unwired until the input names are confirmed.
- Accessories are SVG overlays positioned with per-buddy, per-accessory anchor
  constants (`frontend/src/lib/collectibles.js`).

| Accessory | Unlock |
|---|---|
| None | free |
| Cap 🧢 | free |
| Bow tie 🎀 | free |
| Glasses 👓 | 200 pts |
| Scarf 🧣 | 300 pts |

Unlocks are **derived from current points** (`points >= unlockPoints`), not a
one-time flag. When points cross a threshold the Market tile immediately loses
its 🔒 badge, shows `✓ Unlocked`, and the UI refreshes without a page reload.
Saved selections that are no longer permitted are reset to `None` on load.

Forbidden combinations:

| Buddy | Restriction |
|---|---|
| Snek | no accessories at all |
| Robo | no glasses |
| Sobo | no cap |

---

## 9. Known issues / notes

- `npm install` reports pre-existing dependency audit findings (10 findings) and
  an `unrs-resolver` allow-scripts warning. Not introduced by this branch.
- Deprecation warnings remain from `datetime.utcnow()` in SQLAlchemy defaults
  and one test; behaviour is unchanged.
- AI quotas and idempotency use PostgreSQL/Redis semantics in production; tests
  run against in-memory SQLite with those boundaries stubbed or isolated.
- Dev-only prototype controls exist on the home screen; production auth is
  Clerk-backed.

---

## 10. Manual QA checklist

1. Sign in with Clerk; confirm Today, Tasks, Focus, Market, and Progress load.
2. Start a task → steps render → complete a step → points increase.
3. Earn/seed 200 pts: Glasses shows `✓ Unlocked` and can be worn.
4. Earn/seed 300 pts: Scarf unlocks automatically.
5. Cap and Bow are selectable at 0 pts.
6. Select each Rive buddy: it replaces the dog; animation plays; no canvas
   console errors.
7. Overlay each allowed accessory and confirm alignment.
8. Verify restrictions: Snek = none, Robo = no glasses, Sobo = no cap.
9. Open Progress: summaries/streaks come from the backend, not mock data.
10. Run §5 commands; expect green lint, green build, 16 passed / 1 skipped.
