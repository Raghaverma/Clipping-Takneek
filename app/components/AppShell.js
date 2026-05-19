'use client'

import Link from 'next/link'

export default function AppShell({ activePage, showCatToggle, children }) {
  return (
    <>
      <header className="cd-header">
        <div className="cd-logo">
          <div className="cd-logo-mark">
            <img src="/Takneek.svg" width="18" height="18" className="is-block" alt="Takneek" />
          </div>
          <div>
            <div className="cd-logo-text">Takneek</div>
            <div className="cd-logo-sub">Dashboard</div>
          </div>
        </div>
        <div className="cd-header-sep"></div>
        <div className="cd-search-group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               width="14" height="14" style={{color:'var(--text-muted)',flexShrink:0}}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
          </svg>
          <input id="cd-search-input" className="cd-search-input" type="text"
            placeholder="Search videos or players…" onInput={() => cdFilterVideos()} autoComplete="off" />
        </div>
        <select id="cd-angle-filter" className="cd-angle-select" onChange={() => cdFilterVideos()}>
          <option value="">All types</option>
          <option value="batter">Batter</option>
          <option value="bowler">Bowler</option>
          <option value="all-rounder">All-Rounder</option>
        </select>
        <button className="cd-refresh-btn" onClick={() => cdFetchVideos()} title="Refresh video list" id="cd-refresh-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
        <button className="cd-logout-btn" onClick={() => cdLogout()} title="Sign out" id="cd-logout-btn">
          Sign out
        </button>
      </header>

      <div className="cd-subnav">
        <nav className="cd-view-tabs">
          <Link href="/overview" id="cd-tab-dashboard" className={`cd-view-tab${activePage === 'overview' ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            Overview
          </Link>
          <Link href="/clipping" id="cd-tab-clipping" className={`cd-view-tab${activePage === 'clipping' ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Clipping
          </Link>
        </nav>
        {showCatToggle && (
          <div className="cd-subnav-right">
            <div className="cd-cat-toggle">
              <button id="cd-cat-batsman" className="cd-cat-btn active" onClick={() => cdSetCategory('batsman')}>Batsman</button>
              <button id="cd-cat-bowler"  className="cd-cat-btn"        onClick={() => cdSetCategory('bowler')}>Bowler</button>
            </div>
          </div>
        )}
      </div>

      {children}

      {/* Google OAuth login overlay */}
      <div className="cd-login-overlay is-hidden" id="cd-login-overlay">
        <div className="cd-login-card">
          <img src="/Takneek.svg" width="40" height="40" alt="Takneek" className="cd-login-logo" />
          <div className="cd-login-title">Takneek Dashboard</div>
          <div className="cd-login-sub">Sign in to continue</div>
          <button className="cd-google-btn" id="cd-signin-btn" onClick={() => cdGoogleSignIn()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" style={{flexShrink:0}}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
          <p className="cd-login-note" id="cd-login-error"></p>
        </div>
      </div>

      <div className="cd-statusbar" id="cd-statusbar">
        Connecting to Takneek API…
      </div>

      {/* Ball crop modal (CropperJS) */}
      <div className="cd-crop-overlay is-hidden" id="cd-ball-crop-modal">
        <div className="cd-crop-card">
          <div className="cd-crop-header">
            <div className="cd-crop-header-left">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{color:'#fbbf24'}}>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>Mark Ball — Frame <strong id="cd-crop-frame-num">—</strong></span>
            </div>
            <button className="cd-crop-close-btn" onClick={() => cdAnnotCloseBallCrop()}>×</button>
          </div>
          <div className="cd-crop-hint">
            Draw a tight box around the ball — use scroll to zoom, drag to reposition
          </div>
          <div className="cd-crop-img-wrap">
            <img id="cd-ball-crop-img" src={undefined} alt="" className="cd-ball-crop-img" />
          </div>
          <div className="cd-crop-info">
            <span>Ball&nbsp;⌀&nbsp;<strong id="cd-crop-diam-px">—</strong>&nbsp;px</span>
            <span className="cd-crop-scale-tag" id="cd-crop-scale-preview">—</span>
            <label className="cd-crop-diam-label">
              Override&nbsp;⌀
              <input className="cd-crop-diam-input" id="cd-crop-ball-diam" type="number"
                     defaultValue="73.5" min="60" max="80" step="0.1"
                     onInput={() => _updateCropInfo()} />
              mm
            </label>
          </div>
          <div className="cd-crop-actions">
            <button className="cd-crop-cancel-btn" onClick={() => cdAnnotCloseBallCrop()}>Cancel</button>
            <button className="cd-crop-confirm-btn" onClick={() => cdAnnotConfirmBallCrop()}>✓ Mark Ball</button>
          </div>
        </div>
      </div>
    </>
  )
}
