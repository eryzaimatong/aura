# AURA — build brief

Everything you need to build this app. Read it fully before writing code.

---

## 1. What AURA is

A mobile app that reads a selfie to find the user's **face shape** and **colour season**,
then uses that profile across five areas: makeup advice, their own wardrobe, outfit
generation, shopping that fills real gaps, and a diary of what they actually wear.

The guide character is **Mira**, a mirror ghost. She delivers tips, empty states and
errors in a warm voice. Her artwork is supplied as assets — don't generate a mascot.

Target: Filipino users, launching on Google Play.

---

## 2. Stack — do not substitute

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind v4, in `/web` |
| Mobile shell | Capacitor, Android first |
| Backend | FastAPI, Python 3.11, in `/api`, deployed on Render |
| Data | Supabase — Postgres, auth, storage, RLS on |
| On-device ML | MediaPipe Tasks Vision, installed via **npm**, never a CDN tag |
| Server ML | scikit-learn for face shape, CLIP for garment tagging |

The Capacitor build must be self-contained: no runtime CDN dependencies anywhere.

---

## 3. Hard rules

These are product promises. If a request conflicts with one, say so rather than complying.

**Privacy**
1. The selfie is never uploaded and never stored. MediaPipe runs in the webview; only
   derived numbers leave the device — landmark ratios, LAB colour values, a Monk
   skin-tone band, a lighting score.
2. The `scans` table has no image column. Do not add one.
3. Consent screen before the first scan; every consent event is appended to `consents`.
4. Age gate before signup. Store the bracket only, never a date of birth. Under 13 is
   blocked. 13–17 needs guardian consent and has sharing and shop disabled.
5. Deletion is real and immediate, scoped to scan data, closet, or everything.

**Product**
6. Never render a beauty score, rating, weight, BMI, or "problem areas." Results read as
   "what suits you."
7. Every recommendation carries a reason string. No reason, no render.
8. Closet items have **no price field**. Metrics are wear count, last worn, worn-once,
   utilisation. Cost-per-wear was deliberately removed — users misremember prices.
9. Shop ranking uses `fit_score` only. Affiliate payout never influences ranking, and
   affiliate links show a visible disclosure.
10. Model confidence is shown to users. Low colour confidence routes to the undertone
    quiz instead of guessing.

**ML integrity**
11. `model_metrics` records accuracy per Monk skin-tone band, not just overall. A gap
    between bands is a launch blocker.
12. Every user correction writes to `card_corrections` with prediction, correction and
    model version. These are training labels.

---

## 4. Design tokens

Register these in the Tailwind theme. Never hard-code a hex in a component.

```
surface/cream    #FDF6EC     surface/paper   #FFFFFF     surface/sand    #FBEFE0
text/cocoa       #5B3A2E     text/cocoa-soft #7A5947     text/muted      #7D6353
brand/gold       #E9B869     brand/gold-deep #C08A4A     brand/butter    #FFE2A8
accent/lilac     #B9A6F2     accent/blush    #FFA8BE     accent/coral    #F08C7A
accent/sage      #A8C686     status/danger   #C0564A     status/success  #5E7A4E
opal/pink        #FFEAF5     opal/lilac      #E7E6FF     opal/blue       #DDF2FF
tint/lilac       #F3ECFF     tint/sage       #EFF4EC     tint/peach      #FFF0E2
tint/blue        #EDEFF8     tint/pink       #F7EEF9     surface/track   #F0E3CF
```

**Type** — Fredoka headings, Nunito body and numbers, Caveat for Mira's voice.
Scale: 44 display / 30 h1 / 26 h2 / 22 h3 / 20 stat / 14 body / 13 label / 12 caption / 11 micro.

**Radius** 12 small, 20 standard, 28 large, 999 pill. **Spacing** on an 8pt base.
**Elevation** soft `0 4 14 rgba(107,66,41,0.10)`, card `0 8 24 rgba(107,66,41,0.12)`.

Visual language: cream background, white cards with generous radius, gold as the single
accent, soft shadows, no hard borders except a 2px gold outline on emphasis cards.

### Tailwind aliases

Defined in `web/src/index.css`. Tailwind's default colours, fonts, text sizes, radii and
shadows are switched off, so these are the **only** values those utilities accept.
Use them with any matching prefix (`bg-`, `text-`, `border-`, `outline-`, …).

**Colours** — the group prefix is dropped, except `opal-` and `tint-`.

| Brief token | Utility suffix | Example |
|---|---|---|
| surface/cream | `cream` | `bg-cream` |
| surface/paper | `paper` | `bg-paper` |
| surface/sand | `sand` | `bg-sand` |
| surface/track | `track` | `border-track` |
| text/cocoa | `cocoa` | `text-cocoa` |
| text/cocoa-soft | `cocoa-soft` | `text-cocoa-soft` |
| text/muted | `muted` | `text-muted` |
| brand/gold | `gold` | `bg-gold` |
| brand/gold-deep | `gold-deep` | `border-gold-deep` |
| brand/butter | `butter` | `bg-butter` |
| accent/lilac, blush, coral, sage | `lilac`, `blush`, `coral`, `sage` | `bg-lilac` |
| status/danger, success | `danger`, `success` | `text-danger` |
| opal/pink, lilac, blue | `opal-pink`, `opal-lilac`, `opal-blue` | `bg-opal-lilac` |
| tint/lilac, sage, peach, blue, pink | `tint-lilac`, … `tint-pink` | `bg-tint-sage` |

**Type**

| Role | Utility | Size |
|---|---|---|
| Fredoka (headings) | `font-display` | — |
| Nunito (body, numbers) | `font-body` | — (default on `body`) |
| Caveat (Mira's voice) | `font-mira` | — |
| Display | `text-display` | 44px |
| H1 / H2 / H3 | `text-h1` / `text-h2` / `text-h3` | 30 / 26 / 22px |
| Stat | `text-stat` | 20px |
| Body | `text-body` | 14px |
| Label / Caption / Micro | `text-label` / `text-caption` / `text-micro` | 13 / 12 / 11px |

**Radius** — note the names are Tailwind's size words, not pixel values.

| Brief name | Utility | Value |
|---|---|---|
| small | `rounded-sm` | 12px |
| standard | `rounded-md` | **20px** |
| large | `rounded-lg` | 28px |
| pill | `rounded-pill` (or `rounded-full`) | 999px |

**Elevation** — `shadow-soft` (0 4 14) and `shadow-card` (0 8 24).

**Spacing** — Tailwind's 4px step is kept, so the 8pt grid is the even steps:
`2` = 8px, `4` = 16px, `6` = 24px, `8` = 32px. Screen side padding is `px-gutter` (24px).

---

## 5. Screen specs

Mobile 390×844. Every screen: status bar, 24px side padding, content column, and a
bottom nav on the main rooms. Nav rooms: Mirror, Vanity, Closet, Looks, Diary.

**Onboarding**
- **Age check** — Mira, "How old are you?", DOB input, note about under-18 handling, Continue.
- **Sign up / Log in** — name, email, password fields, primary and ghost buttons.
- **Welcome** — large Mira, AURA wordmark, tagline in Caveat, Get started + I already have an account.
- **Consent** — three cards (analyzed on your phone / only numbers are saved / delete any
  time), agreement checkbox, Agree and continue, Read the full notice.
- **Privacy notice** — four sections of plain-language policy, Got it.

**Mirror flow**
- **Capture** — camera viewport with a dashed face oval, tip chips, shutter, Upload and Flip.
- **Analyzing** — Mira, progress bar, four steps with done/now/next states, Caveat line.
- **Aura Card** — opal card with season name, face shape and undertone, five palette dots,
  confidence row with "tap to see why", "this doesn't look like me" link, See makeup /
  See outfits, Save or share.
- **Recommendations** — category chips, Mira tip card, three cards each with a thumbnail,
  title, "Why:" line, Save and Not for me.
- **Error · no face** — worried Mira, three concrete fixes, Retake / Upload / Skip.
- **Error · low light** — colour confidence 41% vs shape 84%, Retake / Continue anyway.
- **Undertone quiz** — three questions as chip rows, Finish my palette.
- **Correction** — what feels wrong chips, alternative season chips, Update my card.

**Rooms**
- **Home** — greeting, Mira tip card, today's outfit card, four quick tiles, nav.
- **Today** — weather card, generated outfit collage, why-today card, Show another / Wearing this.
- **Closet** — search, filter chips, 2-column grid of item cards with wear counts, nav.
- **Quick closet start** — progress "6 of 15", batch capture dropzone, thumbnails, faster-ways list.
- **Add item** — photo dropzone, "Mira detected" chips, name field, Save to closet.
- **Item detail** — photo, tag chips, three stats (wears, last worn, most-worn rank), pairs-with row.
- **Lookbook** — occasion chips, outfit collage, why-this-works card, Shuffle / Wear today.
- **Shelf** — gap card with Mira, affiliate disclosure, filter chips, product cards with reasons.
- **Product detail** — photo, price, why Mira picked this, would-pair-with row, disclosure.
- **Diary** — streak banner, three stat tiles, wears-per-week bars, most-worn colour bars, insight card.
- **Trip planner** — trip card, occasion chips, pack list with thumbnails, gap callout.

**Profile and settings**
- **Profile** — avatar, name, season, three stats, rows for Aura Card, measurements,
  Style Print, roadmap, settings, data and privacy.
- **Settings** — account, app, an analytics toggle, privacy rows, Log out.
- **Data and privacy** — what is stored (with "selfies: none"), export, scoped deletion chips.
- **Export ready** — file name and size, contents list, Download.
- **Measurements** — typed inputs with hints, derived shape result card.
- **Style quiz / Style Print** — progress, image-choice grid; result shows four axis bars and confidence.
- **Glow-up roadmap** — eight goals with done/now/next/later states.
- **Share card** — shareable card preview, format chips, referral note.
- **Premium** — feature list, ₱149/month or ₱999/year, 7-day trial.

**Admin, desktop 1280×900**
- **Overview** — four KPIs, scans-per-day bars, five-step scan funnel.
- **Model health** — accuracy, macro F1, mean confidence, low-confidence rate, confusion
  matrix, confidence drift, accuracy by Monk band.
- **Experiments** — two arms side by side, lift with p-value and method, guardrail metrics.

---

## 6. Database

`/db/schema.sql` is already applied in Supabase — 25 tables, RLS on, two views
(`item_wear_stats`, `closet_utilisation`). Read it before writing queries. Don't alter
tables unless asked.

Core tables: `profiles`, `consents`, `scans`, `aura_cards`, `card_corrections`,
`undertone_quiz`, `measurements`, `style_prints`, `closet_items`, `outfits`,
`outfit_items`, `wear_log`, `trips`, `goals`, `products`, `recommendations`,
`rec_feedback`, `events`, `experiments`, `experiment_assignments`, `model_metrics`,
`data_requests`.

---

## 7. Code conventions

- `web/src/components` reusable UI, `web/src/screens` screens, `web/src/lib/api.ts`
  fetch wrappers, `web/src/lib/supabase.ts` client.
- `api/app/routers/`, `api/app/schemas/`, `api/app/ml/`.
- Type everything, no `any`. Tailwind only. Split components past ~150 lines.
- Build one screen or endpoint end to end, then stop and tell me what to test.
- List files you'll create or change before writing them.
- Don't run git commands — I commit myself.

---

## 8. Build order

Do these one at a time, in order.

1. **Skeleton** — Vite + React + TS + Tailwind with tokens in the theme; Supabase client;
   FastAPI with CORS and `GET /health`; tell me how to run both.
2. **Components** — Button (4 variants, optional icon), Chip (selected), Input (3 states),
   Card, NavBar; a `/components` route showing every state.
3. **Auth** — age gate, signup, login, profiles row, protected routes.
4. **Consent + capture** — consent writes to `consents`; capture via getUserMedia with the
   face oval; canvas only, never uploaded.
5. **Landmarks** — MediaPipe via npm; compute the five ratios, cheek LAB, Monk band,
   lighting score; display for debugging.
6. **Scan endpoint** — `POST /api/scan`, rule-based stub marked TODO, persist `scans` and
   `aura_cards`, render the Aura Card screen.
7. **Model** — train on the Kaggle face shape dataset with the same ratio features; compare
   RandomForest vs gradient boosting; report accuracy, macro F1, confusion matrix and
   accuracy by Monk band; save the model, replace the stub, write `model_metrics`.
8. **Correction loop** — writes `card_corrections`, updates the card to `user_corrected`.
9. **Closet** — quick start, grid, item detail, Supabase Storage as WebP, wear log.
10. **Garment tagging** — `POST /api/items/tag`: background removal, CLIP zero-shot
    category, k-means LAB colours, palette match, store embedding, pre-fill the form.
11. **Outfits + Today** — generator with reason strings; weather-aware daily outfit.
12. **Diary** — streak, utilisation, worn-once, weekly bars, colour bars, insight; write
    `events` rows for key actions.
13. **Capacitor** — Android, app id `com.eryza.aura`, camera, splash and status bar
    plugins, safe-area handling, launcher icon from `/assets`; give me build and run commands.

---

## 9. Done means

A feature is finished when it works end to end on a phone-sized viewport, uses theme
tokens only, respects every hard rule above, handles its empty and error states, and
I've been told exactly what to test by hand.
