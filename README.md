# AURA

**Your digital vanity.** AURA reads a selfie to find your face shape and colour season. That
profile then drives makeup advice, your own wardrobe, outfit ideas, gap-filling shopping, and
a diary of what you actually wear. Your guide is **Mira**, a mirror ghost.

Built for Filipino users, launching on Google Play.

> **Status:** in development. All 13 build steps are done (see [Roadmap](#roadmap)). The face-shape
> model is **not cleared for launch** yet: it fails the per-skin-tone fairness gate.

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
│   │   ├── routers/        HTTP endpoints (health, scan, cards, items, outfits)
│   │   ├── schemas/        Pydantic request/response models
│   │   ├── ml/             Face-shape model, colour rules, palettes, reports
│   │   ├── auth.py         Supabase JWT verification (JWKS)
│   │   └── supabase_rest.py  PostgREST client that acts as the user
│   ├── training/           Dataset feature extraction + model training
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
   `000_schema.sql` → `001_rls_hardening.sql` → `002_wear_log_ownership.sql` → `003_table_grants.sql`
   → `004_closet_storage.sql` → `005_delete_my_data.sql` → `006_recommendation_grants.sql`
   → `007_saved_looks.sql`. Migrations 001–007 are safe to re-run.
2. Under **Authentication → URL Configuration**:
   - Set **Site URL** to `http://localhost:5173`.
   - Add `http://localhost:5173/**` to **Redirect URLs**.
3. Optional, for local testing: under **Authentication → Sign In / Providers → Email**, turn
   off **Confirm email** so test signups log in straight away. Turn it back on (with custom
   SMTP) before release.

4. Create a **private** Storage bucket named `closet` (5 MB limit, MIME type `image/webp`),
   then run `db/004_closet_storage.sql` so each user can only reach their own folder.

### 2. Run the API

```bash
cd api
python3.11 -m venv .venv            # Windows: py -3.11 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m app.ml.download_models    # CLIP image encoder (89 MB, checksum-verified)
cp .env.example .env                # then fill in the values below
uvicorn app.main:app --reload
```

Without the downloaded model, the API still runs: `/api/items/tag` answers 503 and the app
falls back to manual tagging.

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

# Web: unit tests (Vitest)
cd web && npm test

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

## Training the face-shape model

The API serves `api/app/ml/models/face_shape.joblib` (committed). To retrain:

1. Download the [Kaggle face shape dataset](https://www.kaggle.com/datasets/niten19/face-shape-dataset)
   and unzip it to `data/face-shape/` (with `training_set/` and `testing_set/` inside).
   `data/` is gitignored. **Check the dataset licence before shipping a model trained on it.**
2. From `api/`:
   ```bash
   pip install -r requirements-train.txt
   python -m training.extract_features    # MediaPipe on every image → data/features/*.csv (~5 min)
   python -m training.train_face_shape    # CV model selection, calibration, held-out evaluation
   ```
3. Review `api/app/ml/reports/<version>.md`, then run `db/metrics/<version>.sql` in the
   Supabase SQL editor to record the metrics (`model_metrics` is service-role only).

Training measures images with [`app/ml/features.py`](api/app/ml/features.py), a Python twin of
the app's TypeScript measurement code. It uses the same landmarks, formulas, resize and pose
filters, so the model trains on exactly what the app sends. Change both sides together.

**Launch gate (hard rule 11):** every Monk band needs at least 30 labelled test faces, and the
accuracy gap between bands must be 5 points or less. Until then the report says ⛔ BLOCKED and
the API logs a warning at startup.

## Garment tagging

`POST /api/items/tag` takes a clothing photo (never a selfie) and returns suggestions. Nothing
is stored until the user saves the item.

1. **Cut-out:** rembg's `u2netp` model (ONNX, 4.6 MB, committed) produces a transparent WebP.
2. **Embedding:** CLIP ViT-B/32 image encoder (ONNX, int8, 89 MB, downloaded) produces the 512-d
   vector stored in `closet_items.embedding`.
3. **Category:** zero-shot against precomputed text embeddings in
   `app/ml/models/clip_prompts.npz`. After editing the vocabulary in `app/ml/taxonomy.py`, run
   `python -m training.build_clip_prompts` (needs `requirements-train.txt`).
4. **Colours:** k-means in CIELAB on the cut-out, named for shoppers, and matched against the
   user's Aura Card palette. The verdict always comes with a reason.

There's no PyTorch: everything runs on `onnxruntime`. Tagging takes about 2 s per photo on a
4-core laptop.

## Outfits, weather and analytics

- **Outfits** (`POST /api/outfits/generate`): each piece is scored on occasion fit (CLIP against
  occasion prompts), weather (heat, rain), palette and freshness. Combinations then score on
  colour harmony (CIELAB hue and chroma) and style coherence (CLIP similarity). A seeded jitter
  powers Shuffle. Every outfit carries a reason built from what actually drove the pick.
- **Wearing** (`POST /api/outfits/wear`) records `outfits` and `outfit_items` and logs one
  `wear_log` row per piece (duplicates for the same day are skipped).
- **Saved looks** (`POST /api/outfits/save`) records the outfit with `saved = true` and no wear.
- **Style this piece:** `require_id` on `/api/outfits/generate` fixes one slot to that item
  (any category except accessories), and the reason starts with "built around your …".
- **Week planner** (`POST /api/week/plan`): seven looks from today, weekday and weekend
  occasions, daily forecast for Metro Manila or the user's opted-in coarse location.
- **Duplicate check:** `/api/items/tag` also returns `similar` — closet pieces of the same
  category with CLIP similarity ≥ 0.9 and a close main colour. The app shows a note; it never blocks.
- **Weather** (`GET /api/weather`) comes from [Open-Meteo](https://open-meteo.com/) (free, no
  key), cached for 30 minutes. It defaults to Metro Manila. The user can opt in to their own
  location, rounded to about 11 km and kept only on the device.
- **Trips** (`POST /api/trips/plan`): the place name is looked up with Open-Meteo's geocoder
  (only the name is sent, never the user's location), then the daily forecast is fetched for the
  trip dates. Forecasts reach 16 days ahead; later days are planned without weather and the
  screen says so. The generator runs once per day (plus one look per evening occasion), with a
  bonus for reusing pieces already packed. Cool nights add a layer from the closet; missing
  closed shoes for rain, a warm layer or a dressy piece are flagged as gaps. Saved trips go
  to `trips` (the plan and looks sit in its `forecast` JSON); packing ticks stay on the device.
- **Share card:** drawn on-device on a canvas from the card's own fields (season, palette, and
  optionally face shape, undertone and first name). No selfie, no account link. Sharing is
  hidden for 13–17 accounts.
- **Morning reminder** (Android only): a daily local notification set in Settings →
  Notifications, scheduled on the phone and cleared on sign-out. Inexact alarms only
  (`SCHEDULE_EXACT_ALARM` is removed from the manifest).
- **Analytics:** the app writes `events` rows (`scan_completed`, `item_added`, `wear_logged`,
  `outfit_generated`, `outfit_worn`, `card_corrected`, `card_shared`) **only** when `profiles.share_analytics`
  is true. Props never hold personal data.

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
| Build command | `pip install -r requirements.txt && python -m app.ml.download_models` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Python version | from `api/.python-version` (3.11) |
| Environment | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CORS_ORIGINS` |

## Android app (Capacitor)

The Android project lives in `web/android` (app id `com.eryza.aura`). Everything runs locally
inside the app, including MediaPipe, the fonts and the face model: no CDN at runtime.

**Requirements:** Android Studio, with the Android SDK, and **JDK 21**. Capacitor 8's Gradle
can't run on Java 25. Put a JDK 21 in `~/.jdks/` (e.g. Eclipse Temurin 21), then create
`web/android/.gradle/config.properties` (gitignored) with
`java.home=C\:\\Users\\<you>\\.jdks\\jdk-21…`. Android Studio and `npm run android:apk` both use it.
Also create `web/android/local.properties` with `sdk.dir=…` pointing at your Android SDK.

| Command (from `web/`) | What it does |
|---|---|
| `npm run android:dev` | Builds the web app against your **local API** (`http://10.0.2.2:8000`, the emulator's address for your computer) and syncs it into the Android project. HTTP is allowed in this build only. |
| `npm run android:sync` | Production web build (uses `VITE_API_URL` from `.env.local`) and sync. |
| `npm run android:open` | Opens the project in Android Studio. Press ▶ Run to install on the emulator or a phone. |
| `npm run android:apk` | Builds a debug APK from the command line → `web/android/app/build/outputs/apk/debug/app-debug.apk`. |
| `npm run android:icons` | Regenerates launcher icons and splash screens from `web/resources/`. |

**Native details:**
- **Camera:** the selfie uses the web view's `getUserMedia` (frames stay in memory). There's no
  native camera plugin, because that would save photo files.
- **Edge-to-edge:** Capacitor injects `--safe-area-inset-*`, and screens pad with
  `--safe-top`/`--safe-bottom`. The status bar uses dark icons over the cream background.
- **Sign-up email links** open the app via `com.eryza.aura://auth/callback`. Add
  `com.eryza.aura://**` to Supabase **Authentication → URL Configuration → Redirect URLs**.
- **Cloud backup is off**, so the session isn't copied into device backups.
- **Testing on a real phone** needs the API reachable over HTTPS (deploy it to Render and set
  `VITE_API_URL`), since `10.0.2.2` only exists inside the emulator.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Skeleton: Vite/React/Tailwind tokens, Supabase client, FastAPI `/health` | ✅ |
| 2 | Components: Button, Chip, Input, Card, NavBar, Mira + gallery | ✅ |
| 3 | Auth: age gate, sign up, log in, profiles, protected routes | ✅ |
| 4 | Consent + capture: consent log, camera with face oval, canvas only | ✅ |
| 5 | Landmarks: MediaPipe ratios, cheek LAB, Monk band, lighting score | ✅ |
| 6 | Scan endpoint + Aura Card (rule-based stub), undertone quiz fallback | ✅ |
| 7 | Face shape model, with accuracy per Monk band | ✅ (⛔ launch gate) |
| 8 | Correction loop ("this doesn't look like me") | ✅ |
| 9 | Closet: quick start, grid, item detail, wear log | ✅ |
| 10 | Garment tagging: background removal, CLIP, colours | ✅ |
| 11 | Outfits + Today (weather-aware) | ✅ |
| 12 | Diary: streaks, utilisation, insights | ✅ |
| 13 | Capacitor Android build | ✅ |
| + | Profile, Settings, Data & privacy (export + scoped deletion), forgot password | ✅ |
| + | Vanity (makeup, hair, colours), Measurements, Style quiz + Style Print, Glow-up roadmap | ✅ |
| + | Trip planner, Share card | ✅ |
| + | Saved looks, Style this piece, Week planner, wear history calendar, item editing, closet sort and outfit math, rediscover nudges, duplicate check, offline notice, morning reminder | ✅ |
| – | Shelf / product detail, Premium, Admin dashboards | not started |

### Known limitations

- **Face shape:** a calibrated random forest, about 57% accurate on held-out faces (chance is
  20%). It mostly confuses heart with oval and round with square. Confidence is calibrated, so
  the app shows roughly what the model really knows.
- **Fairness gate blocked:** the dataset is mostly Monk bands 5–6. Bands 3, 9 and 10 have no
  test faces, and 1, 4 and 8 have almost none. More diverse labelled faces (including
  `card_corrections` from real users) are needed before launch.
- **Colour season** is still rule-based (confidence capped at 80%). User corrections are being
  collected as labels for a future model.
- The lighting score hasn't been validated across Monk bands yet.
- **Garment tagging speed:** about 2 s per photo on 4 cores. Render's free tier has a fraction
  of one CPU, so expect 10 s or more there. Plan on a paid instance, or move the cut-out
  on-device.
- Tagging works best on one item laid flat or hung up. In photos of a person wearing an outfit,
  skin and other pieces leak into the colours and category.

## Conventions

- TypeScript strict mode, no `any`. Tailwind classes only, no hard-coded colours in components.
- Components are split once they pass about 150 lines.
- Every recommendation needs a reason string, and anything without one isn't rendered.
- See [`AURA-BRIEF.md`](AURA-BRIEF.md#7-code-conventions) for the full list.

## License

Proprietary. All rights reserved. See [`LICENSE`](LICENSE).
