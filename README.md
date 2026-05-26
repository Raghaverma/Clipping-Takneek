# Takneek Dashboard

<div align="center">

**Internal cricket video clipping, annotation, and analysis dashboard for Takneek / Khel.ai**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)](https://eslint.org/)
[![Auth](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?style=flat-square&logo=google&logoColor=white)](https://developers.google.com/identity)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](.)

</div>

---

## Overview

Takneek Dashboard is a private admin web app for browsing cricket footage, creating clips, marking batting/bowling annotations, estimating ball speed, and submitting structured metadata back to Takneek services.

The app is built with the Next.js App Router. React renders the shell and page layout, while `public/clipping.js` owns the browser-side video player, clipping workspace, annotation engine, dashboard state, OAuth client flow, SSE consumers, and upload actions.

### Core capabilities

- Google OAuth sign-in with a server-side `cd_session` HttpOnly cookie
- Live overview dashboard with player/video totals and clip breakdowns
- Video queue browser with search, type filters, processing status, and direct deep links
- Three-panel clipping workspace with custom controls, frame stepping, speed control, zoom, and pan
- Local video drag-and-drop for offline/unlinked review workflows
- Batsman and bowler annotation flows, including range-based stage markers
- Ball speed estimation from calibrated reference points and frame-by-frame ball positions
- Metadata export as JSON, optional R2/worker metadata upload, and API-backed clip submission
- Structured server/client logging with request IDs for debugging

---

## App Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/overview` |
| `/overview` | Live dashboard with player summary, stats, and quick actions |
| `/clipping` | Clipping workspace without a preselected video |
| `/clipping/[id]` | Clipping workspace with a video selected from the queue |
| `/oauth-callback.html` | Static OAuth redirect page used by the Google PKCE flow |

---

## API Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/google` | `POST` | Exchanges Google OAuth code for an ID token, authenticates against the backend, and sets `cd_session` |
| `/api/auth/session` | `GET` | Reads the current session cookie and returns decoded user payload |
| `/api/auth/logout` | `POST` | Clears the session cookie |
| `/api/proxy/[...path]` | `GET`/`POST`/`PUT`/`PATCH`/`DELETE` | Authenticated, allow-listed proxy to the admin API |
| `/api/stream/admin` | `GET` | Proxies the admin SSE stream |
| `/api/stream/videos` | `GET` | Proxies video-processing SSE updates |
| `/api/metadata/upload` | `PUT` | Uploads generated clip metadata to the configured R2/worker endpoint |
| `/api/log` | `POST` | Accepts browser log events and emits structured server logs |

The proxy intentionally allows only known upstream paths from `lib/proxy-policy.js`:

- `GET upload/download-url`
- `POST video-processing/admin-payload`
- `POST players/analysis`

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 client components + vanilla browser logic in `public/clipping.js` |
| Styling | CSS custom properties in `app/globals.css`; no external UI component library |
| Video tooling | HTML video, canvas overlays, local blobs, remote streaming URLs |
| Crop modal | CropperJS 1.6.2 loaded from CDN |
| Auth | Google OAuth 2.0 PKCE + backend JWT stored in an HttpOnly cookie |
| Real-time | Fetch-based SSE consumers for authenticated stream access |
| Uploads | Admin API proxy plus optional R2/worker metadata upload |
| Testing | Vitest 4 + jsdom |
| Linting | ESLint 9 + Next core web vitals config |

---

## Project Structure

```text
takneek-web/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/route.js       # OAuth exchange + backend login
│   │   │   ├── logout/route.js       # Session logout
│   │   │   └── session/route.js      # Session status
│   │   ├── log/route.js              # Client log ingestion
│   │   ├── metadata/upload/route.js  # Server-side metadata upload
│   │   ├── proxy/[...path]/route.js  # Allow-listed admin API proxy
│   │   └── stream/
│   │       ├── admin/route.js        # Admin SSE proxy
│   │       └── videos/route.js       # Video-processing SSE proxy
│   ├── clipping/
│   │   ├── page.js                   # Clipping workspace
│   │   └── [id]/page.js              # Clipping workspace with selected video
│   ├── components/
│   │   ├── AppShell.js               # Header, nav, auth overlay, crop modal
│   │   └── ClippingView.js           # Three-column clipping layout
│   ├── error.js                      # Route error boundary
│   ├── global-error.js               # Global error boundary
│   ├── globals.css                   # Design system and component styles
│   ├── layout.js                     # Root layout, runtime config, scripts
│   ├── not-found.js                  # 404 page
│   ├── overview/page.js              # Dashboard view
│   └── page.js                       # Root redirect
├── lib/
│   ├── env.js                        # Runtime/build env validation
│   ├── logger.js                     # Structured logs + JSON errors
│   ├── metadata.js                   # Deterministic metadata builder
│   ├── proxy-policy.js               # Proxy allow-list and body limits
│   ├── speed.js                      # Ball speed calculation
│   └── upstream.js                   # Fetch timeout and body limit helpers
├── public/
│   ├── clipping.js                   # Browser-side app logic
│   ├── oauth-callback.html           # OAuth callback bridge
│   ├── Takneek.svg                   # App icon/logo
│   └── TakneekWebSound.mp3           # Notification sound
├── __tests__/clipping.test.js        # Browser logic regression tests
├── package.json
└── vitest.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Takneek admin API access
- Google OAuth 2.0 Web Client credentials

### Install

```bash
npm install
```

### Configure environment

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

Required values:

```bash
# B2C backend base URL
NEXT_PUBLIC_ADMIN_API=https://takneek-b2c.crik.ai/api/v1

# Google OAuth client credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Must exactly match the redirect URI registered in Google Cloud Console
# Local:      http://localhost:3000/oauth-callback.html
# Production: https://yourdomain.com/oauth-callback.html
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/oauth-callback.html
```

Optional values:

```bash
# Legacy/original Takneek API base, currently kept for runtime compatibility/reference
NEXT_PUBLIC_TAKNEEK_API=https://takneek.crik.ai/api/v1

# Enables automatic metadata upload when present
R2_METADATA_URL=https://your-worker.workers.dev/metadata
R2_METADATA_TOKEN=your-bearer-token

# Optional FFmpeg.wasm asset overrides; wrapper defaults to /vendor/ffmpeg/ffmpeg.js and core defaults load from unpkg when blank
NEXT_PUBLIC_FFMPEG_WASM_URL=
NEXT_PUBLIC_FFMPEG_CORE_URL=
NEXT_PUBLIC_FFMPEG_CORE_WASM_URL=
```

Notes:

- Public `NEXT_PUBLIC_*` values are injected into `window.__CD_CONFIG__` by `app/layout.js`.
- Server-only values such as `GOOGLE_CLIENT_SECRET`, `R2_METADATA_URL`, and `R2_METADATA_TOKEN` remain inside Next.js API routes.
- `next.config.mjs` validates required environment variables at build/start time.
- If `R2_METADATA_URL` is unset, the app still exports metadata locally but skips automatic R2 upload.

### Run locally

```bash
npm run dev
# open http://localhost:3000
```

### Build and start

```bash
npm run build
npm start
```

---

## Common Commands

```bash
npm run dev         # Start local Next.js dev server
npm run build       # Validate env and create a production build
npm start           # Serve the production build
npm run lint        # Run ESLint
npm test            # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
```

---

## Authentication Flow

```text
1. App loads and checks /api/auth/session.
2. If no valid session exists, the login overlay is shown.
3. User clicks "Sign in with Google".
4. Browser starts a Google OAuth 2.0 PKCE flow.
5. /oauth-callback.html returns the code to the app.
6. /api/auth/google exchanges the code, calls the Takneek backend, and stores cd_session.
7. Authenticated SSE streams and proxy calls use the HttpOnly session cookie server-side.
8. Sign out calls /api/auth/logout and clears local UI state.
```

---

## Clipping Workflow

1. Open `/overview` or `/clipping` after signing in.
2. Select a processed streamable video from the queue, or drop a local video file into the player.
3. Use `I` and `O` to set clip boundaries, then add clips with `A`.
4. Select each clip and mark batsman or bowler stage annotations.
5. For ball speed, calibrate reference points, mark ball positions across frames, and review the computed km/h result.
6. Export metadata as JSON or upload/submit clips through the configured backend paths.

Generated metadata includes clip timings, frame numbers, selected category, stage annotations, and ball-speed data when available.

---

## Inference Pipeline Handoff

After a clip is created, that clip becomes the input source for any downstream AI inference pipeline. Keep media extraction and model inference as separate stages:

```text
Video
↓
FFmpeg.wasm clip extraction
↓
Clip Blob/File
↓
Frame decoding / preprocessing
↓
Inference pipeline
↓
Results
```

FFmpeg should not run inference. Its job is limited to media operations:

- extract the selected time range from the source video
- decode the resulting clip into frames
- perform media preprocessing such as scaling, cropping, frame-rate selection, or format conversion

Model inference happens after frames have been decoded and converted into model-ready tensors.

### Correct sequence

1. **Extract the clip** from the selected in/out range, for example `12.3s → 15.8s`, producing a clip such as `clip.mp4`.
2. **Decode frames** from the clip because AI models consume images, tensors, or frame sequences rather than MP4 containers.

   Browser-side FFmpeg.wasm example:

   ```js
   await ffmpeg.exec([
     '-i',
     'clip.mp4',
     'frame_%04d.jpg',
   ]);
   ```

   Equivalent CLI example:

   ```bash
   ffmpeg -i clip.mp4 frame_%04d.jpg
   ```

3. **Convert decoded frames to tensors** using the runtime expected by the model.
4. **Run inference separately** with the chosen pose, detection, tracking, or classification model.
5. **Attach results** back to the clip metadata or downstream analysis record.

In the browser app, adding a clip automatically queues this handoff. FFmpeg.wasm is loaded lazily, extracts the selected clip, decodes JPEG frames, and converts those frames into tensor-source objects.

Local inference convention:

- Put local model code/assets in the root `inference/` folder.
- The browser can load them through `/api/inference/...`.
- If `inference/adapter.js` exists, the app auto-loads it before running the handoff.
- Model files beside the adapter can be imported or fetched with relative URLs.

Minimal `inference/adapter.js`:

```js
export default {
  async run({ clip, clipBlob, frames, tensors, metadata }) {
    // Call pose/detection/tracking/classification model here.
    return { status: 'complete', clipId: clip.id };
  },
};
```

You can also register an adapter manually:

```js
cdRegisterInferencePipeline({
  async run({ clip, clipBlob, frames, tensors, metadata }) {
    return { status: 'complete', clipId: clip.id };
  },
});
```

If no adapter is registered and `inference/adapter.js` is absent, the clip card is marked `tensors ready` after media preprocessing completes. This separation keeps the clipping layer reusable and prevents FFmpeg-specific concerns from leaking into model code.

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `I` | Set start point |
| `O` | Set end point |
| `A` | Add clip |
| `Ctrl + Z` | Undo last clip |
| `M` | Mute / unmute |
| `←` / `→` | Step one frame |
| `↑` / `↓` | Step 10 frames |
| `1` – `9` | Jump to 10% – 90% of the video |
| `+` / `-` | Zoom in / out |
| `Scroll` | Zoom over the player |
| `Alt + drag` | Pan when zoomed |
| `Dbl-click` | Reset zoom |
| `B` | Mark ball in ball-speed mode |
| `Del` | Clear current-frame annotations |
| `R` | Refresh video list |
| `?` | Toggle shortcuts panel |
| `Esc` | Close modal or deselect annotation mode |

---

## Testing and Quality Gates

The repository has regression coverage for:

- Video-list rendering guards and browser-side clipping behavior (`__tests__/clipping.test.js`)
- Metadata serialization (`lib/metadata.test.js`)
- Proxy route allow-list behavior (`lib/proxy-policy.test.js`)
- Ball-speed calculations (`lib/speed.test.js`)

Run the standard checks before shipping changes:

```bash
npm test
npm run lint
npm run build
```

---

## Observability and Troubleshooting

- Server routes emit structured JSON logs with `level`, `event`, `at`, and `requestId` fields.
- API responses include `x-request-id` so browser-visible failures can be correlated with server logs.
- Browser events such as auth failures, stream reconnects, upload results, and client errors are sent to `/api/log`.
- SSE streams reconnect automatically and the video stream also has a polling path for fresh queue data.
- Metadata upload uses `/api/metadata/upload` so R2/worker credentials never reach the browser.

If startup fails, check `.env.local` first. Missing required public auth/admin variables or `GOOGLE_CLIENT_SECRET` will fail validation during build/start.
