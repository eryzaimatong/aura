# AURA

**Your digital vanity.** AURA reads a selfie to find your face shape and colour season. That
profile then drives makeup advice, your own wardrobe, outfit ideas, gap-filling shopping, and
a diary of what you actually wear. Your guide is **Mira**, a mirror ghost.

Built for Filipino users, launching on Google Play.

> **Status:** in development. Steps 1–6 of 13 are done (see [Roadmap](#roadmap)).

---

## Privacy by design

These are product promises, enforced in code and in the database:

- **The selfie never leaves the phone.** MediaPipe runs on-device, and only derived numbers are
  sent: five landmark ratios, CIELAB colour values, a Monk skin-tone band and a lighting
  score. The capture canvas is wiped right after reading. The API rejects any extra field,
  so an image can't be sent even by mistake.
- **No image column.** The `scans` table stores numbers only.
- **Consent first.** Every consent event is appended to `consents` (an audit trail). Without
  consent to the current notice, the camera doesn't open and the API refuses scans.
- **Age gate.** Only an age bracket is stored, never a date of birth. Under-13s are blocked.
  13–17 needs guardian consent, and sharing and the shop are switched off.
- **Owner-only data.** Row Level Security is on for every user table. The API acts *as the
  signed-in user*, so RLS applies there too, and it holds no service-role key.
- **Honest results.** Never a beauty score, rating, weight or BMI. Confidence is always
  shown. Low colour confidence sends you to a short quiz instead of a guess.

The full rule set is in [`AURA-BRIEF.md`](AURA-BRIEF.md#3-hard-rules).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 (`/web`) |
| Mobile shell | Capacitor, Android first *(step 13)* |
| Backend | FastAPI, Python 3.11 (`/api`), deployed on Render |
| Data | Supabase: Postgres, Auth, Storage, RLS |
| On-device ML | MediaPipe Tasks Vision (bundled from npm, no CDN) |
| Server ML | scikit-learn (face shape), CLIP (garment tagging) *(steps 7, 10)* |

## Repository layout

```
.
├── api/                    FastAPI backend
│   ├── app/
│   │   ├── routers/        HTTP endpoints (health, scan)
│   │   ├── schemas/        Pydantic request/response models
│   │   ├── ml/             Classifiers and palettes
│   │   ├── auth.py         Supabase JWT verification (JWKS)
│   │   └── supabase_rest.py  PostgREST client that acts as the user
│   └── tests/
├── web/                    React app
│   ├── public/mediapipe/   Face model (committed) + WASM runtime (generated)
│   ├── public/mira/        Mira artwork, one PNG per expression
│   ├── scripts/            Build helpers
│   └── src/
│       ├── components/     Reusable UI
│       ├── screens/        One folder per area (onboarding, mirror, …)
│       └── lib/            API client, Supabase client, auth, face analysis
├── db/                     SQL schema and migrations, run in order
├── assets/                 Design mockups
└── AURA-BRIEF.md           Product brief, hard rules, design tokens, build order
```

## Getting started

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **Python** 3.11 (pinned in `api/.python-version`)
- A **Supabase** project

### 1. Set up Supabase

1. In the **SQL Editor**, run the files in `db/` **in order**:
   `000_schema.sql` → `001_rls_hardening.sql` → `002_wear_log_ownership.sql` → `003_table_grants.sql`.
   Migrations 001–003 are safe to re-run.
2. Under **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:5173`.
   - Add `http://localhost:5173/**` to **Redirect URLs**.
3. Optional, for local testing: under **Authentication → Sign In / Providers → Email**, turn
   off **Confirm email** so test signups log in straight away. Turn it back on (with custom
   SMTP) before release.

### 2. Run the API

```bash
cd api
python3.11 -m venv .venv            # Windows: py -3.11 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                # then fill in the values below
uvicorn app.main:app --reload
```

The API runs on <http://localhost:8000>. Check it at <http://localhost:8000/health>.

| `api/.env` | Value |
|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key, the same one the web app uses |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults cover Vite and Capacitor) |

### 3. Run the web app

```bash
cd web
npm install
cp .env.example .env.local          # then fill in the values below
npm run dev
```

Open <http://localhost:5173>. The dev server is pinned to port 5173 to match CORS; if the
port is busy, it stops with an error rather than switching ports.

| `web/.env.local` | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable (anon) key |
| `VITE_API_URL` | `http://localhost:8000` |

**Dev-only pages:** `/dev` (API and Supabase connection check) and `/components` (every
component state). Neither ships in production builds.

## Testing

```bash
# API: classifier rules + endpoints against a fake database
cd api && pytest

# Web: type check and production build
cd web && npm run typecheck && npm run build
```

CI runs both on every push and pull request (`.github/workflows/ci.yml`).

## Face model and MediaPipe

- `web/public/mediapipe/face_landmarker.task` is the MediaPipe face landmarker model
  (float16, about 3.8 MB). It's committed so the app works offline. If it's missing,
  download it from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.
- `web/public/mediapipe/wasm/` is **generated**: `npm run dev` and `npm run build` copy it
  from `node_modules/@mediapipe/tasks-vision`, so it always matches the installed version. It's
  gitignored.
- The five face ratios are defined in [`web/src/lib/face/ratios.ts`](web/src/lib/face/ratios.ts).
  The step 7 model trains on the same definitions, so change both together.

## Mira artwork

Mira is supplied art, not generated. Put one PNG per expression in `web/public/mira/`:

`hello` · `found-it` · `wink` · `closet-pick` · `streak` · `sleepy` · `worried` · `love` ·
`thinking` · `surprised` · `shy`

For example, `web/public/mira/found-it.png`. Until a file exists, a lilac placeholder shows.

## Design system

Colours, type, radii and shadows are Tailwind theme tokens in
[`web/src/index.css`](web/src/index.css). Tailwind's default palette is switched off, so only
AURA tokens work. Utility names are short aliases: `rounded-md` is **20px**, and
`bg-tint-sage` is the brief's `tint/sage`. The full alias table is in
[`AURA-BRIEF.md`](AURA-BRIEF.md#tailwind-aliases).

## Deployment

**API on Render** *(Web Service)*:

| Setting | Value |
|---|---|
| Root directory | `api` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Python version | from `api/.python-version` (3.11) |
| Environment | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ORIGINS` |

**Android app:** Capacitor packaging is step 13 and isn't set up yet.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Skeleton: Vite/React/Tailwind tokens, Supabase client, FastAPI `/health` | ✅ |
| 2 | Components: Button, Chip, Input, Card, NavBar, Mira + gallery | ✅ |
| 3 | Auth: age gate, sign up, log in, profiles, protected routes | ✅ |
| 4 | Consent + capture: consent log, camera with face oval, canvas only | ✅ |
| 5 | Landmarks: MediaPipe ratios, cheek LAB, Monk band, lighting score | ✅ |
| 6 | Scan endpoint + Aura Card (rule-based stub), undertone quiz fallback | ✅ |
| 7 | Face shape model, with accuracy per Monk band | ⏳ |
| 8 | Correction loop ("this doesn't look like me") | ⏳ |
| 9 | Closet: quick start, grid, item detail, wear log | ⏳ |
| 10 | Garment tagging: background removal, CLIP, colours | ⏳ |
| 11 | Outfits + Today (weather-aware) | ⏳ |
| 12 | Diary: streaks, utilisation, insights | ⏳ |
| 13 | Capacitor Android build | ⏳ |

### Known limitations

- Face shape and season come from **uncalibrated rule-based thresholds** until step 7, so
  confidences are deliberately modest (55–80%).
- The lighting score hasn't been validated across Monk bands yet. Step 7's per-band metrics
  check that deeper skin tones aren't routed to the quiz more often.
- Forgot password isn't built yet.

## Conventions

- TypeScript strict mode, no `any`. Tailwind classes only, no hard-coded colours in components.
- Components are split once they pass about 150 lines.
- Every recommendation needs a reason string, and anything without one isn't rendered.
- See [`AURA-BRIEF.md`](AURA-BRIEF.md#7-code-conventions) for the full list.

## License

Proprietary. All rights reserved. See [`LICENSE`](LICENSE).
