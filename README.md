# Takneek Dashboard

A cricket video clipping and analysis tool built for the Takneek / Khel.ai platform. Lets admins browse, clip, annotate, and export cricket footage — measuring ball speed, marking bowling stages, and uploading structured metadata back to the API.

---

## What It Does

### Overview Dashboard (`/overview`)
The default landing view shows aggregate stats across all videos in the system:

- Total video count, broken down by **Batter**, **Bowler**, and **All-Rounder**
- Number of unique players
- Processed vs. unprocessed count
- A per-player table showing how many videos exist per role
- A type-breakdown panel and quick-action shortcuts

A real-time SSE (Server-Sent Events) stream keeps the dashboard live — new videos and processing completions appear without a manual refresh.

### Clipping View (`/clipping`, `/clipping/[id]`)
A three-column layout for working with individual videos:

**Left — Video Browser**
- Lists all videos fetched from the Takneek API
- Filter by player name / video title and by analysis type (Batter / Bowler / All-Rounder)
- Toggle between Batsman and Bowler category tabs

**Center — Video Player**
- Plays remote API videos or local files (drag-and-drop or file picker; MP4, MOV, AVI, MKV)
- Custom seek bar with buffer indicator and per-frame tooltip
- Frame-by-frame stepping (← →), 10-frame jumps (↑ ↓), jump to percentage (1–9 keys)
- Playback speed: 0.1×, 0.25×, 0.5×, 1×, 1.5×, 2×
- Scroll-wheel / +/- key zoom with Alt+drag pan; double-click resets zoom
- Set **Start (I)** and **End (O)** in/out points, then **Add Clip (A)**

**Right — Clips & Annotation**
- List of created clips with preview playback
- **Ball Speed Annotation Engine** — place calibration markers (Ref A, Ref B) at a known real-world distance, then click ball positions across frames; computes average and peak speed in km/h using a CropperJS crop modal for precision
- **Bowling Stage Marker** — mark six phases per clip: Run Up, Back Foot Contact (BFC), Delivery Stride, Front Foot Landing (FFC), Ball Release, Follow Through
- **Export Data** — downloads clip metadata as JSON
- **Upload** — posts structured clip data to the configured R2 worker endpoint

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | React 19 + Vanilla JS (`public/clipping.js`) |
| Styling | CSS custom properties (`app/globals.css`) |
| Crop modal | [CropperJS 1.6.2](https://github.com/fengyuanchen/cropperjs) (CDN) |
| Auth | Google OAuth 2.0 + JWT in `localStorage` |
| Real-time | Custom SSE consumer over `fetch()` (supports auth headers) |
| Video sources | Remote (Takneek API streaming URLs) + local file blobs |

---

## Project Structure

```
app/
├── layout.js                    # Root layout — injects __CD_CONFIG__ + loads clipping.js
├── page.js                      # Redirects / → /overview
├── globals.css                  # Design system + component styles
├── not-found.js                 # 404 page
├── overview/
│   └── page.js                  # Dashboard view
├── clipping/
│   ├── page.js                  # Clipping view (no pre-selected video)
│   └── [id]/page.js             # Clipping view with a specific video pre-loaded
├── components/
│   ├── AppShell.js              # Header, nav, auth overlay, modals
│   └── ClippingView.js          # Three-column clipping layout (mounts clipping.js DOM)
└── api/
    ├── auth/google/route.js     # Google OAuth callback handler
    ├── proxy/[...path]/route.js # API proxy (forwards requests to backend)
    ├── stream/admin/route.js    # SSE stream — admin events
    └── stream/videos/route.js  # SSE stream — video updates

public/
└── clipping.js                  # All clipping/annotation/player logic (vanilla JS, loaded via <Script>)
```

---

## Configuration

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_TAKNEEK_API=https://takneek.crik.ai/api/v1
NEXT_PUBLIC_ADMIN_API=https://takneek-b2c.crik.ai/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_REDIRECT_URI=https://yourdomain.com/oauth-callback.html
GOOGLE_CLIENT_SECRET=your-google-client-secret
R2_METADATA_URL=https://your-worker.workers.dev/metadata
R2_METADATA_TOKEN=your-bearer-token
```

These are injected into `window.__CD_CONFIG__` at runtime by `app/layout.js` and consumed by `public/clipping.js`.
Only public client settings are exposed to the browser; session tokens and R2 credentials stay on server routes.

---

## Getting Started

```bash
npm install
npm run dev
# open http://localhost:3000
```

**Production build:**
```bash
npm run build
npm start
```

---

## Authentication Flow

1. On first load, a login overlay appears.
2. Sign in with **Google OAuth** (Google account linked to your Takneek admin profile).
3. The app stores the backend session in an HttpOnly cookie and keeps only non-sensitive user display data in browser storage.
4. The SSE stream connects automatically after login and pushes live video updates.
5. Click **Sign out** in the top bar to clear the token and return to the login screen.

---

## Logs & Observability

- Server routes emit structured JSON logs to stdout with `level`, `event`, `at`, and `requestId`.
- API responses include `x-request-id` so browser failures can be matched to server logs.
- Browser errors, stream reconnects, auth expiry, draft restore events, and metadata upload results are posted to `/api/log`.
- Metadata upload is proxied through `/api/metadata/upload`, keeping storage credentials out of the browser.

---

## Keyboard Shortcuts (Clipping View)

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `I` | Set Start point |
| `O` | Set End point |
| `A` | Add clip |
| `M` | Mute / Unmute |
| `←` / `→` | Step one frame |
| `↑` / `↓` | Step 10 frames |
| `1`–`9` | Jump to 10%–90% of video |
| `+` / `-` | Zoom in / out |
| `Scroll` | Zoom |
| `Alt + drag` | Pan when zoomed |
| `Dbl-click` | Reset zoom |
| `Del` | Clear current frame annotations |
| `Esc` | Deselect annotation mode |
