# SurplusSync Plus

**Predict · Prevent · Recover.** An AI-powered school meal forecasting, food-waste
prevention, and surplus recovery network. This repo is the high-fidelity
frontend prototype built for the USAII Global AI Hackathon 2026 (High School
Track — Make Climate Action Local and Real: Food Waste Rescue Radar).

The prototype demonstrates a complete operational flow for one fictional
demonstration school — **Lincoln Heights Public High School (Chicago, IL)** —
as it works through a high-risk surplus event on Thursday March 12, 2026.

## Run locally

```powershell
bun install
bun run dev
```

### ML forecast service (optional, recommended)

Terminal 1 — Python ML service:

```powershell
cd ..\surplussync-ml-service
.\.venv\Scripts\Activate.ps1
uvicorn surplussync_ml.api.main:app --host 127.0.0.1 --port 8000
```

Terminal 2 — SurplusSync Plus frontend:

```powershell
cd ..\SurplusSync\surplussync-plus-web
$env:ML_SERVICE_URL="http://127.0.0.1:8000"
bun run dev
```

Copy `.env.example` to `.env` for persistent server-only variables (`ML_SERVICE_URL`, `ML_REQUEST_TIMEOUT_MS`, `ALLOW_FORECAST_FALLBACK`). These are **never** exposed as `VITE_*` variables.

The browser calls `/api/forecast` on the TanStack Start server, which proxies to the private Python ML service. When the ML service is stopped, the canonical March 12 demo can still run via `ALLOW_FORECAST_FALLBACK=true`.

```bash
bun run test:run
```

Then open `http://localhost:3000`. Use the **Start guided demo** button in the
top bar to walk through the full demonstration in nine steps. **Reset demo**
restores the initial state at any time.

Run `bun run test:run` for reducer and workflow tests.

This repository uses **Bun** as its package manager (`bun.lock`). Do not add `package-lock.json`.

## Frontend architecture

- **TanStack Start v1** with file-based routing under `src/routes/`.
- **React 19 + TypeScript (strict)**, Tailwind v4 (CSS-first design tokens).
- **Recharts** for attendance and meal-history charts. All other custom
  visualizations (Surplus Radar, Decision Canvas curves, Network Map, Horizon
  Ribbon) are hand-written SVG/HTML so they remain on-brand.
- **Lucide** for icons.
- A single typed app store lives in `src/lib/store.tsx` (React reducer +
  `localStorage` persistence). Mock data is centralized in `src/lib/mock.ts`
  and typed in `src/lib/types.ts`.

### Folder map

```
src/
  components/
    approval/        ApprovalGate.tsx        — reusable human-approval gate
    brand/           Logo.tsx                — radar / meal-tray brand mark
    forecast/        HorizonRibbon, SurplusRadar, DecisionCanvas, EvidenceDrawer
    recovery/        NetworkMap.tsx          — animated partner/route map
    shell/           AppShell, CopilotDrawer, GuidedDemo
  lib/
    types.ts         domain models
    mock.ts          demonstration data (school, partners, calendar, history)
    demo-date.ts     canonical Thursday Mar 12, 2026 timeline + demo timestamps
    forecast.ts      centralized forecast math + ForecastView builder
    forecast-client.ts  ForecastProvider (gateway HTTP + local fallback)
    permissions.ts   role checks for consequential actions
    invariants.ts    business rule guards
    store.tsx        reducer + provider + persistent demo state
  routes/            TanStack file-based routes (one per surface)
  styles.css         Tailwind v4 + design tokens
```

### Design system

All color, spacing, typography, and radii are semantic tokens in
`src/styles.css`:

- `--color-ink` / `--color-canvas` — navigation rail vs warm-cream content
- `--color-surface` / `--color-surface-2` / `--color-line` — content surfaces
- `--color-ai` (blue-violet) · `--color-success` · `--color-warning` ·
  `--color-critical` · `--color-manual` · `--color-verified` — semantic

Use the `tnum` utility for any operational number to enable tabular figures.

## Domain models

Defined in `src/lib/types.ts`:

`User`, `School`, `CalendarEvent`, `AttendanceRecord`, `MealRecord`,
`Forecast`, `MenuPrediction`, `RecoveryPartner`, `PartnerMatch`, `Pickup`,
`Message`, `AuditEvent`, `ImpactRecord`, plus the action union in the store.

## Demo state

`src/lib/store.tsx` exposes `useStore()` for any component. It owns role,
forecast, current plan, attendance correction state, matches, pickups, audit
log, messages, and impact ledger. State persists to `localStorage` under the
key `ssp_state_v2` (migrates from `ssp_state_v1`). **Reset Demo** dispatches `RESET` and restores the
original prototype state.

## Guided demo sequence

Nine steps wired into `src/components/shell/GuidedDemo.tsx`:

1. Open the Command Center
2. Inspect the daily forecast
3. Open Decision Canvas
4. Correct attendance (cancelled field trip)
5. Send provisional partner alerts
6. Reserve partner capacity
7. Confirm same-day surplus, complete checklist, assign partner
8. Advance pickup to delivered
9. Review impact ledger & audit storyline

## Responsible-AI surfaces

Every consequential action runs through the `ApprovalGate` component, which
shows *who is approving*, *before/after*, *consequences*, *reversibility*, and
the **AI Operations Copilot** never mutates state without an explicit approve
click. The recovery-eligibility checklist must be human-completed before any
surplus is routed.

## Connecting a real backend later

The prototype is structured so that swapping mock services for real ones is
isolated:

- **Supabase (PostgreSQL + Auth + Realtime)** — replace the reducer-backed
  `useStore()` with hooks that call `supabase.from('forecasts').select(...)`,
  `supabase.auth.signInWithPassword(...)`, and `supabase.channel(...)`
  subscriptions. The action union in `store.tsx` mirrors the mutations a
  Supabase schema would expose.
- **FastAPI forecasting service** — `HttpForecastProvider` in `forecast-client.ts`
  calls the server gateway at `/api/forecast`, `/api/forecast/what-if`, and
  `/api/forecast/health`. The gateway proxies to `ML_SERVICE_URL` server-side.
  `LocalForecastProvider` remains for tests and canonical offline fallback.
- **Gemini-powered Copilot** — `CopilotDrawer`'s deterministic `reply()`
  function is the single integration point. Swap it for a server function that
  calls the Gemini API with the same `Reply` shape (which includes
  `evidence`, `proposal`, and the response-type discriminator).

## Simulated functionality (prototype)

- Forecast values load from the ML service through the server gateway when available; canonical March 12 falls back to locked demo data when the service is down.
- Partner reservations, driver assignments, and pickup ETAs are scripted.
- The Copilot responds with deterministic mocked replies (no LLM call).
- All persistence is local to the browser; reset clears it.

## License

Hackathon prototype. Not for production use.