'use strict';

/* ═══════════════════════════════════════════════════════════
   Clipping Dashboard — Application Logic
   ═══════════════════════════════════════════════════════════ */

// ── Config ─────────────────────────────────────────────────────
const TAKNEEK_API = 'https://takneek.crik.ai/api/v1';
const ADMIN_API   = 'https://hierocratical-unbreathing-ma.ngrok-free.dev/api/v1';

// R2 metadata upload — fill in your Worker/bucket URL and token
const R2_METADATA_URL = '';   // e.g. 'https://your-worker.workers.dev/metadata'
const R2_METADATA_TOKEN = '';   // Bearer token or API key

// ── Auth ────────────────────────────────────────────────────────
const AUTH = {
  token: null,
  deviceId: null,
  sseAbort: null,
};

// ── State ──────────────────────────────────────────────────────
const CD = {
  // API data
  allVideos: [],   // full list from API
  filteredVideos: [],   // after search/angle filter
  activeVideo: null, // selected video object { id, display_name, player_name, angle, … }

  // Clipping state
  category: 'batsman',
  duration: 0,
  fps: 25,
  inPoint: null,
  outPoint: null,
  clips: [],
  selectedClipId: null,
  clipCounter: 0,
  annCounter: 0,
  generated: false,
  isDragging: false,
  sessionId: null,

  // Annotation engine state
  annotEngine: {
    active: false,
    mode: 'none',   // 'none'|'ball'|'refA'|'refB'
    points: {
      ball: {},        // {frameIndex: {x,y}}  normalised 0..1
    },
    calibration: {
      refA: null,   // {x,y} normalised
      refB: null,
      distance_m: 0.45,   // real-world distance between refA and refB (metres)
      scale: null,   // metres per canvas-pixel (computed)
    },
    drag: null,    // {type, frame, ...} while dragging a point
    speedResult: null,    // {avgKmh, maxKmh, smoothed, n}
  },
};

// ── Bowling stage labels ────────────────────────────────────────
const STAGES = {
  run_up: 'Run Up',
  back_foot_contact: 'BFC (Back Foot Contact)',
  delivery_stride: 'Delivery Stride',
  front_foot_landing: 'FFC (Front Foot Landing)',
  ball_release: 'Ball Release',
  follow_through: 'Follow Through',
};

// Stages that require a frame range (start→end) instead of a single frame
const RANGE_STAGES = new Set(['run_up', 'back_foot_contact', 'front_foot_landing', 'follow_through']);

// ── Batsman shot types ──────────────────────────────────────────
const BATSMAN_SHOTS = {
  defense:        'Defense',
  cover_drive:    'Cover Drive',
  straight_drive: 'Straight Drive',
  on_drive:       'On Drive',
  flick:          'Flick',
  square_cut:     'Square Cut',
  late_cut:       'Late Cut',
  pull:           'Pull',
  hook:           'Hook',
  sweep:          'Sweep',
  reverse_sweep:  'Reverse Sweep',
  back_foot_punch:'Back Foot Punch',
};

// ── Batsman movement stages ─────────────────────────────────────
const BATSMAN_STAGES = {
  stance:         'Stance / Guard',
  backswing:      'Backswing',
  footwork:       'Footwork',
  contact:        'Contact Point',
  follow_through: 'Follow Through',
};
const BATSMAN_STAGE_ORDER = ['stance', 'backswing', 'footwork', 'contact', 'follow_through'];
const BATSMAN_RANGE_STAGES = new Set(['backswing', 'footwork', 'follow_through']);

// ── Analysis type display labels ────────────────────────────────
const ANGLE_LABELS = {
  batter: 'Batter',
  bowler: 'Bowler',
  'all-rounder': 'All-Rounder',
  other: 'Other',
};

// ── Request headers ─────────────────────────────────────────────
function tkHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (AUTH.token) h['Authorization'] = `Bearer ${AUTH.token}`;
  return h;
}

function adminHeaders() {
  const h = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (AUTH.token) h['Authorization'] = `Bearer ${AUTH.token}`;
  return h;
}

// ═══════════════════════════════════════════════════════════
// Auth — init, login, signup, logout, SSE
// ═══════════════════════════════════════════════════════════

function _authDeviceId() {
  let id = localStorage.getItem('tk_device_id');
  if (!id) {
    id = 'admin-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('tk_device_id', id);
  }
  return id;
}

function cdAuthInit() {
  cdConnectSSE();
  cdFetchVideos();
}

function _authShowOverlay() {
  document.getElementById('cd-auth-overlay').classList.remove('hidden');
}

function _authHideOverlay() {
  document.getElementById('cd-auth-overlay').classList.add('hidden');
}

function cdAuthShowSignup() {
  document.getElementById('cd-auth-login-form').style.display = 'none';
  document.getElementById('cd-auth-signup-form').style.display = 'flex';
  document.getElementById('cd-auth-card-title').textContent = 'Create Takneek Account';
  document.getElementById('cd-auth-login-error').style.display = 'none';
}

function cdAuthShowLogin() {
  document.getElementById('cd-auth-signup-form').style.display = 'none';
  document.getElementById('cd-auth-login-form').style.display = 'flex';
  document.getElementById('cd-auth-card-title').textContent = 'Takneek API Login';
  document.getElementById('cd-auth-signup-error').style.display = 'none';
}

function _authSetLoading(btnId, labelId, loading, text) {
  const btn = document.getElementById(btnId);
  const lbl = document.getElementById(labelId);
  btn.disabled = loading;
  lbl.textContent = loading ? 'Please wait…' : text;
}

function _authShowError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.style.display = 'block';
}

async function cdAuthLogin() {
  const email    = document.getElementById('cd-auth-email').value.trim();
  const password = document.getElementById('cd-auth-password').value;
  const errEl    = 'cd-auth-login-error';

  document.getElementById(errEl).style.display = 'none';
  if (!email || !password) { _authShowError(errEl, 'Email and password are required.'); return; }

  _authSetLoading('cd-auth-login-btn', 'cd-auth-login-label', true, 'Sign In');
  try {
    const res = await fetch(`${ADMIN_API}/admin/login`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ email, password, device_id: AUTH.deviceId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

    AUTH.token = data.token || data.access_token || data.data?.token;
    if (!AUTH.token) throw new Error('No token in response');

    localStorage.setItem('tk_admin_token', AUTH.token);
    _authHideOverlay();
    cdConnectSSE();
    cdFetchVideos();
  } catch (err) {
    _authShowError(errEl, err.message || 'Login failed. Check your credentials.');
  } finally {
    _authSetLoading('cd-auth-login-btn', 'cd-auth-login-label', false, 'Sign In');
  }
}

async function cdAuthSignup() {
  const full_name    = document.getElementById('cd-auth-signup-name').value.trim();
  const email        = document.getElementById('cd-auth-signup-email').value.trim();
  const phone_raw    = document.getElementById('cd-auth-signup-phone').value.trim();
  const password     = document.getElementById('cd-auth-signup-password').value;
  const errEl        = 'cd-auth-signup-error';
  const phone_number = phone_raw.startsWith('+') ? phone_raw : '+91' + phone_raw;

  document.getElementById(errEl).style.display = 'none';
  if (!full_name || !email || !phone_raw || !password) {
    _authShowError(errEl, 'All fields are required.'); return;
  }

  _authSetLoading('cd-auth-signup-btn', 'cd-auth-signup-label', true, 'Create Account');
  try {
    const res = await fetch(`${ADMIN_API}/admin/signup`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ email, password, phone_number, full_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

    // Auto-login after signup
    document.getElementById('cd-auth-email').value = email;
    document.getElementById('cd-auth-password').value = password;
    cdAuthShowLogin();
    await cdAuthLogin();
  } catch (err) {
    _authShowError(errEl, err.message || 'Signup failed. Try again.');
  } finally {
    _authSetLoading('cd-auth-signup-btn', 'cd-auth-signup-label', false, 'Create Account');
  }
}

function cdAuthLogout() {
  if (AUTH.sseAbort) { AUTH.sseAbort.abort(); AUTH.sseAbort = null; }
  VideoStreamService.reset();
  CD.allVideos = [];
  CD.filteredVideos = [];
}

// ── Admin SSE stream ───────────────────────────────────────────
// Uses fetch() so we can send Authorization + ngrok headers
// (EventSource doesn't support custom headers)
function cdConnectSSE() {
  if (AUTH.sseAbort) { AUTH.sseAbort.abort(); AUTH.sseAbort = null; }
  if (!AUTH.token) return;

  AUTH.sseAbort = new AbortController();
  const signal = AUTH.sseAbort.signal;

  fetch(`${ADMIN_API}/admin/stream`, {
    headers: adminHeaders(),
    signal,
  }).then(res => {
    if (!res.ok || !res.body) throw new Error(`SSE HTTP ${res.status}`);
    cdStatus('Real-time stream connected', 'ok');

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', eventType = 'message', dataLines = [];

    function processLine(line) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5));
      } else if (line === '') {
        const raw = dataLines.join('\n').trim();
        dataLines = [];
        if (!raw) { eventType = 'message'; return; }
        try {
          const item = JSON.parse(raw);
          const video = _mapStreamItem(item);
          if (eventType === 'analysis-created') {
            const idx = CD.allVideos.findIndex(v => v.id === video.id);
            if (idx === -1) CD.allVideos.unshift(video);
            else CD.allVideos[idx] = video;
            cdFilterVideos();
            if (_currentView === 'dashboard') cdRenderDashboard();
          } else if (eventType === 'video-processed') {
            const idx = CD.allVideos.findIndex(v => v.id === video.id);
            if (idx !== -1) CD.allVideos[idx] = video;
            else CD.allVideos.unshift(video);
            cdFilterVideos();
            if (_currentView === 'dashboard') cdRenderDashboard();
            cdStatus(`Video processed: ${video.display_name}`, 'ok');
          }
        } catch (_) {}
        eventType = 'message';
      }
    }

    function pump() {
      reader.read().then(({ done, value }) => {
        if (done || signal.aborted) return;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        lines.forEach(processLine);
        pump();
      }).catch(() => {
        if (!signal.aborted) _sseReconnect();
      });
    }
    pump();
  }).catch(() => {
    if (!signal.aborted) _sseReconnect();
  });
}

function _sseReconnect() {
  cdStatus('SSE stream disconnected — retrying in 8s', 'err');
  AUTH.sseAbort = null;
  setTimeout(() => { if (AUTH.token) cdConnectSSE(); }, 8000);
}

function _mapStreamItem(item) {
  const streamable = item.is_streamable && item.stream_url;
  return {
    id: item.player_analysis_id,
    player_id: item.player_id,
    display_name: `Player — ${item.analysis_type || item.video_analysis_type || 'session'}`,
    player_name: item.player_id || 'Unknown',
    angle: item.analysis_type || 'other',
    video_url: item.original_video_url,
    video_processed_url: streamable ? item.stream_url : null,
    video_processing_status: item.video_processing_status,
    analysis_type: item.analysis_type,
    video_analysis_type: item.video_analysis_type,
    start_timestamp: item.start_timestamp,
    end_timestamp: item.end_timestamp,
    is_streamable: !!streamable,
    isAdminApi: true,
  };
}

// ── Electron bridge helper ────────────────────────────────────────
const _electron = () => window.electron || window.parent?.electron;

// Track local video path for export
let localVideoPath = null;

// ═══════════════════════════════════════════════════════════
// Load local video from file system
// ═══════════════════════════════════════════════════════════
async function cdLoadLocalVideo() {
  const api = _electron();

  // Electron path — native file dialog
  if (api?.takneekPickLocalVideo) {
    cdStatus('Opening file picker...');
    const filePath = await api.takneekPickLocalVideo();
    if (!filePath) { cdStatus('File selection cancelled'); return; }
    _loadVideoFromPath(filePath);
    return;
  }

  // Web path — hidden <input type="file">
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp4,.mov,.avi,.mkv,.webm,.mts,.ts,video/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) { cdStatus('File selection cancelled'); return; }
    _loadVideoFromBlob(file);
  };
  input.click();
}

// ── Drag-and-drop handlers ────────────────────────────────────
function cdDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cd-placeholder');
  if (zone) zone.classList.add('drag-over');
}

function cdDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cd-placeholder');
  if (zone) zone.classList.remove('drag-over');
}

function cdDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cd-placeholder');
  if (zone) zone.classList.remove('drag-over');

  const file = e.dataTransfer?.files?.[0];
  if (!file) return;

  // Validate video type
  const validExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mts', 'ts'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!validExts.includes(ext)) {
    cdStatus('Unsupported file type: .' + ext, 'err');
    return;
  }

  // Electron: dropped files have a .path property; web: use blob URL
  if (file.path) {
    _loadVideoFromPath(file.path);
  } else {
    _loadVideoFromBlob(file);
  }
}

// ── Core: load any local video by path ────────────────────────
function _loadVideoFromPath(filePath) {
  localVideoPath = filePath;
  const parts = filePath.replace(/\\/g, '/').split('/');
  const fileName = parts[parts.length - 1];

  // Create a synthetic video entry
  CD.activeVideo = {
    id: 'local-' + Date.now(),
    display_name: fileName,
    player_name: 'Local File',
    angle: 'other',
    video_url: filePath,
    analysis_type: CD.category === 'bowler' ? 'bowler' : 'batter',
  };

  // Reset clip state
  CD.clips = [];
  CD.clipCounter = 0;
  CD.annCounter = 0;
  CD.inPoint = null;
  CD.outPoint = null;
  CD.generated = false;
  CD.selectedClipId = null;
  CD.duration = 0;
  CD.sessionId = uid('sess');

  // Show video info bar
  const bar = document.getElementById('cd-video-bar');
  bar.style.display = 'flex';
  document.getElementById('cd-vbar-name').textContent = fileName;
  document.getElementById('cd-vbar-player').textContent = 'Local File';
  document.getElementById('cd-vbar-angle').textContent = 'Local';
  document.getElementById('cd-vbar-dur').textContent = '';

  // Load into player
  document.getElementById('cd-placeholder').style.display = 'none';
  videoEl.style.display = 'block';
  videoEl.src = 'file://' + filePath;
  videoEl.load();

  // Reset UI
  seekFill.style.width = '0%';
  seekBuffer.style.width = '0%';
  seekThumb.style.left = '0%';
  timeCur.textContent = '0:00.0';
  timeDur.textContent = '--';
  seekLayers.innerHTML = '';

  renderInOut();
  renderClips();
  renderAnnPanel();
  syncMuteBtn(videoEl.muted);
  updateUploadBtn();

  cdStatus('Loaded local file: ' + fileName, 'ok');
}

// ── Web fallback: load a File object via blob URL ─────────────
let _currentBlobUrl = null;
function _loadVideoFromBlob(file) {
  if (_currentBlobUrl) { URL.revokeObjectURL(_currentBlobUrl); _currentBlobUrl = null; }
  const blobUrl = URL.createObjectURL(file);
  _currentBlobUrl = blobUrl;
  localVideoPath = null; // no path on web — triggers browser-side fallbacks in export/preview

  const fileName = file.name;

  CD.activeVideo = {
    id: 'local-' + Date.now(),
    display_name: fileName,
    player_name: 'Local File',
    angle: 'other',
    video_url: blobUrl,
    analysis_type: CD.category === 'bowler' ? 'bowler' : 'batter',
  };

  CD.clips = []; CD.clipCounter = 0; CD.annCounter = 0;
  CD.inPoint = null; CD.outPoint = null; CD.generated = false;
  CD.selectedClipId = null; CD.duration = 0;
  CD.sessionId = uid('sess');

  const bar = document.getElementById('cd-video-bar');
  bar.style.display = 'flex';
  document.getElementById('cd-vbar-name').textContent = fileName;
  document.getElementById('cd-vbar-player').textContent = 'Local File';
  document.getElementById('cd-vbar-angle').textContent = 'Local';
  document.getElementById('cd-vbar-dur').textContent = '';

  document.getElementById('cd-placeholder').style.display = 'none';
  videoEl.style.display = 'block';
  videoEl.src = blobUrl;
  videoEl.load();

  seekFill.style.width = '0%';
  seekBuffer.style.width = '0%';
  seekThumb.style.left = '0%';
  timeCur.textContent = '0:00.0';
  timeDur.textContent = '--';
  seekLayers.innerHTML = '';

  renderInOut(); renderClips(); renderAnnPanel();
  syncMuteBtn(videoEl.muted); updateUploadBtn();
  cdStatus('Loaded: ' + fileName, 'ok');
}

// ── DOM refs ────────────────────────────────────────────────────
let videoEl, seekWrap, seekTrack, seekFill, seekBuffer, seekThumb,
  seekLayers, seekTooltip, timeCur, timeDur, playBtn, muteBtn, statusBar;

// ── Annotation canvas refs ────────────────────────────────────
let _sCanvas = null, _sCtx = null;
let _gridEnabled = false;

// ── Player zoom state ─────────────────────────────────────────
const ZOOM = { level: 1, panX: 0, panY: 0 };
const ZOOM_MIN = 1, ZOOM_MAX = 12, ZOOM_SPEED = 0.12;

// ═══════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════
function _cdDomInit() {
  videoEl = document.getElementById('cd-video');
  seekWrap = document.getElementById('cd-seekbar-wrap');
  seekTrack = document.getElementById('cd-seek-track');
  seekFill = document.getElementById('cd-seek-fill');
  seekBuffer = document.getElementById('cd-seek-buffer');
  seekThumb = document.getElementById('cd-seek-thumb');
  seekLayers = document.getElementById('cd-seek-layers');
  seekTooltip = document.getElementById('cd-seek-tooltip');
  timeCur = document.getElementById('cd-time-cur');
  timeDur = document.getElementById('cd-time-dur');
  playBtn = document.getElementById('cd-play-btn');
  muteBtn = document.getElementById('cd-mute-btn');
  statusBar = document.getElementById('cd-statusbar');

  // Annotation engine canvas
  _sCanvas = document.getElementById('cd-speed-canvas');
  _sCtx = _sCanvas.getContext('2d');
  _sCanvas.addEventListener('mousedown', cdAnnotOnMouseDown);
  _sCanvas.addEventListener('mousemove', cdAnnotOnMouseMove);
  _sCanvas.addEventListener('mouseup', cdAnnotOnMouseUp);
  window.addEventListener('resize', cdAnnotResizeCanvas);

  // Player zoom
  const _playerBox = document.querySelector('.cd-player-box');
  if (_playerBox) {
    _playerBox.addEventListener('wheel', cdZoomOnWheel, { passive: false });
    _playerBox.addEventListener('dblclick', cdZoomReset);
  }

  // Video events
  videoEl.addEventListener('timeupdate', onTimeUpdate);
  videoEl.addEventListener('timeupdate', _annotOnTimeUpdate);
  videoEl.addEventListener('loadedmetadata', onVideoLoaded);
  videoEl.addEventListener('progress', onProgress);
  videoEl.addEventListener('play', () => syncPlayBtn(true));
  videoEl.addEventListener('pause', () => syncPlayBtn(false));
  videoEl.addEventListener('ended', () => syncPlayBtn(false));
  videoEl.addEventListener('error', onVideoError);

  // Seek bar
  seekWrap.addEventListener('mousedown', onSeekDown);
  seekWrap.addEventListener('mousemove', onSeekHover);
  seekWrap.addEventListener('mouseleave', () => { seekTooltip.style.opacity = '0'; });

  // Keyboard
  document.addEventListener('keydown', onKeyDown);

  // Auth init — shows login overlay or connects with saved token
  cdAuthInit();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _cdDomInit);
} else {
  // Defer so the full script finishes evaluating before init runs
  setTimeout(_cdDomInit, 0);
}

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════
function fmtTime(s) {
  if (s === null || s === undefined || isNaN(s)) return '—';
  const neg = s < 0;
  s = Math.abs(s);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  const ds = Math.floor((s % 1) * 10);
  return `${neg ? '-' : ''}${m}:${sec}.${ds}`;
}

function pct(t) {
  return CD.duration > 0 ? Math.max(0, Math.min(100, (t / CD.duration) * 100)) : 0;
}

function timeAtX(e) {
  const rect = seekTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  return ratio * CD.duration;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cdStatus(msg, type = '') {
  statusBar.textContent = msg;
  statusBar.className = `cd-statusbar${type ? ' ' + type : ''}`;
}

function angleLabel(a) {
  return ANGLE_LABELS[a] || (a || '—');
}

// ═══════════════════════════════════════════════════════════
// VideoStreamService — SSE via fetch (supports auth headers)
// ═══════════════════════════════════════════════════════════
const VideoStreamService = (() => {
  let _abort = null;
  let _retryTimer = null;
  const RETRY_DELAY = 5000;

  // Keyed by player_analysis_id — no duplicates
  const _store = new Map();

  function _notify() {
    const items = Array.from(_store.values());
    CD.allVideos = items.map(_mapStreamItem);
    cdFilterVideos();
    if (typeof _currentView !== 'undefined' && _currentView === 'dashboard') {
      cdRenderDashboard();
    }
    const n = CD.allVideos.length;
    cdStatus(`${n} video${n !== 1 ? 's' : ''} in queue`, n > 0 ? 'ok' : '');
  }

  function _applyItems(raw) {
    const arr = Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
      : null;
    if (!arr) return false;
    arr.forEach(item => {
      if (item?.player_analysis_id) _store.set(item.player_analysis_id, item);
    });
    return true;
  }

  function _parseMessage(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function connect(token) {
    disconnect();

    _abort = new AbortController();
    const { signal } = _abort;

    fetch(`${ADMIN_API}/video-processing/stream`, {
      headers: adminHeaders(),
      signal,
    }).then(res => {
      if (res.status === 401) { cdStatus('API returned 401 — check credentials', 'err'); return; }
      if (res.status === 404) {
        _store.clear();
        _notify();
        cdStatus('No videos in the queue yet', '');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done || signal.aborted) return;

          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = _parseMessage(line.slice(5).trim());
            if (!payload) continue;
            if (_applyItems(payload)) _notify();
          }

          pump();
        }).catch(() => {
          if (!signal.aborted) _scheduleRetry(token);
        });
      }

      pump();
    }).catch(() => {
      if (!signal.aborted) _scheduleRetry(token);
    });
  }

  function disconnect() {
    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
    if (_abort) { _abort.abort(); _abort = null; }
  }

  function _scheduleRetry(token) {
    cdStatus('Stream disconnected — retrying…', 'err');
    _retryTimer = setTimeout(() => {
      if (AUTH.token) connect(token);
    }, RETRY_DELAY);
  }

  function reset() {
    disconnect();
    _store.clear();
  }

  return { connect, disconnect, reset };
})();

// Public entry points wired to buttons / auth
function cdFetchVideos() {
  VideoStreamService.connect(AUTH.token);
}

// ── Apply search + angle filter ────────────────────────────────
function cdFilterVideos() {
  const q = (document.getElementById('cd-search-input')?.value || '').toLowerCase().trim();
  const angle = document.getElementById('cd-angle-filter')?.value || '';

  CD.filteredVideos = CD.allVideos.filter(v => {
    const matchSearch = !q
      || (v.display_name || '').toLowerCase().includes(q)
      || (v.player_name || '').toLowerCase().includes(q)
      || (v.original_filename || '').toLowerCase().includes(q);
    const matchAngle = !angle || v.angle === angle;
    return matchSearch && matchAngle;
  });

  renderVideoList();
}

// ── Status helpers ─────────────────────────────────────────────
const STATUS_META = {
  pending:    { label: 'Queued',     cls: 'cd-status--pending',    icon: '⏳' },
  processing: { label: 'Processing', cls: 'cd-status--processing', icon: null },
  completed:  { label: 'Ready',      cls: 'cd-status--completed',  icon: '▶' },
  failed:     { label: 'Failed',     cls: 'cd-status--failed',     icon: '✕' },
};

function _statusBadge(status) {
  const m = STATUS_META[status] || { label: status || '—', cls: '', icon: null };
  const spinner = status === 'processing'
    ? `<span class="cd-status-spinner"></span>`
    : (m.icon ? `<span>${m.icon}</span>` : '');
  return `<span class="cd-vitem-status ${m.cls}">${spinner}${escHtml(m.label)}</span>`;
}

function _itemIcon(status, streamable) {
  if (status === 'processing') {
    return `<div class="cd-vitem-icon cd-vitem-icon--processing"><span class="cd-status-spinner cd-status-spinner--dark"></span></div>`;
  }
  if (status === 'failed') {
    return `<div class="cd-vitem-icon cd-vitem-icon--failed">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    </div>`;
  }
  if (status === 'completed' && streamable) {
    return `<div class="cd-vitem-icon cd-vitem-icon--ready">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
    </div>`;
  }
  return `<div class="cd-vitem-icon">
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
  </div>`;
}

// ── Render video list in left panel ────────────────────────────
function renderVideoList() {
  const list = document.getElementById('cd-video-list');
  const label = document.getElementById('cd-video-count-label');

  const total = CD.allVideos.length;
  const filtered = CD.filteredVideos.length;
  label.textContent = filtered === total
    ? `${total} video${total !== 1 ? 's' : ''}`
    : `${filtered} of ${total} videos`;

  if (filtered === 0) {
    list.innerHTML = `
      <div class="cd-vlist-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="opacity:.3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"/>
        </svg>
        <span>${total === 0 ? 'No videos in the queue yet.' : 'No videos match your search.'}</span>
      </div>`;
    return;
  }

  list.innerHTML = CD.filteredVideos.map(v => {
    const active = CD.activeVideo?.id === v.id;
    const status = v.video_processing_status || 'pending';
    const name   = v.display_name || `Video ${v.id}`;
    const angle  = v.angle
      ? `<span class="cd-vitem-angle cd-vitem-angle-${escHtml(v.angle)}">${escHtml(angleLabel(v.angle))}</span>`
      : '';

    return `
      <div class="cd-video-item cd-video-item--${escHtml(status)}${active ? ' active' : ''}"
           onclick="cdSelectVideo('${escHtml(v.id)}')">
        ${_itemIcon(status, v.is_streamable)}
        <div class="cd-vitem-meta">
          <span class="cd-vitem-name">${escHtml(name)}</span>
          <div class="cd-vitem-tags">${angle}${_statusBadge(status)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderVideoListError(msg) {
  const list = document.getElementById('cd-video-list');
  const label = document.getElementById('cd-video-count-label');
  label.textContent = 'Connection error';
  list.innerHTML = `
    <div class="cd-vlist-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="opacity:.4;color:var(--warn)">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <span>Could not connect to Takneek API.<br><small style="opacity:.6">${escHtml(msg)}</small></span>
      <button class="cd-retry-btn" onclick="cdFetchVideos()">Retry</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// Select a video → load into player
// ═══════════════════════════════════════════════════════════
async function cdSelectVideo(id) {
  const video = CD.allVideos.find(v => v.id === id);
  if (!video) return;

  CD.activeVideo = video;
  CD.clips = [];
  CD.clipCounter = 0;
  CD.annCounter = 0;
  CD.inPoint = null;
  CD.outPoint = null;
  CD.generated = false;
  CD.selectedClipId = null;
  CD.duration = 0;
  CD.sessionId = uid('sess');
  _detachClipBoundary();

  // Update the list to reflect active state
  renderVideoList();

  // Show video info bar
  const bar = document.getElementById('cd-video-bar');
  const name = video.display_name || video.original_filename || `Video ${id}`;
  bar.style.display = 'flex';
  document.getElementById('cd-vbar-name').textContent = name;
  document.getElementById('cd-vbar-player').textContent = video.player_name || '';
  document.getElementById('cd-vbar-angle').textContent = angleLabel(video.angle);
  document.getElementById('cd-vbar-dur').textContent = '';

  // Load video — fetch a signed download URL from the Takneek API
  document.getElementById('cd-placeholder').style.display = 'none';
  videoEl.style.display = 'block';
  cdStatus(`Getting signed URL for "${name}"…`);

  try {
    if (video.isAdminApi) {
      // Use stream_url (processed) if available, fall back to original_video_url
      const srcUrl = video.video_processed_url || video.video_url;
      if (!srcUrl) throw new Error('No video URL available');
      videoEl.src = srcUrl;
      videoEl.load();
    } else {
      const srcUrl = video.video_processed_url || video.video_url;
      const dlRes = await fetch(
        `${TAKNEEK_API}/upload/download-url?url=${encodeURIComponent(srcUrl)}`,
        { headers: tkHeaders() }
      );
      if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`);
      const { downloadUrl } = await dlRes.json();
      videoEl.src = downloadUrl;
      videoEl.load();
    }
  } catch (err) {
    onVideoError();
    cdStatus(`Could not get video URL — ${err.message}`, 'err');
    return;
  }

  // Reset UI
  seekFill.style.width = '0%';
  seekBuffer.style.width = '0%';
  seekThumb.style.left = '0%';
  timeCur.textContent = '0:00.0';
  timeDur.textContent = '—';
  seekLayers.innerHTML = '';

  renderInOut();
  renderClips();
  renderAnnPanel();
  syncMuteBtn(videoEl.muted);
  updateUploadBtn();

  cdStatus(`Loading "${name}"…`);
}

// ═══════════════════════════════════════════════════════════
// Video element events
// ═══════════════════════════════════════════════════════════
function onVideoLoaded() {
  CD.duration = videoEl.duration;
  timeDur.textContent = fmtTime(CD.duration);
  document.getElementById('cd-vbar-dur').textContent = fmtTime(CD.duration);
  cdAnnotResizeCanvas();

  const name = CD.activeVideo?.display_name || CD.activeVideo?.original_filename || 'video';
  cdStatus(`"${name}" ready — ${fmtTime(CD.duration)}`, 'ok');

  videoEl.play().catch(() => {});
}

function onVideoError() {
  document.getElementById('cd-placeholder').style.display = 'flex';
  videoEl.style.display = 'none';
  cdStatus('Failed to load video stream. Is the Takneek server running?', 'err');
}

function onProgress() {
  if (!videoEl.buffered.length || !CD.duration) return;
  const end = videoEl.buffered.end(videoEl.buffered.length - 1);
  seekBuffer.style.width = `${pct(end)}%`;
}

function onTimeUpdate() {
  const t = videoEl.currentTime;

  // If a clip is selected and we're playing, enforce boundaries
  if (CD.selectedClipId && !videoEl.paused && !CD.isDragging) {
    const clip = CD.clips.find(c => c.id === CD.selectedClipId);
    if (clip && t >= clip.outTime) {
      videoEl.pause();
      videoEl.currentTime = clip.outTime;
    }
  }

  const p = `${pct(t)}%`;
  seekFill.style.width = p;
  seekThumb.style.left = p;
  timeCur.textContent = fmtTime(t);
}

// ═══════════════════════════════════════════════════════════
// Playback
// ═══════════════════════════════════════════════════════════
function cdTogglePlay() {
  if (!CD.activeVideo) return;
  if (videoEl.paused) videoEl.play().catch(() => { });
  else videoEl.pause();
}

function syncPlayBtn(playing) {
  playBtn.innerHTML = playing
    ? `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>`;
}

function cdStepFrame(dir) {
  if (!CD.activeVideo) return;
  videoEl.currentTime = Math.max(0, Math.min(CD.duration, videoEl.currentTime + dir * (1 / CD.fps)));
}

function cdSetSpeed(val) {
  videoEl.playbackRate = parseFloat(val);
}

function cdToggleMute() {
  if (!CD.activeVideo) return;
  videoEl.muted = !videoEl.muted;
  syncMuteBtn(videoEl.muted);
}

function syncMuteBtn(muted) {
  muteBtn.innerHTML = muted
    ? `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

// ═══════════════════════════════════════════════════════════
// Seek bar interaction
// ═══════════════════════════════════════════════════════════
function onSeekDown(e) {
  if (!CD.duration) return;
  e.preventDefault();
  CD.isDragging = true;
  seekWrap.classList.add('dragging');
  videoEl.currentTime = timeAtX(e);

  const onMove = (ev) => { videoEl.currentTime = timeAtX(ev); };
  const onUp = () => {
    CD.isDragging = false;
    seekWrap.classList.remove('dragging');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onSeekHover(e) {
  if (!CD.duration) return;
  const t = timeAtX(e);
  seekTooltip.textContent = fmtTime(t);
  seekTooltip.style.left = `${pct(t)}%`;
  seekTooltip.style.opacity = '1';
}

// ═══════════════════════════════════════════════════════════
// Start / End markers
// ═══════════════════════════════════════════════════════════
function cdSetIn() {
  if (!CD.activeVideo) return;
  CD.inPoint = videoEl.currentTime;
  renderInOut();
  renderMarkers();
  cdStatus(`Start point set at ${fmtTime(CD.inPoint)}`, 'ok');
}

function cdSetOut() {
  if (!CD.activeVideo) return;
  CD.outPoint = videoEl.currentTime;
  renderInOut();
  renderMarkers();
  cdStatus(`End point set at ${fmtTime(CD.outPoint)}`, 'ok');
}

function cdClearIn() { CD.inPoint = null; renderInOut(); renderMarkers(); cdStatus('Start point cleared'); }
function cdClearOut() { CD.outPoint = null; renderInOut(); renderMarkers(); cdStatus('End point cleared'); }

function renderInOut() {
  const inChip = document.getElementById('cd-in-chip');
  const outChip = document.getElementById('cd-out-chip');
  const durEl = document.getElementById('cd-io-dur');

  document.getElementById('cd-in-val').textContent = CD.inPoint !== null ? fmtTime(CD.inPoint) : '—';
  document.getElementById('cd-out-val').textContent = CD.outPoint !== null ? fmtTime(CD.outPoint) : '—';

  inChip.className = `cd-io-chip${CD.inPoint !== null ? ' set' : ''}`;
  outChip.className = `cd-io-chip${CD.outPoint !== null ? ' set' : ''}`;

  if (CD.inPoint !== null && CD.outPoint !== null) {
    durEl.textContent = fmtTime(Math.abs(CD.outPoint - CD.inPoint));
    durEl.style.display = 'inline-flex';
  } else {
    durEl.style.display = 'none';
  }
}

function renderMarkers() {
  if (!seekLayers) return;
  let html = '';

  for (const clip of CD.clips) {
    const inP = pct(clip.inTime), outP = pct(clip.outTime);
    const sel = clip.id === CD.selectedClipId;
    html += `<div class="cd-seek-region" style="left:${inP}%;width:${outP - inP}%;background:rgba(249,83,32,${sel ? '.22' : '.10'});border:1px solid rgba(249,83,32,${sel ? '.55' : '.28'})"></div>`;
    html += `<div class="cd-seek-pin pin-clip-in"  style="left:${inP}%"></div>`;
    html += `<div class="cd-seek-pin pin-clip-out" style="left:${outP}%"></div>`;
  }

  if (CD.inPoint !== null) html += `<div class="cd-seek-pin pin-in"  style="left:${pct(CD.inPoint)}%"></div>`;
  if (CD.outPoint !== null) html += `<div class="cd-seek-pin pin-out" style="left:${pct(CD.outPoint)}%"></div>`;

  seekLayers.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// Add clip
// ═══════════════════════════════════════════════════════════
function cdAddClip() {
  if (!CD.activeVideo) { cdStatus('Select a video first', 'err'); return; }
  if (CD.inPoint === null) { cdStatus('Set a Start point first (press I)', 'err'); return; }
  if (CD.outPoint === null) { cdStatus('Set an End point first (press O)', 'err'); return; }

  const inT = Math.min(CD.inPoint, CD.outPoint);
  const outT = Math.max(CD.inPoint, CD.outPoint);
  if (outT - inT < 0.05) { cdStatus('Clip too short (min 0.05 s)', 'err'); return; }

  CD.clipCounter++;
  const clip = { id: uid('clip'), label: `Clip ${CD.clipCounter}`, inTime: inT, outTime: outT, annotations: [] };
  CD.clips.push(clip);
  CD.inPoint = null;
  CD.outPoint = null;
  renderInOut(); renderMarkers(); renderClips(); updateUploadBtn();
  cdGenerateClips(true);
  cdStatus(`Added ${clip.label} — ${fmtTime(inT)} → ${fmtTime(outT)}  (${fmtTime(outT - inT)})`, 'ok');

  if (CD.category === 'bowler') cdSelectClip(clip.id);
}

// ═══════════════════════════════════════════════════════════
// Clip selection / deletion
// ═══════════════════════════════════════════════════════════
let _clipBoundaryFn = null;

function _attachClipBoundary(clip) {
  _detachClipBoundary();
  _clipBoundaryFn = () => {
    if (videoEl.currentTime >= clip.outTime) {
      videoEl.pause();
      videoEl.currentTime = clip.outTime;
    }
  };
  videoEl.addEventListener('timeupdate', _clipBoundaryFn);
}

function _detachClipBoundary() {
  if (_clipBoundaryFn) {
    videoEl.removeEventListener('timeupdate', _clipBoundaryFn);
    _clipBoundaryFn = null;
  }
}

function cdSelectClip(id) {
  CD.selectedClipId = CD.selectedClipId === id ? null : id;
  renderClips(); renderMarkers(); renderAnnPanel();
  if (CD.selectedClipId) {
    const clip = CD.clips.find(c => c.id === CD.selectedClipId);
    if (clip) {
      videoEl.currentTime = clip.inTime;
      _attachClipBoundary(clip);
    }
  } else {
    _detachClipBoundary();
  }
}

function cdDeleteClip(e, id) {
  e.stopPropagation();
  CD.clips = CD.clips.filter(c => c.id !== id);
  if (CD.selectedClipId === id) { CD.selectedClipId = null; _detachClipBoundary(); }
  renderClips(); renderMarkers(); renderAnnPanel(); updateUploadBtn();
  cdGenerateClips(true);
  cdStatus('Clip removed');
}

function renderClips() {
  const list = document.getElementById('cd-clips-scroll');
  document.getElementById('cd-clip-count').textContent = CD.clips.length;

  if (CD.clips.length === 0) {
    list.innerHTML = `
      <div class="cd-empty">
        <svg class="cd-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
        </svg>
        <span>No clips yet.<br>Set Start &amp; End points, then click<br><strong>+ Add Clip</strong>.</span>
      </div>`;
    return;
  }

  list.innerHTML = CD.clips.map((clip, i) => {
    const dur = clip.outTime - clip.inTime;
    const selected = clip.id === CD.selectedClipId;
    const isBowler = CD.category === 'bowler';
    const isBatsman = CD.category === 'batsman';

    const annBadge = clip.annotations.length > 0
      ? `<span class="cd-ann-badge">${clip.annotations.length} stage${clip.annotations.length > 1 ? 's' : ''}</span>`
      : '';

    const shotBadge = isBatsman && clip.shotType
      ? `<span class="cd-shot-badge">${escHtml(BATSMAN_SHOTS[clip.shotType] || clip.shotType)}</span>`
      : '';

    const stagesHtml = selected && clip.annotations.length > 0
      ? `<div class="cd-clip-stages">${clip.annotations.map(ann => {
        const loc = ann.frameStart !== undefined
          ? `${ann.frameStart}→${ann.frameEnd}`
          : `f${ann.frame}`;
        return `<div class="cd-stage-chip">
            <span class="cd-stage-name">${escHtml(ann.label)}</span>
            <span class="cd-stage-ts">${loc}</span>
          </div>`;
      }).join('')}</div>`
      : '';

    return `
      <div class="cd-clip-card${selected ? ' selected' : ''}" onclick="cdSelectClip('${clip.id}')">
        <div class="cd-clip-row">
          <div class="cd-clip-left">
            <span class="cd-clip-num">${i + 1}</span>
            <div class="cd-clip-meta">
              <span class="cd-clip-name">${escHtml(clip.label)}</span>
              <span class="cd-clip-range">${fmtTime(clip.inTime)} → ${fmtTime(clip.outTime)}</span>
            </div>
          </div>
          <div class="cd-clip-right">
            <span class="cd-clip-dur">${fmtTime(dur)}</span>
            ${shotBadge}${annBadge}
            <button class="cd-clip-test" onclick="cdTestClip(event,'${clip.id}')" title="Preview this clip">
              <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="cd-clip-del" onclick="cdDeleteClip(event,'${clip.id}')" title="Delete">×</button>
          </div>
        </div>
        ${stagesHtml}
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// Annotation (bowler)
// ═══════════════════════════════════════════════════════════
// Stage order for the checklist
const STAGE_ORDER = ['run_up', 'back_foot_contact', 'delivery_stride', 'front_foot_landing', 'ball_release', 'follow_through'];

function renderAnnPanel() {
  const panel = document.getElementById('cd-ann-panel');
  panel.classList.add('visible');

  const noSel    = document.getElementById('cd-ann-no-sel');
  const stagesEl = document.getElementById('cd-ann-stages');
  const progress = document.getElementById('cd-ann-progress');
  const header   = document.getElementById('cd-ann-header');

  const isBowler  = CD.category === 'bowler';
  const isBatsman = CD.category === 'batsman';

  if (!CD.selectedClipId) {
    noSel.style.display = 'block';
    stagesEl.style.display = 'none';
    progress.textContent = '';
    header.textContent = isBowler ? 'Bowling Stages' : 'Batting Stages';
    return;
  }

  const clip = CD.clips.find(c => c.id === CD.selectedClipId);
  if (!clip) return;

  noSel.style.display = 'none';
  stagesEl.style.display = 'block';
  header.textContent = clip.label;

  // ── Bowler panel ───────────────────────────────────────────
  if (isBowler) {
    const done = clip.annotations.length;
    progress.textContent = `${done}/${STAGE_ORDER.length}`;

    stagesEl.innerHTML = STAGE_ORDER.map((stage, idx) => {
      const ann     = clip.annotations.find(a => a.stage === stage);
      const label   = STAGES[stage];
      const isRange = RANGE_STAGES.has(stage);
      const isDone  = !!ann;

      const valueHtml = isDone
        ? (isRange
            ? `<span class="cd-srow-val">${ann.frameStart} → ${ann.frameEnd}</span>`
            : `<span class="cd-srow-val">frame ${ann.frame}</span>`)
        : '';

      const actionHtml = isDone
        ? `<button class="cd-srow-redo" onclick="cdClearStage('${clip.id}','${stage}')" title="Re-mark">↺</button>`
        : isRange
          ? `<button class="cd-srow-mark cd-srow-start" onclick="cdMarkStage('${stage}','start')">▶ Start</button>
             <button class="cd-srow-mark cd-srow-end"   onclick="cdMarkStage('${stage}','end')">■ End</button>`
          : `<button class="cd-srow-mark" onclick="cdMarkStage('${stage}','frame')">◆ Mark</button>`;

      return `
        <div class="cd-srow${isDone ? ' done' : ''}">
          <div class="cd-srow-left">
            <span class="cd-srow-num">${idx + 1}</span>
            <div class="cd-srow-info">
              <span class="cd-srow-label">${label}</span>${valueHtml}
            </div>
          </div>
          <div class="cd-srow-actions">${actionHtml}</div>
        </div>`;
    }).join('');
    return;
  }

  // ── Batsman panel ──────────────────────────────────────────
  if (isBatsman) {
    const done = clip.annotations.length;
    progress.textContent = `${done}/${BATSMAN_STAGE_ORDER.length}`;

    // Shot type selector
    const shotOptions = Object.entries(BATSMAN_SHOTS).map(([k, v]) =>
      `<option value="${k}"${clip.shotType === k ? ' selected' : ''}>${escHtml(v)}</option>`
    ).join('');

    const shotSelector = `
      <div class="cd-shot-selector">
        <label class="cd-shot-label">Shot Type</label>
        <select class="cd-shot-select" onchange="cdSetShotType('${clip.id}', this.value)">
          <option value="">— Select shot —</option>
          ${shotOptions}
        </select>
      </div>`;

    // Movement stages
    const stageRows = BATSMAN_STAGE_ORDER.map((stage, idx) => {
      const ann     = clip.annotations.find(a => a.stage === stage);
      const label   = BATSMAN_STAGES[stage];
      const isRange = BATSMAN_RANGE_STAGES.has(stage);
      const isDone  = !!ann;

      const pending = clip._pendingRange?.[stage];

      const valueHtml = isDone
        ? (isRange
            ? `<span class="cd-srow-val">${ann.frameStart} → ${ann.frameEnd}</span>`
            : `<span class="cd-srow-val">frame ${ann.frame}</span>`)
        : pending
          ? (pending.start !== undefined
              ? `<span class="cd-srow-val cd-srow-pending">start f${pending.start} — mark end</span>`
              : `<span class="cd-srow-val cd-srow-pending">end f${pending.end} — mark start</span>`)
          : '';

      const actionHtml = isDone
        ? `<button class="cd-srow-redo" onclick="cdClearBatsmanStage('${clip.id}','${stage}')" title="Re-mark">↺</button>`
        : isRange
          ? `<button class="cd-srow-mark cd-srow-start" onclick="cdMarkBatsmanStage('${stage}','start')">▶ Start</button>
             <button class="cd-srow-mark cd-srow-end"   onclick="cdMarkBatsmanStage('${stage}','end')">■ End</button>`
          : `<button class="cd-srow-mark" onclick="cdMarkBatsmanStage('${stage}','frame')">◆ Mark</button>`;

      return `
        <div class="cd-srow${isDone ? ' done' : ''}">
          <div class="cd-srow-left">
            <span class="cd-srow-num">${idx + 1}</span>
            <div class="cd-srow-info">
              <span class="cd-srow-label">${label}</span>${valueHtml}
            </div>
          </div>
          <div class="cd-srow-actions">${actionHtml}</div>
        </div>`;
    }).join('');

    stagesEl.innerHTML = shotSelector + stageRows;
  }
}

// Mark a stage at the current video position
function cdMarkStage(stage, which) {
  if (!CD.selectedClipId) return;
  const clip = CD.clips.find(c => c.id === CD.selectedClipId);
  if (!clip) return;

  const frame = Math.round(videoEl.currentTime * CD.fps);

  if (which === 'frame') {
    // Single-frame stage: mark immediately
    clip.annotations = clip.annotations.filter(a => a.stage !== stage);
    clip.annotations.push({ id: uid('ann'), stage, label: STAGES[stage], frame, timestamp: frame / CD.fps });
    clip.annotations.sort((a, b) => a.timestamp - b.timestamp);
    cdStatus(`${STAGES[stage]} marked at frame ${frame}`, 'ok');
    renderClips(); renderAnnPanel();
    cdGenerateClips(true);
    return;
  }

  // Range stage: accumulate start/end, save when both set
  if (!clip._pendingRange) clip._pendingRange = {};
  if (!clip._pendingRange[stage]) clip._pendingRange[stage] = {};

  clip._pendingRange[stage][which] = frame;
  const p = clip._pendingRange[stage];

  if (p.start !== undefined && p.end !== undefined) {
    const frameStart = Math.min(p.start, p.end);
    const frameEnd = Math.max(p.start, p.end);
    clip.annotations = clip.annotations.filter(a => a.stage !== stage);
    clip.annotations.push({ id: uid('ann'), stage, label: STAGES[stage], frameStart, frameEnd, timestamp: frameStart / CD.fps });
    clip.annotations.sort((a, b) => a.timestamp - b.timestamp);
    delete clip._pendingRange[stage];
    cdStatus(`${STAGES[stage]}: frames ${frameStart}→${frameEnd}`, 'ok');
    renderClips(); renderAnnPanel();
    cdGenerateClips(true);
  } else {
    const waiting = which === 'start' ? 'now mark End' : 'now mark Start';
    cdStatus(`${STAGES[stage]} ${which} = frame ${frame} — ${waiting}`, 'info');
    renderAnnPanel(); // re-render to show pending state
  }
}

function cdClearStage(clipId, stage) {
  const clip = CD.clips.find(c => c.id === clipId);
  if (!clip) return;
  clip.annotations = clip.annotations.filter(a => a.stage !== stage);
  if (clip._pendingRange) delete clip._pendingRange[stage];
  renderClips(); renderAnnPanel();
  cdGenerateClips(true);
  cdStatus(`${STAGES[stage]} cleared`, 'info');
}

// ── Batsman: set shot type ─────────────────────────────────────
function cdSetShotType(clipId, shotType) {
  const clip = CD.clips.find(c => c.id === clipId);
  if (!clip) return;
  clip.shotType = shotType || null;
  renderClips();
  cdGenerateClips(true);
  cdStatus(shotType ? `Shot type: ${BATSMAN_SHOTS[shotType] || shotType}` : 'Shot type cleared', 'ok');
}

// ── Batsman: mark a movement stage ────────────────────────────
function cdMarkBatsmanStage(stage, which) {
  if (!CD.selectedClipId) return;
  const clip = CD.clips.find(c => c.id === CD.selectedClipId);
  if (!clip) return;

  const frame = Math.round(videoEl.currentTime * CD.fps);

  if (which === 'frame') {
    clip.annotations = clip.annotations.filter(a => a.stage !== stage);
    clip.annotations.push({ id: uid('ann'), stage, label: BATSMAN_STAGES[stage], frame, timestamp: frame / CD.fps });
    clip.annotations.sort((a, b) => a.timestamp - b.timestamp);
    cdStatus(`${BATSMAN_STAGES[stage]} marked at frame ${frame}`, 'ok');
    renderClips(); renderAnnPanel();
    cdGenerateClips(true);
    return;
  }

  if (!clip._pendingRange) clip._pendingRange = {};
  if (!clip._pendingRange[stage]) clip._pendingRange[stage] = {};
  clip._pendingRange[stage][which] = frame;
  const p = clip._pendingRange[stage];

  if (p.start !== undefined && p.end !== undefined) {
    const frameStart = Math.min(p.start, p.end);
    const frameEnd   = Math.max(p.start, p.end);
    clip.annotations = clip.annotations.filter(a => a.stage !== stage);
    clip.annotations.push({ id: uid('ann'), stage, label: BATSMAN_STAGES[stage], frameStart, frameEnd, timestamp: frameStart / CD.fps });
    clip.annotations.sort((a, b) => a.timestamp - b.timestamp);
    delete clip._pendingRange[stage];
    cdStatus(`${BATSMAN_STAGES[stage]}: frames ${frameStart}→${frameEnd}`, 'ok');
    renderClips(); renderAnnPanel();
    cdGenerateClips(true);
  } else {
    const waiting = which === 'start' ? 'now mark End' : 'now mark Start';
    cdStatus(`${BATSMAN_STAGES[stage]} ${which} = frame ${frame} — ${waiting}`, 'info');
    renderAnnPanel();
  }
}

// ── Batsman: clear a movement stage ───────────────────────────
function cdClearBatsmanStage(clipId, stage) {
  const clip = CD.clips.find(c => c.id === clipId);
  if (!clip) return;
  clip.annotations = clip.annotations.filter(a => a.stage !== stage);
  if (clip._pendingRange) delete clip._pendingRange[stage];
  renderClips(); renderAnnPanel();
  cdGenerateClips(true);
  cdStatus(`${BATSMAN_STAGES[stage]} cleared`, 'info');
}

function cdDeleteAnnotation(e, clipId, annId) {
  e.stopPropagation();
  const clip = CD.clips.find(c => c.id === clipId);
  if (clip) clip.annotations = clip.annotations.filter(a => a.id !== annId);
  renderClips(); renderAnnPanel();
  cdGenerateClips(true);
  cdStatus('Annotation removed');
}

// ═══════════════════════════════════════════════════════════
// Category switching
// ═══════════════════════════════════════════════════════════
function cdSetCategory(cat) {
  CD.category = cat;
  ['cd-cat-batsman','cd-type-batsman'].forEach(id => {
    const el = document.getElementById(id); if (el) el.className = `cd-cat-btn${cat === 'batsman' ? ' active' : ''}`;
  });
  ['cd-cat-bowler','cd-type-bowler'].forEach(id => {
    const el = document.getElementById(id); if (el) el.className = `cd-cat-btn${cat === 'bowler' ? ' active' : ''}`;
  });
  // Only call render functions after DOM refs are initialised
  if (seekLayers) { renderClips(); renderAnnPanel(); }
  if (statusBar) cdStatus(`Category → ${cat === 'batsman' ? 'Batsman' : 'Bowler'}`);
}

// ═══════════════════════════════════════════════════════════
// Generate + Upload
// ═══════════════════════════════════════════════════════════
function cdGenerateClips(silent = false) {
  if (!CD.activeVideo) { cdStatus('Select a video first', 'err'); return; }
  if (CD.clips.length === 0) { cdStatus('Add at least one clip first', 'err'); return; }

  if (CD.category === 'bowler') {
    const unannotated = CD.clips.filter(c => c.annotations.length === 0);
    if (unannotated.length > 0) {
      cdStatus(`${unannotated.length} clip(s) have no bowling annotations`, 'info');
    }
  }

  const metadata = buildMetadata();
  if (!silent) console.log('[Clipping] Session metadata:', JSON.stringify(metadata, null, 2));

  CD.generated = true;
  CD._lastMetadata = metadata;
  updateUploadBtn();

  const speedSummary = metadata.ball_speed
    ? ` · ${metadata.ball_speed.avg_kmh} km/h avg`
    : '';
  if (!silent) cdStatus(`Generated ${CD.clips.length} clip(s)${speedSummary}`, 'ok');

  // Auto-upload metadata to R2 if endpoint is configured
  cdUploadMetadataToR2(metadata, silent);
}

// ── R2 metadata upload ─────────────────────────────────────
async function cdUploadMetadataToR2(metadata, silent = false) {
  if (!R2_METADATA_URL) return; // not configured yet

  const key = `takneek/${metadata.sessionId}.json`;
  const url = R2_METADATA_URL.replace(/\/$/, '') + '/' + key;

  try {
    if (!silent) cdStatus('Uploading metadata to R2…', 'info');
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(R2_METADATA_TOKEN ? { Authorization: `Bearer ${R2_METADATA_TOKEN}` } : {}),
      },
      body: JSON.stringify(metadata, null, 2),
    });

    if (!silent) cdStatus(`Metadata uploaded → R2: ${key}`, 'ok');
    console.log('[R2] Uploaded metadata:', url);
  } catch (err) {
    if (!silent) cdStatus(`R2 upload failed — ${err.message}`, 'err');
    console.error('[R2] Upload error:', err);
  }
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════

// Cut the clip with ffmpeg and load the trimmed video into the player
async function cdTestClip(e, clipId) {
  e.stopPropagation();
  const clip = CD.clips.find(c => c.id === clipId);
  if (!clip || !CD.activeVideo) return;

  const api = _electron();

  // If we have a local file path and the Electron API, do a real ffmpeg cut
  if (localVideoPath && api?.takneekCutSingleClip) {
    const btn = e.target.closest('button') || e.target;
    btn.disabled = true;

    // Show mini player in loading state
    const miniPlayer = document.getElementById('cd-clip-player');
    const miniLoading = document.getElementById('cd-clip-player-loading');
    const miniVideo = document.getElementById('cd-clip-video');
    const miniLabel = document.getElementById('cd-clip-player-label');

    miniLabel.textContent = clip.label;
    miniPlayer.style.display = 'block';
    miniLoading.style.display = 'flex';
    miniVideo.style.display = 'none';
    miniVideo.pause();
    miniVideo.src = '';

    cdStatus(`Cutting ${escHtml(clip.label)}…`, 'info');

    try {
      const outPath = await api.takneekCutSingleClip({
        videoPath: localVideoPath,
        inTime: clip.inTime,
        outTime: clip.outTime,
        label: clip.label,
      });

      // Load trimmed clip into the mini player — main player is untouched
      miniLoading.style.display = 'none';
      miniVideo.style.display = 'block';
      miniVideo.src = 'file://' + outPath;
      miniVideo.load();
      miniVideo.play().catch(() => { });
      cdStatus(`Playing ${escHtml(clip.label)} in clip player`, 'ok');
    } catch (err) {
      miniPlayer.style.display = 'none';
      cdStatus(`Cut failed — ${err.message}`, 'err');
    } finally {
      btn.disabled = false;
    }
    return;
  }

  // Fallback: boundary-based preview in the original video
  videoEl.pause();
  videoEl.currentTime = clip.inTime;
  const onUpdate = () => {
    if (videoEl.currentTime >= clip.outTime) {
      videoEl.pause();
      videoEl.currentTime = clip.outTime;
      videoEl.removeEventListener('timeupdate', onUpdate);
      cdStatus(`Preview done — ${escHtml(clip.label)}`, 'ok');
    }
  };
  videoEl.addEventListener('timeupdate', onUpdate);
  const onPause = () => {
    videoEl.removeEventListener('timeupdate', onUpdate);
    videoEl.removeEventListener('pause', onPause);
  };
  videoEl.addEventListener('pause', onPause);
  videoEl.play().catch(() => { });
  cdStatus(`Previewing ${escHtml(clip.label)} — ${fmtTime(clip.inTime)} → ${fmtTime(clip.outTime)}`, 'info');
}

function cdCloseClipPlayer() {
  const miniPlayer = document.getElementById('cd-clip-player');
  const miniVideo = document.getElementById('cd-clip-video');
  if (miniVideo) { miniVideo.pause(); miniVideo.src = ''; }
  if (miniPlayer) miniPlayer.style.display = 'none';
}



// ═══════════════════════════════════════════════════════════
// Export Data — ffmpeg split to ~/Desktop/Annotated Data AutoClipping
// ═══════════════════════════════════════════════════════════
async function cdExportClips() {
  if (!CD.activeVideo) { cdStatus('Select a video first', 'err'); return; }
  if (CD.clips.length === 0) { cdStatus('Add at least one clip first', 'err'); return; }

  // We need the local file path for ffmpeg
  if (!localVideoPath) {
    cdStatus('Export only works with locally loaded videos. Use "Load Local" first.', 'err');
    return;
  }

  const api = _electron();
  if (!api?.takneekExportClips) {
    // Web fallback: download metadata as JSON
    const metadata = buildMetadata();
    CD._lastMetadata = metadata;
    CD.generated = true;
    updateUploadBtn();
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `takneek_${(CD.activeVideo?.player_name || 'session').replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(dlUrl);
    cdUploadMetadataToR2(metadata);
    cdStatus(`Exported metadata JSON — ${CD.clips.length} clip(s)`, 'ok');
    return;
  }

  const btn = document.getElementById('cd-export-btn');
  btn.disabled = true;
  cdStatus(`Exporting ${CD.clips.length} clip(s) via ffmpeg…`, 'info');

  try {
    const clipData = CD.clips.map(c => ({
      label: c.label,
      inTime: parseFloat(c.inTime.toFixed(3)),
      outTime: parseFloat(c.outTime.toFixed(3)),
      annotations: c.annotations || [],
    }));

    // Always build fresh metadata so export never depends on Generate Clips being clicked
    const metadata = buildMetadata();
    CD._lastMetadata = metadata;
    CD.generated = true;
    updateUploadBtn();

    const result = await api.takneekExportClips({
      videoPath: localVideoPath,
      clips: clipData,
      category: CD.category,
      metadata,
    });

    const ok = result.results.filter(r => r.success).length;
    const fail = result.results.filter(r => !r.success).length;
    const speedTag = metadata.ball_speed ? ` · ${metadata.ball_speed.avg_kmh} km/h` : '';

    if (fail === 0) {
      cdStatus(`✓ Exported ${ok} clip(s)${speedTag} — folder opened`, 'ok');
    } else {
      cdStatus(`Exported ${ok} clip(s), ${fail} failed — check console`, 'err');
    }

    // Upload metadata to R2
    cdUploadMetadataToR2(metadata);
    console.log('[Export] Results:', result);
  } catch (err) {
    cdStatus(`Export failed — ${err.message}`, 'err');
    console.error('[Export] Error:', err);
  } finally {
    btn.disabled = false;
  }
}

async function cdUploadClips() {
  if (!CD.activeVideo) { cdStatus('No video selected', 'err'); return; }
  if (CD.clips.length === 0) { cdStatus('Add at least one clip first', 'err'); return; }

  const btn = document.getElementById('cd-upload-btn');
  btn.disabled = true;
  cdStatus(`Submitting ${CD.clips.length} clip(s)…`, 'info');

  // Admin API path — send to new admin-payload endpoint
  if (CD.activeVideo.isAdminApi) {
    if (!CD.activeVideo.id) { cdStatus('No player_analysis_id on this video', 'err'); btn.disabled = false; return; }

    const meta = buildMetadata();
    const body = {
      player_analysis_id: CD.activeVideo.id,
      sessionId:   meta.sessionId,
      videoId:     meta.videoId,
      displayName: meta.displayName,
      playerName:  meta.playerName,
      angle:       meta.angle,
      category:    meta.category,
      ...(meta.annotation ? { annotation: meta.annotation } : {}),
      clips:       meta.clips,
    };

    try {
      console.log('[Upload] AUTH.token:', AUTH.token ? AUTH.token.slice(0, 30) + '…' : 'NULL');
      console.log('[Upload] headers:', adminHeaders());
      const res = await fetch(`${ADMIN_API}/video-processing/admin-payload`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const err = await res.json();
        cdStatus(`Already processed (ID: ${err.existingAdminProcessingId})`, 'err');
        btn.disabled = false;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      cdStatus(`✓ Payload submitted — ${result.message || 'processing queued'}`, 'ok');
    } catch (err) {
      cdStatus(`Upload failed — ${err.message}`, 'err');
      btn.disabled = false;
    }
    return;
  }

  // No player_id (local file or unlinked video) — download metadata JSON instead
  if (!CD.activeVideo.player_id) {
    const meta = buildMetadata();
    CD._lastMetadata = meta;
    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `takneek_${(CD.activeVideo.player_name || 'session').replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(dlUrl);
    cdUploadMetadataToR2(meta);
    cdStatus(`No API player linked — annotations downloaded as JSON (${CD.clips.length} clip(s))`, 'ok');
    btn.disabled = false;
    return;
  }

  // Legacy Takneek API path
  const videoSrc = CD.activeVideo.video_processed_url || CD.activeVideo.video_url;
  const analysisType = CD.category === 'batsman' ? 'batter' : 'bowler';

  try {
    const results = [];
    for (const clip of CD.clips) {
      const body = {
        player_id: CD.activeVideo.player_id,
        video_url: videoSrc,
        start_timestamp: new Date(clip.inTime * 1000).toISOString(),
        end_timestamp: new Date(clip.outTime * 1000).toISOString(),
        analysis_type: analysisType,
        video_analysis_type: CD.category === 'bowler' && clip.annotations.length > 0
          ? clip.annotations.map(a => a.stage).join(',')
          : clip.label,
        requires_processing: true,
      };
      const res = await fetch(`${TAKNEEK_API}/academy-players/analysis`, {
        method: 'POST',
        headers: tkHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} on clip "${clip.label}"`);
      results.push(await res.json());
    }
    cdStatus(`✓ ${results.length} clip(s) submitted — processing queued`, 'ok');
  } catch (err) {
    cdStatus(`Upload failed — ${err.message}`, 'err');
    btn.disabled = false;
  }
}

function buildMetadata() {
  const v = CD.activeVideo;
  const ae = CD.annotEngine;

  // Annotation export — only if data present
  let annotationData = null;
  if (ae.calibration.refA || Object.keys(ae.points.ball).length > 0) {
    annotationData = {
      calibration: {
        distance_m: ae.calibration.distance_m,
        scale_mpp: ae.calibration.scale,
      },
      speed_result: ae.speedResult,
    };
  }

  // Top-level ball_speed — easy to find without digging into annotation object
  const topLevelSpeed = ae.speedResult
    ? { avg_kmh: ae.speedResult.avgKmh, peak_kmh: ae.speedResult.maxKmh, points_used: ae.speedResult.n }
    : null;

  return {
    sessionId: CD.sessionId || uid('sess'),
    videoId: v?.id,
    displayName: v?.display_name || v?.original_filename,
    playerName: v?.player_name,
    angle: v?.angle,
    category: CD.category,
    generatedAt: new Date().toISOString(),
    totalClips: CD.clips.length,
    ...(topLevelSpeed ? { ball_speed: topLevelSpeed } : {}),
    ...(annotationData ? { annotation: annotationData } : {}),
    clips: CD.clips.map((clip, i) => {
      // Filter ball points that fall within this clip's time range
      const clipBallFrames = Object.keys(ae.points.ball)
        .map(Number)
        .filter(f => {
          const t = f / CD.fps;
          return t >= clip.inTime && t <= clip.outTime;
        })
        .sort((a, b) => a - b);

      const canvasW = _sCanvas.width || 1;
      const canvasH = _sCanvas.height || 1;
      const _cs = _speedFromBallFrames(clipBallFrames, ae.points.ball, ae.calibration.scale, canvasW, canvasH);

      const obj = {
        clipId: clip.id,
        index: i + 1,
        label: clip.label,
        start_time: parseFloat(clip.inTime.toFixed(3)),
        end_time: parseFloat(clip.outTime.toFixed(3)),
        duration: parseFloat((clip.outTime - clip.inTime).toFixed(3)),
        start_frame: Math.round(clip.inTime * CD.fps),
        end_frame: Math.round(clip.outTime * CD.fps),
        ...(_cs ? {
          ball_speed: String(_cs.avgKmh),
        } : {}),
      };
      if (clip.shotType) obj.shot_type = clip.shotType;
      if (clip.annotations && clip.annotations.length > 0) {
        obj.annotations = clip.annotations.map(ann => {
          const entry = {
            stage: ann.stage,
            label: ann.label,
          };
          if (ann.frameStart !== undefined) {
            entry.type = 'range';
            entry.frame_start = ann.frameStart;
            entry.frame_end = ann.frameEnd;
            entry.time_start = parseFloat((ann.frameStart / CD.fps).toFixed(3));
            entry.time_end = parseFloat((ann.frameEnd / CD.fps).toFixed(3));
          } else {
            entry.type = 'point';
            entry.frame = ann.frame;
            entry.time = parseFloat((ann.frame / CD.fps).toFixed(3));
          }
          return entry;
        });
      }
      return obj;
    }),
  };
}

function updateUploadBtn() {
  document.getElementById('cd-upload-btn').disabled = CD.clips.length === 0;
}

// ═══════════════════════════════════════════════════════════
// Player Zoom
// Scroll to zoom · Alt+drag to pan · double-click to reset
// ═══════════════════════════════════════════════════════════

function cdZoomOnWheel(e) {
  if (!CD.activeVideo) return;
  e.preventDefault();

  const box = document.querySelector('.cd-player-box').getBoundingClientRect();
  const cx = e.clientX - box.left;   // cursor relative to player box
  const cy = e.clientY - box.top;
  const dir = e.deltaY < 0 ? 1 : -1;
  const next = ZOOM.level * (1 + dir * ZOOM_SPEED);

  cdZoomTo(next, cx, cy);
}

function cdZoomTo(newLevel, cx, cy) {
  newLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newLevel));
  if (newLevel === ZOOM.level) return;

  const scale = newLevel / ZOOM.level;
  ZOOM.panX = cx - scale * (cx - ZOOM.panX);
  ZOOM.panY = cy - scale * (cy - ZOOM.panY);
  ZOOM.level = newLevel;
  _zoomConstrain();
  _zoomApply();
}

function cdZoomReset() {
  ZOOM.level = 1; ZOOM.panX = 0; ZOOM.panY = 0;
  _zoomApply();
}

let _zPanning = false, _zPanOrigin = null;

// Start a pan drag (called from annotation mousedown when Alt is held)
function _zoomStartPan(e) {
  _zPanning = true;
  _zPanOrigin = { x: e.clientX - ZOOM.panX, y: e.clientY - ZOOM.panY };
  document.body.style.cursor = 'grabbing';

  const onMove = (ev) => {
    if (!_zPanning) return;
    ZOOM.panX = ev.clientX - _zPanOrigin.x;
    ZOOM.panY = ev.clientY - _zPanOrigin.y;
    _zoomConstrain();
    _zoomApply();
  };
  const onUp = () => {
    _zPanning = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function _zoomConstrain() {
  const wrap = document.getElementById('cd-zoom-wrap');
  if (!wrap) return;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  ZOOM.panX = Math.min(0, Math.max(w * (1 - ZOOM.level), ZOOM.panX));
  ZOOM.panY = Math.min(0, Math.max(h * (1 - ZOOM.level), ZOOM.panY));
}

function _zoomApply() {
  const wrap = document.getElementById('cd-zoom-wrap');
  if (!wrap) return;
  wrap.style.transform = ZOOM.level === 1
    ? 'none'
    : `translate(${ZOOM.panX}px,${ZOOM.panY}px) scale(${ZOOM.level})`;
  wrap.style.transformOrigin = '0 0';

  const badge = document.getElementById('cd-zoom-badge');
  const lvl = document.getElementById('cd-zoom-level');
  if (badge) badge.style.display = ZOOM.level > 1.01 ? 'flex' : 'none';
  if (lvl) lvl.textContent = `${ZOOM.level.toFixed(1)}×`;
}

// ═══════════════════════════════════════════════════════════
// Annotation Engine
// Frame-indexed manual annotation with calibration + speed
// ═══════════════════════════════════════════════════════════

const _AE_COLORS = { ball: '#fbbf24', refA: '#06b6d4', refB: '#06b6d4' };
const _AE_LABELS = { ball: '●', refA: 'A', refB: 'B' };
const BALL_DIAMETER_M = 0.0735; // 73.5 mm — midpoint of ICC range (72.4–74.8 mm)

let _cropperInstance = null;

function _currentFrame() {
  return Math.floor((videoEl?.currentTime || 0) * CD.fps);
}

let _lastAnnotFrame = -1;
function _annotOnTimeUpdate() {
  if (!CD.annotEngine.active) return;
  const f = _currentFrame();
  if (f !== _lastAnnotFrame) {
    _lastAnnotFrame = f;
    cdAnnotRender();
    cdAnnotDrawCanvas();
  }
}

// ── Toggle ─────────────────────────────────────────────────
function cdAnnotToggle() {
  const ae = CD.annotEngine;
  ae.active = !ae.active;

  document.getElementById('cd-annot-panel').style.display = ae.active ? 'flex' : 'none';
  document.getElementById('cd-annot-btn')?.classList.toggle('active', ae.active);

  if (ae.active) {
    cdAnnotResizeCanvas();
    _sCanvas.classList.add('active');
    _sCanvas.style.cursor = 'default';
    cdAnnotRender();
    cdStatus('Annotation engine active — select a mode', 'info');
  } else {
    _sCanvas.classList.remove('active');
    _sCtx?.clearRect(0, 0, _sCanvas.width, _sCanvas.height);
    ae.mode = 'none';
    cdAnnotUpdateModeBtns();
  }
}

// ── Mode ───────────────────────────────────────────────────
function cdAnnotSetMode(mode) {
  CD.annotEngine.mode = mode;
  cdAnnotUpdateModeBtns();
  _sCanvas.style.cursor = mode !== 'none' ? 'crosshair' : 'default';
  const hints = {
    refA: 'Click to place Ref A (calibration start)',
    refB: 'Click to place Ref B (calibration end)',
    ball: 'Pause at each frame, then click the ball (5–10 points)',
    hip: 'Click the hip (greater trochanter) on this frame',
    knee: 'Click the knee (lateral condyle) on this frame',
    none: 'Mode off — click a mode button or use B / H / K keys',
  };
  cdStatus(hints[mode] || '', 'info');
}

function cdAnnotUpdateModeBtns() {
  const mode = CD.annotEngine.mode;
  ['refA', 'refB', 'ball', 'none'].forEach(m => {
    document.getElementById(`cd-mode-${m}`)?.classList.toggle('active', m === mode);
  });
}

// ── Mouse events ───────────────────────────────────────────
let _aeClickStart = null;

function cdAnnotOnMouseDown(e) {
  // Alt+drag always pans when zoomed, regardless of annotation state
  if (e.altKey && ZOOM.level > 1) { e.preventDefault(); _zoomStartPan(e); return; }

  if (!CD.annotEngine.active) return;
  const { nx, ny } = _aeNxy(e);
  const hit = _annotHitTest(nx, ny);
  if (hit) {
    const ae = CD.annotEngine;
    const orig = (hit.type === 'refA' || hit.type === 'refB')
      ? ae.calibration[hit.type]
      : ae.points[hit.type][hit.frame];
    ae.drag = { ...hit, ox: orig.x, oy: orig.y };
    _sCanvas.style.cursor = 'grabbing';
  } else {
    _aeClickStart = { nx, ny };
  }
}

function cdAnnotOnMouseMove(e) {
  if (!CD.annotEngine.active) return;
  const { nx, ny } = _aeNxy(e);
  const ae = CD.annotEngine;

  if (ae.drag) {
    _annotSetPoint(ae.drag.type, ae.drag.frame, nx, ny);
    _annotRecompute();
    cdAnnotRender();
    cdAnnotDrawCanvas();
    return;
  }

  const hit = _annotHitTest(nx, ny);
  if (ae.mode === 'none') _sCanvas.style.cursor = hit ? 'grab' : 'default';
  else _sCanvas.style.cursor = hit ? 'grab' : 'crosshair';
}

function cdAnnotOnMouseUp(e) {
  if (!CD.annotEngine.active) return;
  const ae = CD.annotEngine;
  const { nx, ny } = _aeNxy(e);

  if (ae.drag) {
    ae.drag = null;
    _sCanvas.style.cursor = ae.mode !== 'none' ? 'crosshair' : 'default';
    cdAnnotRender();
    cdGenerateClips(true);
    return;
  }

  if (_aeClickStart) {
    const moved = Math.hypot((nx - _aeClickStart.nx) * _sCanvas.width,
      (ny - _aeClickStart.ny) * _sCanvas.height);
    if (moved < 6) _annotHandleClick(nx, ny);
    _aeClickStart = null;
  }
}

function _aeNxy(e) {
  const r = _sCanvas.getBoundingClientRect();
  return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
}

function _annotHandleClick(nx, ny) {
  const ae = CD.annotEngine;

  switch (ae.mode) {
    case 'refA':
      ae.calibration.refA = { x: nx, y: ny };
      ae.calibration.scale = _annotComputeScale();
      cdStatus('Ref A placed' + (ae.calibration.scale ? ` — scale ${(ae.calibration.scale * 1000).toFixed(2)} mm/px` : ' — place Ref B to compute scale'), 'ok');
      break;
    case 'refB':
      ae.calibration.refB = { x: nx, y: ny };
      ae.calibration.scale = _annotComputeScale();
      cdStatus('Ref B placed' + (ae.calibration.scale ? ` — scale ${(ae.calibration.scale * 1000).toFixed(2)} mm/px` : ' — place Ref A to compute scale'), 'ok');
      break;
    case 'ball': {
      const locked = ae.calibration.lockedBallScale;
      if (locked) {
        const frame = _currentFrame();
        ae.points.ball[frame] = { x: nx, y: ny, diamNorm: ae.calibration.lockedDiamNorm, ballScale: locked, ballMm: ae.calibration.lockedBallMm };
        _annotRecompute();
        cdAnnotRender();
        cdAnnotDrawCanvas();
        cdStatus(`Ball f${frame} — scale locked ${(locked * 1000).toFixed(3)} mm/px`, 'ok');
      } else {
        cdAnnotOpenBallCrop();
      }
      return;
    }
    default: return;
  }
  _annotRecompute();
  cdAnnotRender();
  cdAnnotDrawCanvas();
  cdGenerateClips(true);
}

function _annotSetPoint(type, frame, nx, ny) {
  const ae = CD.annotEngine;
  if (type === 'refA' || type === 'refB') {
    ae.calibration[type] = { x: nx, y: ny };
    ae.calibration.scale = _annotComputeScale();
  } else if (frame !== null && frame !== undefined) {
    // Preserve existing metadata (diamNorm, ballScale, etc.) when dragging
    const existing = ae.points[type][frame] || {};
    ae.points[type][frame] = { ...existing, x: nx, y: ny };
  }
}

// ── Ball crop (CropperJS) ──────────────────────────────────

// Returns the actual rendered video region inside the canvas element,
// accounting for object-fit:contain letterboxing.
function _videoRenderBounds() {
  const vw = videoEl.videoWidth || _sCanvas.width;
  const vh = videoEl.videoHeight || _sCanvas.height;
  const cw = _sCanvas.width, ch = _sCanvas.height;
  const s = Math.min(cw / vw, ch / vh);
  const rw = vw * s, rh = vh * s;
  return { rx: (cw - rw) / 2, ry: (ch - rh) / 2, rw, rh, vw, vh };
}

function cdAnnotOpenBallCrop() {
  if (!videoEl.videoWidth) { cdStatus('No video loaded', 'err'); return; }

  videoEl.pause();
  const frame = _currentFrame();

  // Capture current video frame to a temporary canvas
  const cap = document.createElement('canvas');
  cap.width = videoEl.videoWidth;
  cap.height = videoEl.videoHeight;
  cap.getContext('2d').drawImage(videoEl, 0, 0);

  const modal = document.getElementById('cd-ball-crop-modal');
  modal.style.display = 'flex';
  modal.dataset.frame = frame;
  document.getElementById('cd-crop-frame-num').textContent = frame;

  const img = document.getElementById('cd-ball-crop-img');
  img.onload = () => {
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    _cropperInstance = new Cropper(img, {
      aspectRatio: 1,          // force square — ball is round
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.06,       // start with small crop box
      movable: true,
      rotatable: false,
      scalable: false,
      zoomable: true,
      zoomOnWheel: true,
      guides: false,
      center: false,
      highlight: false,
      background: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      ready() { _updateCropInfo(); },
      crop() { _updateCropInfo(); },
    });
  };
  img.src = cap.toDataURL('image/jpeg', 0.92);
  cdStatus(`f${frame} — draw a box tightly around the ball, then click Mark Ball`, 'info');
}

function _updateCropInfo() {
  if (!_cropperInstance) return;
  const data = _cropperInstance.getData(true);
  const diamPx = Math.round((data.width + data.height) / 2);
  const ballMm = parseFloat(document.getElementById('cd-crop-ball-diam').value) || 72;
  document.getElementById('cd-crop-diam-px').textContent = diamPx;
  const { rw, vw } = _videoRenderBounds();
  const canvasPx = diamPx * (rw / vw);
  const refScale = CD.annotEngine.calibration.scale;
  const previewEl = document.getElementById('cd-crop-scale-preview');
  if (refScale) {
    previewEl.textContent = `${(refScale * 1000).toFixed(3)} mm/px (from Ref A/B)`;
  } else {
    previewEl.textContent = canvasPx > 0 ? `${((ballMm / 1000) / canvasPx * 1000).toFixed(3)} mm/px` : '—';
  }
}

function cdAnnotConfirmBallCrop() {
  if (!_cropperInstance) return;

  const frame = parseInt(document.getElementById('cd-ball-crop-modal').dataset.frame);
  const data = _cropperInstance.getData(true);   // natural video pixel coords
  const ballMm = parseFloat(document.getElementById('cd-crop-ball-diam').value) || 72;
  const ballDm = ballMm / 1000;                    // metres

  const { rx, ry, rw, rh, vw, vh } = _videoRenderBounds();

  // Centre in canvas-normalised coords (0..1)
  const cx = ((data.x + data.width / 2) / vw * rw + rx) / _sCanvas.width;
  const cy = ((data.y + data.height / 2) / vh * rh + ry) / _sCanvas.height;

  // Ball diameter in canvas pixels (average of W and H for robustness)
  const diamW = (data.width / vw) * rw;
  const diamH = (data.height / vh) * rh;
  const diamPx = (diamW + diamH) / 2;

  // If Ref A/B calibration exists, use it as the authoritative scale;
  // otherwise derive from the drawn box + known ball diameter.
  const refScale = CD.annotEngine.calibration.scale;
  const ballScale = refScale ?? (ballDm / diamPx);

  // Diameter as fraction of canvas width (for rendering the circle).
  // When using ref scale, back-calculate diamNorm from the known real size.
  const diamNorm = refScale
    ? ((ballDm / refScale) / _sCanvas.width)
    : (diamPx / _sCanvas.width);

  CD.annotEngine.points.ball[frame] = { x: cx, y: cy, diamNorm, ballScale, ballMm };

  // Lock scale from first crop — reused for all subsequent ball clicks
  if (!CD.annotEngine.calibration.lockedBallScale) {
    CD.annotEngine.calibration.lockedBallScale = ballScale;
    CD.annotEngine.calibration.lockedDiamNorm = diamNorm;
    CD.annotEngine.calibration.lockedBallMm = ballMm;
  }

  _annotRecompute();
  cdAnnotRender();
  cdAnnotDrawCanvas();
  cdAnnotCloseBallCrop();
  const scaleSource = refScale ? 'Ref A/B' : 'crop box';
  cdStatus(`Ball f${frame} — ⌀${Math.round(diamPx)}px → ${(ballScale * 1000).toFixed(3)} mm/px (${scaleSource}) · locked`, 'ok');
  cdGenerateClips(true);
}

function cdAnnotCloseBallCrop() {
  if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
  document.getElementById('cd-ball-crop-modal').style.display = 'none';
  document.getElementById('cd-ball-crop-img').src = '';
}

function cdAnnotResetBallScale() {
  const ae = CD.annotEngine;
  delete ae.calibration.lockedBallScale;
  delete ae.calibration.lockedDiamNorm;
  delete ae.calibration.lockedBallMm;
  cdAnnotRender();
  cdGenerateClips(true);
  cdStatus('Ball scale lock cleared — draw a new crop to re-calibrate', 'info');
}

function cdAnnotToggleGrid() {
  _gridEnabled = !_gridEnabled;
  const btn = document.getElementById('cd-mode-grid');
  if (btn) btn.classList.toggle('active', _gridEnabled);
  cdAnnotDrawCanvas();
}

// ── Hit test ───────────────────────────────────────────────
function _annotHitTest(nx, ny) {
  const ae = CD.annotEngine;
  const W = _sCanvas.width, H = _sCanvas.height;
  const R = 14;
  const d = (p) => p ? Math.hypot((p.x - nx) * W, (p.y - ny) * H) : Infinity;

  if (d(ae.calibration.refA) < R) return { type: 'refA', frame: null };
  if (d(ae.calibration.refB) < R) return { type: 'refB', frame: null };

  const frame = _currentFrame();
  if (d(ae.points.ball[frame]) < R) return { type: 'ball', frame };
  return null;
}

// ── Calibration ────────────────────────────────────────────
function _annotComputeScale() {
  const { refA, refB, distance_m } = CD.annotEngine.calibration;
  if (!refA || !refB) return null;
  const W = _sCanvas.width || _sCanvas.offsetWidth;
  const H = _sCanvas.height || _sCanvas.offsetHeight;
  const px = Math.hypot((refB.x - refA.x) * W, (refB.y - refA.y) * H);
  return px > 3 ? distance_m / px : null;
}

function _annotRecompute() {
  CD.annotEngine.calibration.scale = _annotComputeScale();
  CD.annotEngine.speedResult = _annotComputeSpeed();
}

// ── Speed computation ──────────────────────────────────────
function _annotComputeSpeed() {
  const ae = CD.annotEngine;
  const frames = Object.keys(ae.points.ball).map(Number).sort((a, b) => a - b);
  const W = _sCanvas.width || _sCanvas.offsetWidth;
  const H = _sCanvas.height || _sCanvas.offsetHeight;
  return _speedFromBallFrames(frames, ae.points.ball, ae.calibration.scale, W, H);
}

// ── Point propagation ──────────────────────────────────────
function _annotGetPropagated(type, targetFrame) {
  const pts = CD.annotEngine.points[type];
  if (!pts) return null;
  if (pts[targetFrame]) return { point: pts[targetFrame], exact: true, interpolated: false };

  const frames = Object.keys(pts).map(Number).sort((a, b) => a - b);
  const before = frames.filter(f => f < targetFrame);
  const after = frames.filter(f => f > targetFrame);
  if (!before.length) return null;

  const prev = before[before.length - 1];
  if (!after.length) return { point: pts[prev], exact: false, interpolated: false };

  const next = after[0];
  const t = (targetFrame - prev) / (next - prev);
  const p1 = pts[prev], p2 = pts[next];
  return { point: { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t }, exact: false, interpolated: true };
}

// ── Clear ──────────────────────────────────────────────────
function cdAnnotClearFrame() {
  const frame = _currentFrame();
  const ae = CD.annotEngine;
  delete ae.points.ball[frame];
  _annotRecompute();
  cdAnnotRender();
  cdAnnotDrawCanvas();
  cdGenerateClips(true);
  cdStatus(`Frame ${frame} cleared`, 'info');
}

function cdAnnotClearAll() {
  const ae = CD.annotEngine;
  ae.points = { ball: {} };
  ae.calibration.refA = null;
  ae.calibration.refB = null;
  ae.calibration.scale = null;
  ae.speedResult = null;
  _lastAnnotFrame = -1;
  _annotRecompute();
  cdAnnotRender();
  cdAnnotDrawCanvas();
  cdGenerateClips(true);
  cdStatus('All annotations cleared', 'info');
}

// ── Render UI panel ────────────────────────────────────────
function cdAnnotRender() {
  const ae = CD.annotEngine;
  const frame = _currentFrame();

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setClass = (id, cls, on) => { document.getElementById(id)?.classList.toggle(cls, on); };

  setText('cd-annot-frame', frame);

  setClass('cd-calib-refA-status', 'set', !!ae.calibration.refA);
  setClass('cd-calib-refB-status', 'set', !!ae.calibration.refB);

  const scaleEl = document.getElementById('cd-annot-scale');
  const resetBtn = document.getElementById('cd-annot-scale-reset');
  if (scaleEl) {
    const ballPts = Object.values(ae.points.ball).filter(p => p.ballScale);
    const hasGlobal = !!ae.calibration.scale;
    const locked = ae.calibration.lockedBallScale;

    if (locked) {
      scaleEl.textContent = `Locked · ${(locked * 1000).toFixed(3)} mm/px`;
      scaleEl.classList.add('ready');
      if (resetBtn) resetBtn.style.display = 'inline';
    } else if (ballPts.length > 0) {
      const avgBallScale = ballPts.reduce((s, p) => s + p.ballScale, 0) / ballPts.length;
      scaleEl.textContent = `Ball ⌀ ref · ${(avgBallScale * 1000).toFixed(3)} mm/px avg (${ballPts.length} pts)`;
      scaleEl.classList.add('ready');
      if (resetBtn) resetBtn.style.display = 'none';
    } else if (hasGlobal) {
      scaleEl.textContent = `Ref A/B · ${(ae.calibration.scale * 1000).toFixed(3)} mm/px`;
      scaleEl.classList.add('ready');
      if (resetBtn) resetBtn.style.display = 'none';
    } else {
      scaleEl.textContent = ae.calibration.refA
        ? 'Place Ref B — or use Ball mode to auto-calibrate'
        : 'Place Ref A + Ref B, or mark balls to auto-calibrate';
      scaleEl.classList.remove('ready');
      if (resetBtn) resetBtn.style.display = 'none';
    }
  }

  const speedEl = document.getElementById('cd-annot-speed');
  if (speedEl) {
    if (ae.speedResult) {
      speedEl.style.display = 'flex';
      setText('cd-annot-kmh', ae.speedResult.avgKmh);
      setText('cd-annot-peak', `Peak ${ae.speedResult.maxKmh} km/h · ${ae.speedResult.n} pts`);
    } else {
      speedEl.style.display = 'none';
    }
  }

  const ptsEl = document.getElementById('cd-annot-pts');
  if (ptsEl) {
    const ballFrames = Object.keys(ae.points.ball).map(Number).sort((a, b) => a - b);
    if (ballFrames.length) {
      ptsEl.innerHTML = ballFrames.map((f, i) =>
        `<div class="cd-annot-pt${f === frame ? ' current' : ''}" onclick="videoEl.currentTime=${f / CD.fps}">
           <span class="cd-annot-pt-n">${i + 1}</span>
           <span class="cd-annot-pt-f">f${f}</span>
         </div>`
      ).join('');
    } else {
      ptsEl.innerHTML = '<span class="cd-annot-pts-empty">No ball points yet</span>';
    }
  }

  // Per-frame annotation status chips
  const frameStatusEl = document.getElementById('cd-annot-frame-status');
  if (frameStatusEl) {
    const chips = [];
    if (ae.points.ball[frame]) chips.push('<span class="cd-annot-fchip ball">●</span>');
    frameStatusEl.innerHTML = chips.join('');
  }
}

// ── Canvas draw ────────────────────────────────────────────
function cdAnnotResizeCanvas() {
  if (!_sCanvas) return;
  // Use layout dimensions of the zoom-wrap (unaffected by CSS scale transform)
  const wrap = document.getElementById('cd-zoom-wrap');
  const w = wrap ? wrap.clientWidth : videoEl?.clientWidth;
  const h = wrap ? wrap.clientHeight : videoEl?.clientHeight;
  if (!w || !h || w < 1 || h < 1) return;
  _sCanvas.width = w;
  _sCanvas.height = h;
  _annotRecompute();
  cdAnnotDrawCanvas();
}

function cdAnnotDrawCanvas() {
  if (!_sCtx) return;
  const ae = CD.annotEngine;
  const W = _sCanvas.width, H = _sCanvas.height;
  _sCtx.clearRect(0, 0, W, H);
  if (!ae.active) return;

  // 10x10 grid overlay (within letterboxed video area)
  if (_gridEnabled) {
    const { rx, ry, rw, rh } = _videoRenderBounds();
    _sCtx.save();
    _sCtx.strokeStyle = 'rgba(255,255,255,0.18)';
    _sCtx.lineWidth = 0.7;
    const cols = 20, rows = 20;
    for (let i = 1; i < cols; i++) {
      const x = rx + (rw / cols) * i;
      _sCtx.beginPath(); _sCtx.moveTo(x, ry); _sCtx.lineTo(x, ry + rh); _sCtx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      const y = ry + (rh / rows) * j;
      _sCtx.beginPath(); _sCtx.moveTo(rx, y); _sCtx.lineTo(rx + rw, y); _sCtx.stroke();
    }
    // Border
    _sCtx.strokeStyle = 'rgba(255,255,255,0.28)';
    _sCtx.lineWidth = 1;
    _sCtx.strokeRect(rx, ry, rw, rh);
    _sCtx.restore();
  }

  const px = (nx, ny) => ({ x: nx * W, y: ny * H });
  const frame = _currentFrame();

  // Ref calibration line
  if (ae.calibration.refA && ae.calibration.refB) {
    const a = px(ae.calibration.refA.x, ae.calibration.refA.y);
    const b = px(ae.calibration.refB.x, ae.calibration.refB.y);
    _sCtx.beginPath(); _sCtx.moveTo(a.x, a.y); _sCtx.lineTo(b.x, b.y);
    _sCtx.strokeStyle = 'rgba(6,182,212,0.55)'; _sCtx.lineWidth = 1.5;
    _sCtx.setLineDash([5, 4]); _sCtx.stroke(); _sCtx.setLineDash([]);
  }
  if (ae.calibration.refA) _annotDot(_sCtx, px(ae.calibration.refA.x, ae.calibration.refA.y), _AE_COLORS.refA, 'A');
  if (ae.calibration.refB) _annotDot(_sCtx, px(ae.calibration.refB.x, ae.calibration.refB.y), _AE_COLORS.refB, 'B');

  // Ball trajectory polyline
  const bFrames = Object.keys(ae.points.ball).map(Number).sort((a, b) => a - b);
  if (bFrames.length >= 2) {
    const fp = px(ae.points.ball[bFrames[0]].x, ae.points.ball[bFrames[0]].y);
    _sCtx.beginPath(); _sCtx.moveTo(fp.x, fp.y);
    for (let i = 1; i < bFrames.length; i++) {
      const p = px(ae.points.ball[bFrames[i]].x, ae.points.ball[bFrames[i]].y);
      _sCtx.lineTo(p.x, p.y);
    }
    _sCtx.strokeStyle = 'rgba(251,191,36,0.6)'; _sCtx.lineWidth = 1.5; _sCtx.stroke();
  }
  // Ball dots — to-scale circle if cropped, plain dot otherwise
  bFrames.forEach((f, i) => {
    const p = ae.points.ball[f];
    const pos = px(p.x, p.y);
    const curr = f === frame;
    _sCtx.globalAlpha = curr ? 1 : 0.55;

    if (p.diamNorm) {
      const r = Math.max(4, p.diamNorm * W / 2);
      _sCtx.beginPath();
      _sCtx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      _sCtx.fillStyle = _AE_COLORS.ball + '22'; _sCtx.fill();
      _sCtx.strokeStyle = _AE_COLORS.ball;
      _sCtx.lineWidth = curr ? 2 : 1.5; _sCtx.stroke();
      _sCtx.globalAlpha = 1;
      _sCtx.font = 'bold 9px sans-serif';
      _sCtx.fillStyle = _AE_COLORS.ball;
      _sCtx.textAlign = 'center';
      _sCtx.textBaseline = 'bottom';
      _sCtx.fillText(i + 1, pos.x, pos.y - r - 2);
    } else {
      _sCtx.globalAlpha = 1;
      _annotDot(_sCtx, pos, _AE_COLORS.ball, `${i + 1}`, !curr, curr ? 7 : 5);
    }
    _sCtx.globalAlpha = 1;
  });

  // Active-mode hint (bottom-left corner)
  const tip = { refA: '◎ Ref A', refB: '◎ Ref B', ball: '● Ball' }[ae.mode];
  if (tip) {
    _sCtx.font = 'bold 11px sans-serif';
    _sCtx.fillStyle = 'rgba(255,255,255,0.85)';
    _sCtx.textAlign = 'left'; _sCtx.textBaseline = 'bottom';
    _sCtx.fillText(tip, 10, H - 8);
  }
}

function _annotDot(ctx, pos, color, label, faded = false, r = 6) {
  ctx.globalAlpha = faded ? 0.38 : 1;
  ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = color + '28'; ctx.fill();
  ctx.beginPath(); ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = faded ? 1 : 2; ctx.stroke();
  ctx.font = `bold ${r <= 5 ? 8 : 9}px sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, pos.x, pos.y);
  ctx.globalAlpha = 1;
}

// ── Shared math helpers ────────────────────────────────────


function _movingAvg(arr, w) {
  return arr.map((_, i) => {
    const lo = Math.max(0, i - Math.floor(w / 2));
    const hi = Math.min(arr.length, lo + w);
    const slice = arr.slice(lo, hi);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

function _trimmedMean(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * p);
  const trimmed = sorted.slice(cut, sorted.length - (cut || 0));
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
}

function _median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Stabilise per-frame ball scales using a rolling median + ±5% clamp.
// Raw crops are noisy (blur, partial occlusion, perspective ellipse) so
// a single frame's measurement can spike ±10–15%. Rolling median dampens
// that without over-smoothing the genuine depth trend across the delivery.
function _stabiliseScales(frames, points, windowN = 5, clampPct = 0.05) {
  const withScale = frames.filter(f => points[f]?.ballScale);
  if (withScale.length < 2) return null;

  // Pre-filter gross outliers (>±20% of global median) before rolling
  const allVals = withScale.map(f => points[f].ballScale);
  const globalMed = _median(allVals);
  const preFiltered = withScale.filter(f => Math.abs(points[f].ballScale - globalMed) / globalMed <= 0.20);
  if (preFiltered.length < 2) return null;

  const result = {};
  frames.forEach((f, i) => {
    if (!points[f]?.ballScale) return;
    const lo = Math.max(0, i - Math.floor(windowN / 2));
    const hi = Math.min(frames.length, lo + windowN);
    const win = frames.slice(lo, hi).map(ff => points[ff]?.ballScale).filter(Boolean);
    const med = _median(win);
    const raw = points[f].ballScale;
    result[f] = Math.max(med * (1 - clampPct), Math.min(med * (1 + clampPct), raw));
  });
  return result;
}

// Core speed computation reused by both the live panel and buildMetadata.
function _speedFromBallFrames(frames, points, globalScale, W, H) {
  if (frames.length < 3 || !W || !H) return null;

  const hasBallScale = frames.some(f => points[f]?.ballScale);
  const hasGlobalScale = !!globalScale;
  if (!hasBallScale && !hasGlobalScale) return null;

  const stabScales = hasBallScale ? _stabiliseScales(frames, points) : null;

  const rawSpeeds = [];
  for (let i = 1; i < frames.length; i++) {
    const p1 = points[frames[i - 1]], p2 = points[frames[i]];
    const s1 = stabScales?.[frames[i - 1]], s2 = stabScales?.[frames[i]];
    const segScale = (s1 || s2) ? ((s1 ?? s2) + (s2 ?? s1)) / 2 : globalScale;
    if (!segScale) continue;
    const d_m = Math.hypot((p2.x - p1.x) * W, (p2.y - p1.y) * H) * segScale;
    const dt = (frames[i] - frames[i - 1]) / CD.fps;
    if (dt > 0 && dt <= 1.5) rawSpeeds.push(d_m / dt * 3.6);
  }

  const valid = rawSpeeds.filter(v => v >= 5 && v <= 300);
  if (!valid.length) return null;

  const smoothed = _movingAvg(valid, 3);
  const scaleVals = stabScales ? Object.values(stabScales) : [];
  const scaleAvg = scaleVals.length
    ? scaleVals.reduce((s, v) => s + v, 0) / scaleVals.length
    : globalScale;

  return {
    avgKmh: Math.round(_trimmedMean(smoothed, 0.2)),
    maxKmh: Math.round(Math.max(...smoothed)),
    smoothed,
    n: frames.length,
    source: hasBallScale ? 'ball-size' : 'ref-points',
    scale_avg_mpp: scaleAvg ? parseFloat(scaleAvg.toFixed(6)) : null,
  };
}


// ═══════════════════════════════════════════════════════════
// Keyboard shortcuts
// ═══════════════════════════════════════════════════════════
function onKeyDown(e) {
  const t = e.target;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.code) {
    case 'Space': e.preventDefault(); cdTogglePlay(); break;
    case 'KeyI': e.preventDefault(); cdSetIn(); break;
    case 'KeyO': e.preventDefault(); cdSetOut(); break;
    case 'KeyM': e.preventDefault(); cdToggleMute(); break;
    case 'KeyA': e.preventDefault(); cdAddClip(); break;

    case 'ArrowLeft': e.preventDefault(); cdStepFrame(-1); break;
    case 'ArrowRight': e.preventDefault(); cdStepFrame(1); break;
    case 'ArrowUp': e.preventDefault(); cdStepFrame(-10); break;
    case 'ArrowDown': e.preventDefault(); cdStepFrame(10); break;
    case 'KeyR': e.preventDefault(); cdFetchVideos(); break;
    // Zoom shortcuts
    case 'Equal': case 'NumpadAdd': {
      if (!CD.activeVideo) break;
      e.preventDefault();
      const box = document.querySelector('.cd-player-box').getBoundingClientRect();
      cdZoomTo(ZOOM.level * (1 + ZOOM_SPEED), box.width / 2, box.height / 2);
      break;
    }
    case 'Minus': case 'NumpadSubtract': {
      if (!CD.activeVideo) break;
      e.preventDefault();
      const box2 = document.querySelector('.cd-player-box').getBoundingClientRect();
      cdZoomTo(ZOOM.level / (1 + ZOOM_SPEED), box2.width / 2, box2.height / 2);
      break;
    }
    // Annotation engine mode shortcuts (only when active)
    case 'KeyB': if (CD.annotEngine.active) { e.preventDefault(); cdAnnotSetMode('ball'); } break;
    case 'Escape': if (CD.annotEngine.active) { e.preventDefault(); cdAnnotSetMode('none'); } break;
    case 'Delete': case 'Backspace':
      if (CD.annotEngine.active && CD.annotEngine.mode !== 'none') { e.preventDefault(); cdAnnotClearFrame(); } break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
    case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9': case 'Digit0': {
      e.preventDefault();
      if (!CD.duration) break;
      const digit = parseInt(e.key, 10);
      videoEl.currentTime = (digit === 0 ? 0 : digit / 10) * CD.duration;
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Dashboard view
// ═══════════════════════════════════════════════════════════

let _currentView = 'dashboard';

function cdShowView(view) {
  _currentView = view;
  const dashEl = document.getElementById('cd-dashboard');
  const clippingEl = document.getElementById('cd-clipping-view');
  const tabDash = document.getElementById('cd-tab-dashboard');
  const tabClip = document.getElementById('cd-tab-clipping');
  const localBtn = document.getElementById('cd-subnav-local-btn');

  if (view === 'dashboard') {
    dashEl.style.display = 'flex';
    clippingEl.style.display = 'none';
    tabDash.classList.add('active');
    tabClip.classList.remove('active');
    if (localBtn) localBtn.style.display = 'none';
    cdRenderDashboard();
  } else {
    dashEl.style.display = 'none';
    clippingEl.style.display = 'flex';
    tabDash.classList.remove('active');
    tabClip.classList.add('active');
    if (localBtn) localBtn.style.display = 'inline-flex';
  }
}

function cdRenderDashboard() {
  const videos = CD.allVideos;

  // Compute stats
  const batters = videos.filter(v => v.angle === 'batter').length;
  const bowlers = videos.filter(v => v.angle === 'bowler').length;
  const allrounders = videos.filter(v => v.angle === 'all-rounder').length;
  const processed = videos.filter(v => v.video_processing_status === 'completed').length;
  const uniquePlayers = new Set(videos.map(v => v.player_id).filter(Boolean)).size;

  // Update stat cards
  _setText('cd-stat-total', videos.length);
  _setText('cd-stat-batters', batters);
  _setText('cd-stat-bowlers', bowlers);
  _setText('cd-stat-players', uniquePlayers);
  _setText('cd-stat-processed', processed);

  // Render type breakdown
  _renderBreakdown(videos, batters, bowlers, allrounders);

  // Render players table
  _renderPlayersTable(videos);
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _renderBreakdown(videos, batters, bowlers, allrounders) {
  const el = document.getElementById('cd-breakdown');
  if (!el) return;

  const total = videos.length || 1;
  const other = videos.length - batters - bowlers - allrounders;

  const rows = [
    { label: 'Batter', count: batters, cls: 'batter', pct: batters / total * 100 },
    { label: 'Bowler', count: bowlers, cls: 'bowler', pct: bowlers / total * 100 },
    { label: 'All-Rounder', count: allrounders, cls: 'allrounder', pct: allrounders / total * 100 },
    { label: 'Other', count: other, cls: 'other', pct: other / total * 100 },
  ].filter(r => r.count > 0);

  if (rows.length === 0) {
    el.innerHTML = '<div class="cd-players-empty" style="padding:20px">No data yet.</div>';
    return;
  }

  el.innerHTML = rows.map(r => `
    <div class="cd-breakdown-row">
      <div class="cd-breakdown-meta">
        <span class="cd-breakdown-label">${escHtml(r.label)}</span>
        <span class="cd-breakdown-count">${r.count}</span>
      </div>
      <div class="cd-breakdown-bar-track">
        <div class="cd-breakdown-bar-fill cd-breakdown-bar-fill--${r.cls}"
             style="width:${Math.max(r.pct, 2).toFixed(1)}%"></div>
      </div>
    </div>
  `).join('');
}

function _renderPlayersTable(videos) {
  const tbody = document.getElementById('cd-players-tbody');
  const badge = document.getElementById('cd-dash-player-count');
  if (!tbody) return;

  // Group by player
  const playerMap = {};
  for (const v of videos) {
    const key = v.player_id || v.player_name || 'unknown';
    if (!playerMap[key]) {
      playerMap[key] = { name: v.player_name || key, batter: 0, bowler: 0, allrounder: 0, other: 0 };
    }
    const p = playerMap[key];
    if (v.angle === 'batter') p.batter++;
    else if (v.angle === 'bowler') p.bowler++;
    else if (v.angle === 'all-rounder') p.allrounder++;
    else p.other++;
  }

  const players = Object.values(playerMap).sort((a, b) => {
    const ta = a.batter + a.bowler + a.allrounder + a.other;
    const tb = b.batter + b.bowler + b.allrounder + b.other;
    return tb - ta;
  });

  if (badge) badge.textContent = players.length;

  if (players.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="cd-players-empty">No players found.</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = players.map(p => {
    const total = p.batter + p.bowler + p.allrounder + p.other;
    const numCell = n => `<td class="cd-ptable-num${n === 0 ? ' cd-ptable-num--zero' : ''}">${n || '—'}</td>`;
    return `
      <tr>
        <td class="cd-ptable-name cd-ptable-name--link" onclick="cdOpenPlayerClips(${JSON.stringify(p.name)})">${escHtml(p.name)}</td>
        ${numCell(p.batter)}
        ${numCell(p.bowler)}
        ${numCell(p.allrounder)}
        <td class="cd-ptable-total">${total}</td>
        <td>
          <button class="cd-ptable-clip-btn" onclick="cdOpenPlayerClips(${JSON.stringify(p.name)})">
            <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Clip
          </button>
        </td>
      </tr>`;
  }).join('');
}

function cdOpenPlayerClips(playerName) {
  // Switch to clipping view and pre-fill the search with the player name
  cdShowView('clipping');
  const searchEl = document.getElementById('cd-search-input');
  if (searchEl) {
    searchEl.value = playerName;
    cdFilterVideos();
  }
}
