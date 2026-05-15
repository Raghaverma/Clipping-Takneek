# Takneek Dashboard

A single-page cricket video clipping and analysis tool built for the Takneek / Khel.ai platform. It lets admins browse, clip, annotate, and export cricket footage — measuring ball speed, marking bowling stages, and uploading structured metadata back to the API.

---

## What It Does

### Overview Dashboard
The default landing view shows aggregate stats across all videos in the system:

- Total video count, broken down by **Batter**, **Bowler**, and **All-Rounder**
- Number of unique players
- Processed vs. unprocessed count
- A per-player table showing how many videos exist per role
- A type-breakdown panel and quick-action shortcuts

A real-time SSE (Server-Sent Events) stream keeps the dashboard live — new videos and processing completions appear without a manual refresh.

### Clipping View
A three-column layout for working with individual videos:

**Left — Video Browser**
- Lists all videos fetched from the Takneek API
- Filter by player name / video title (search box) and by analysis type (Batter / Bowler / All-Rounder)
- Toggle between Batsman and Bowler category tabs

**Center — Video Player**
- Plays remote API videos or local files (drag-and-drop or file picker; MP4, MOV, AVI, MKV)
- Custom seek bar with buffer indicator and per-frame tooltip
- Frame-by-frame stepping (← →), 10-frame jumps (↑ ↓), jump to percentage (1–9 keys)
- Playback speed: 0.1×, 0.25×, 0.5×, 1×, 1.5×, 2×
- Scroll-wheel / +- key zoom with Alt+drag pan; double-click resets zoom
- Set **Start (I)** and **End (O)** in/out points, then **Add Clip (A)**

**Right — Clips & Annotation**
- List of created clips with preview playback (clips are cut client-side via the MediaSource / blob approach)
- **Ball Speed Annotation Engine** — place calibration markers (Ref A, Ref B) at a known real-world distance, then click ball positions across frames; the tool computes average and peak speed in km/h using a CropperJS crop modal for precision
- **Bowling Stage Marker** — mark six phases per clip: Run Up, Back Foot Contact (BFC), Delivery Stride, Front Foot Landing (FFC), Ball Release, Follow Through. Some stages are frame ranges, others single frames
- **Export Data** — downloads clip metadata as JSON
- **Upload** — posts structured clip data to the configured R2 worker endpoint

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML / CSS / JS (no build step, no framework) |
| Styling | CSS custom properties (`clipping.css`) |
| Crop modal | [CropperJS 1.6.2](https://github.com/fengyuanchen/cropperjs) (CDN) |
| Auth | JWT stored in `localStorage`, sent as `Bearer` header |
| Real-time | Custom SSE consumer over `fetch()` (supports auth headers, unlike `EventSource`) |
| Video sources | Remote (Takneek API streaming URLs) + local file blobs |

---

## Project Structure

```
Takneek Web/
├── index.html      # Full single-page app markup (dashboard + clipping views, auth overlay, modals)
├── clipping.js     # All application logic (auth, API calls, video player, clipping, annotation engine)
└── clipping.css    # Design system + component styles
```

---

## Configuration

Open `clipping.js` and set the two API constants at the top:

```js
const TAKNEEK_API = 'https://takneek.crik.ai/api/v1';   // video library API
const ADMIN_API   = 'https://<your-ngrok-or-server>/api/v1'; // admin auth + SSE stream
```

To enable clip uploads, also fill in:

```js
const R2_METADATA_URL   = 'https://your-worker.workers.dev/metadata';
const R2_METADATA_TOKEN = 'your-bearer-token';
```

---

## How to Launch

This is a static app — no install, no build step.

**Option 1 — Open directly in a browser**
```
double-click index.html
```
> Works for local video files. Remote API calls may be blocked by CORS if opened as `file://` — use option 2 in that case.

**Option 2 — Serve with any static file server**
```bash
# Python (built-in)
cd "Takneek Web"
python3 -m http.server 8080
# then open http://localhost:8080
```

```bash
# Node (npx, no install needed)
npx serve "Takneek Web"
```

```bash
# VS Code — install the "Live Server" extension, right-click index.html → Open with Live Server
```

---

## Authentication Flow

1. On first load, an auth overlay appears.
2. **Sign In** with your Takneek admin email + password, or **Sign Up** (name, email, Indian phone number, password).
3. The JWT is saved to `localStorage` and reused across sessions — no re-login needed until you sign out.
4. The SSE stream connects automatically after login and pushes live video updates.
5. Click **Sign out** in the top bar to clear the token and return to the login screen.

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
