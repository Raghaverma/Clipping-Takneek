# Takneek Dashboard

<div align="center">

**Cricket video clipping, annotation, and analysis platform for Takneek / Khel.ai**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/CSS-Custom_Properties-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)](https://eslint.org/)
[![Auth](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?style=flat-square&logo=google&logoColor=white)](https://developers.google.com/identity)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](.)

</div>

---

## Overview

Takneek Dashboard is an internal admin tool that lets the Khel.ai team browse, clip, annotate, and export cricket footage. It connects to the Takneek API for video ingestion and pushes structured clip metadata back to a Cloudflare R2 worker.

**Key capabilities:**
- Live overview dashboard with per-player clip stats (SSE-powered, no manual refresh)
- Frame-accurate video clipping with custom in/out markers
- Ball speed measurement via calibrated reference points and CropperJS crop modal
- Bowling stage annotation across six delivery phases
- One-click metadata upload to the backend API

---

## Features

### Overview Dashboard `/overview`

- Stat cards: Total Videos · Batter Clips · Bowler Clips · Players · Processed
- Per-player table with clip counts per role and a direct **Clip** shortcut
- Clip breakdown panel with animated progress bars per category
- Real-time SSE stream — new videos and completions appear automatically

### Clipping View `/clipping`

A three-column workspace:

| Column | What it does |
|--------|-------------|
| **Left — Video Browser** | Lists all API videos; filter by name/title and by type (Batter / Bowler / All-Rounder) |
| **Center — Player** | Plays remote or local files; custom seek bar, zoom/pan, frame stepping, speed control |
| **Right — Clips & Annotation** | Clip list, ball speed engine, bowling stage marker, export and upload actions |

#### Ball Speed Annotation
Place **Ref A** and **Ref B** markers at a known real-world distance to lock the scale, then click ball positions across frames. The engine computes average speed in km/h using least-squares regression over the tracked trajectory.

#### Bowling Stage Marker
Mark six phases per clip: **Run Up → Back Foot Contact → Delivery Stride → Front Foot Landing → Ball Release → Follow Through**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) — App Router, server components |
| UI | React 19 + Vanilla JS (`public/clipping.js`) |
| Styling | CSS custom properties — zero external UI libraries |
| Crop modal | [CropperJS 1.6.2](https://github.com/fengyuanchen/cropperjs) via CDN |
| Auth | Google OAuth 2.0 + JWT; session in HttpOnly cookie |
| Real-time | Custom SSE consumer over `fetch()` with auth header support |
| Testing | [Vitest 4](https://vitest.dev/) + jsdom |
| Video sources | Remote Takneek API streaming URLs + local file blobs |

---

## Project Structure

```
takneek-web/
├── app/
│   ├── layout.js                    # Root layout — injects __CD_CONFIG__, loads clipping.js
│   ├── page.js                      # Redirects / → /overview
│   ├── globals.css                  # Design system + all component styles
│   ├── not-found.js                 # 404 page
│   ├── overview/
│   │   └── page.js                  # Dashboard view
│   ├── clipping/
│   │   ├── page.js                  # Clipping view (no pre-selected video)
│   │   └── [id]/page.js             # Clipping view with video pre-loaded
│   ├── components/
│   │   ├── AppShell.js              # Header, nav, auth overlay, modals
│   │   └── ClippingView.js          # Three-column clipping layout
│   └── api/
│       ├── auth/google/route.js     # Google OAuth callback handler
│       ├── proxy/[...path]/route.js # API proxy — forwards to backend
│       ├── stream/admin/route.js    # SSE stream — admin events
│       └── stream/videos/route.js  # SSE stream — video updates
└── public/
    └── clipping.js                  # All player/clipping/annotation logic (vanilla JS)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Takneek API account with admin access
- A Google OAuth 2.0 client ID

### Installation

```bash
git clone <repo-url>
cd takneek-web
npm install
```

### Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_TAKNEEK_API=https://takneek.crik.ai/api/v1
NEXT_PUBLIC_ADMIN_API=https://takneek-b2c.crik.ai/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/oauth-callback.html
GOOGLE_CLIENT_SECRET=your-google-client-secret
R2_METADATA_URL=https://your-worker.workers.dev/metadata
R2_METADATA_TOKEN=your-bearer-token
```

> Public `NEXT_PUBLIC_*` vars are injected into `window.__CD_CONFIG__` at runtime and consumed by `clipping.js`. Server-only vars (`GOOGLE_CLIENT_SECRET`, `R2_*`) stay on Next.js API routes and are never sent to the browser.

### Development

```bash
npm run dev
# → http://localhost:3000
```

### Production

```bash
npm run build
npm start
```

### Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

---

## Authentication Flow

```
1. Load app  →  Login overlay appears
2. Click "Sign in with Google"  →  Google OAuth redirect
3. Callback hits /api/auth/google  →  backend validates, sets HttpOnly cookie
4. SSE stream connects  →  live video updates begin
5. "Sign out" clears token  →  returns to login screen
```

---

## Keyboard Shortcuts

> Available in the Clipping View

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `I` | Set Start point |
| `O` | Set End point |
| `A` | Add clip |
| `M` | Mute / Unmute |
| `←` / `→` | Step one frame |
| `↑` / `↓` | Step 10 frames |
| `1` – `9` | Jump to 10% – 90% of video |
| `+` / `-` | Zoom in / out |
| `Scroll` | Zoom |
| `Alt + drag` | Pan when zoomed |
| `Dbl-click` | Reset zoom |
| `Del` | Clear current frame annotations |
| `Esc` | Deselect annotation mode |

---

## Observability

- Server routes emit structured JSON logs to stdout (`level`, `event`, `at`, `requestId`)
- API responses include `x-request-id` for correlating browser errors to server logs
- Browser errors, stream reconnects, auth expiry, and upload results are posted to `/api/log`
- Metadata upload is proxied through `/api/metadata/upload` — R2 credentials never reach the browser
