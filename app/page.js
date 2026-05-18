'use client'

/* eslint-disable no-undef */
// clipping.js is loaded via <Script> in layout.js and registers globals on window.

export default function TakneekDashboard() {
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
      </header>

      <div className="cd-subnav">
        <nav className="cd-view-tabs">
          <button id="cd-tab-dashboard" className="cd-view-tab active" onClick={() => cdShowView('dashboard')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            Overview
          </button>
          <button id="cd-tab-clipping" className="cd-view-tab" onClick={() => cdShowView('clipping')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Clipping
          </button>
        </nav>
        <div className="cd-subnav-right">
          <div className="cd-cat-toggle">
            <button id="cd-cat-batsman" className="cd-cat-btn active" onClick={() => cdSetCategory('batsman')}>Batsman</button>
            <button id="cd-cat-bowler"  className="cd-cat-btn"        onClick={() => cdSetCategory('bowler')}>Bowler</button>
          </div>
        </div>
      </div>

      <div id="cd-dashboard" className="cd-dashboard-view">

        <div className="cd-stat-row">
          <div className="cd-stat-card">
            <div className="cd-stat-icon cd-stat-icon--total">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </div>
            <div className="cd-stat-body">
              <div className="cd-stat-value" id="cd-stat-total">—</div>
              <div className="cd-stat-label">Total Videos</div>
            </div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-icon cd-stat-icon--batter">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <div className="cd-stat-body">
              <div className="cd-stat-value" id="cd-stat-batters">—</div>
              <div className="cd-stat-label">Batter Videos</div>
            </div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-icon cd-stat-icon--bowler">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 13H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 7.06 7.06 4.56 11 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07C16.94 4.56 19.44 7.06 19.93 11H18c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.49 3.94-2.99 6.44-6.93 6.93z"/>
              </svg>
            </div>
            <div className="cd-stat-body">
              <div className="cd-stat-value" id="cd-stat-bowlers">—</div>
              <div className="cd-stat-label">Bowler Videos</div>
            </div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-icon cd-stat-icon--allrounder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="cd-stat-body">
              <div className="cd-stat-value" id="cd-stat-players">—</div>
              <div className="cd-stat-label">Unique Players</div>
            </div>
          </div>

          <div className="cd-stat-card">
            <div className="cd-stat-icon cd-stat-icon--processed">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="cd-stat-body">
              <div className="cd-stat-value" id="cd-stat-processed">—</div>
              <div className="cd-stat-label">Processed</div>
            </div>
          </div>
        </div>

        <div className="cd-dash-body">

          <div className="cd-dash-section cd-dash-players">
            <div className="cd-dash-section-header">
              <span className="cd-dash-section-title">Players</span>
              <span className="cd-dash-section-badge" id="cd-dash-player-count">0</span>
            </div>
            <div className="cd-players-table-wrap">
              <table className="cd-players-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Batsman</th>
                    <th>Bowler</th>
                    <th>All-Rounder</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="cd-players-tbody">
                  <tr className="cd-players-loading-row">
                    <td colSpan="6">
                      <div className="cd-players-loading">
                        <div className="cd-spinner"></div>
                        <span>Loading players…</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="cd-dash-sidebar">

            <div className="cd-dash-section">
              <div className="cd-dash-section-header">
                <span className="cd-dash-section-title">Type Breakdown</span>
              </div>
              <div className="cd-breakdown" id="cd-breakdown">
                <div className="cd-breakdown-loading">
                  <div className="cd-spinner"></div>
                </div>
              </div>
            </div>

            <div className="cd-dash-section cd-dash-actions-section">
              <div className="cd-dash-section-header">
                <span className="cd-dash-section-title">Quick Actions</span>
              </div>
              <div className="cd-dash-quick-actions">
                <button className="cd-dash-action-btn cd-dash-action-primary" onClick={() => cdShowView('clipping')}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                  Open Clipping Tool
                </button>
                <button className="cd-dash-action-btn" onClick={() => cdFetchVideos()}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Refresh Data
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      <div id="cd-clipping-view" className="cd-clipping-view is-hidden">
      <main className="cd-main">

        {/* Left panel — video browser */}
        <aside className="cd-left">
          <div className="cd-browser-status" id="cd-browser-status">
            <span id="cd-video-count-label">Loading videos…</span>
          </div>
          <div className="cd-video-list" id="cd-video-list">
            <div className="cd-vlist-loading" id="cd-vlist-loading">
              <div className="cd-spinner"></div>
              <span>Fetching from Takneek…</span>
            </div>
          </div>
        </aside>

        {/* Center — player */}
        <section className="cd-center">

          <div className="cd-video-bar is-hidden" id="cd-video-bar">
            <div className="cd-vbar-left">
              <span className="cd-vbar-name" id="cd-vbar-name">—</span>
              <span className="cd-vbar-player" id="cd-vbar-player"></span>
            </div>
            <div className="cd-vbar-right">
              <span className="cd-vbar-angle" id="cd-vbar-angle"></span>
              <span className="cd-vbar-dur" id="cd-vbar-dur"></span>
            </div>
          </div>

          <div className="cd-player-box">
            <div className="cd-placeholder cd-drop-zone" id="cd-placeholder"
                 onDragOver={(e) => cdDragOver(e)}
                 onDragLeave={(e) => cdDragLeave(e)}
                 onDrop={(e) => cdDrop(e)}>
              <svg className="cd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.4" width="52" height="52">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <p className="cd-placeholder-text">Drop a video file here</p>
              <span className="cd-placeholder-hint">MP4, MOV, AVI, MKV supported</span>
            </div>

            <div id="cd-zoom-wrap" className="cd-zoom-wrap">
              <video id="cd-video" className="is-hidden" preload="metadata"></video>
              <canvas id="cd-speed-canvas" className="cd-speed-canvas"></canvas>
            </div>

            <div className="cd-zoom-badge is-hidden" id="cd-zoom-badge">
              <span id="cd-zoom-level">1×</span>
              <button className="cd-zoom-reset-btn" onClick={() => cdZoomReset()} title="Reset zoom">↩</button>
            </div>
          </div>

          <div className="cd-seekbar-wrap" id="cd-seekbar-wrap">
            <div className="cd-seek-track" id="cd-seek-track">
              <div className="cd-seek-buffer" id="cd-seek-buffer"></div>
              <div className="cd-seek-fill" id="cd-seek-fill"></div>
              <div className="cd-seek-layers" id="cd-seek-layers"></div>
              <div className="cd-seek-thumb" id="cd-seek-thumb"></div>
            </div>
            <div className="cd-seek-tooltip" id="cd-seek-tooltip">0:00.0</div>
          </div>

          <div className="cd-controls">

            <div className="cd-ctrl-group">
              <button className="cd-ctrl-btn" title="Step back (←)" onMouseDown={() => cdStepFrame(-1)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                </svg>
              </button>

              <button id="cd-play-btn" className="cd-ctrl-btn cd-ctrl-play"
                      title="Play / Pause (Space)" onClick={() => cdTogglePlay()}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>

              <button className="cd-ctrl-btn" title="Step forward (→)" onMouseDown={() => cdStepFrame(1)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                </svg>
              </button>

              <span className="cd-time-display">
                <span className="cd-time-cur" id="cd-time-cur">0:00.0</span>
                <span style={{color:'var(--text-muted)'}}> / </span>
                <span id="cd-time-dur">—</span>
              </span>
            </div>

            <div className="cd-ctrl-group cd-ctrl-center">
              <button className="cd-io-btn cd-in-btn" title="Set Start point (I)" onClick={() => cdSetIn()}>[ Start</button>
              <button className="cd-io-btn cd-out-btn" title="Set End point (O)" onClick={() => cdSetOut()}>End ]</button>
              <button className="cd-add-btn" title="Add clip (A)" onClick={() => cdAddClip()}>+ Add Clip</button>
            </div>

            <div className="cd-ctrl-group cd-ctrl-right">
              <button id="cd-mute-btn" className="cd-ctrl-btn" title="Mute / Unmute (M)" onClick={() => cdToggleMute()}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </button>
              <select className="cd-speed-select" title="Playback speed" defaultValue="1" onChange={(e) => cdSetSpeed(e.target.value)}>
                <option value="0.1">0.1×</option>
                <option value="0.25">0.25×</option>
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </div>

          </div>

          <div className="cd-inout-bar">
            <div className="cd-io-chip" id="cd-in-chip">
              <span className="cd-io-tag">START</span>
              <span className="cd-io-val" id="cd-in-val">—</span>
              <button className="cd-io-x" onClick={() => cdClearIn()} title="Clear start point">×</button>
            </div>

            <span className="cd-io-arrow">→</span>

            <div className="cd-io-chip" id="cd-out-chip">
              <span className="cd-io-tag">END</span>
              <span className="cd-io-val" id="cd-out-val">—</span>
              <button className="cd-io-x" onClick={() => cdClearOut()} title="Clear end point">×</button>
            </div>

            <span className="cd-io-dur is-hidden" id="cd-io-dur">—</span>
          </div>

          <div className="cd-hints">
            Space · play/pause &nbsp;·&nbsp;
            I · set start &nbsp;·&nbsp;
            O · set end &nbsp;·&nbsp;
            M · mute/unmute &nbsp;·&nbsp;
            A · add clip &nbsp;·&nbsp;
            ← → · step frame &nbsp;·&nbsp;
            ↑ ↓ · step 10 frames &nbsp;·&nbsp;
            1-9 · jump 10-90% &nbsp;·&nbsp;
            scroll · zoom &nbsp;·&nbsp;
            +/- · zoom &nbsp;·&nbsp;
            Alt+drag · pan &nbsp;·&nbsp;
            dbl-click · reset zoom
          </div>

        </section>

        {/* Right panel — clips + annotation */}
        <aside className="cd-right">

          <div className="cd-panel-header">
            <span className="cd-panel-title">Clips</span>
            <span className="cd-panel-badge" id="cd-clip-count">0</span>
          </div>

          <div className="cd-clips-scroll" id="cd-clips-scroll">
            <div className="cd-empty">
              <svg className="cd-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.5" width="36" height="36">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              <span>No clips yet.<br/>Set Start &amp; End points, then click<br/><strong>+ Add Clip</strong>.</span>
            </div>
          </div>

          <div className="cd-clip-player is-hidden" id="cd-clip-player">
            <div className="cd-clip-player-header">
              <span className="cd-clip-player-label" id="cd-clip-player-label">Clip 1</span>
              <button className="cd-clip-player-close" onClick={() => cdCloseClipPlayer()} title="Close">×</button>
            </div>
            <div className="cd-clip-player-box">
              <div className="cd-clip-player-loading" id="cd-clip-player-loading">
                <div className="cd-spinner"></div>
                <span>Cutting clip…</span>
              </div>
              <video id="cd-clip-video" className="cd-clip-video is-hidden" controls preload="auto"></video>
            </div>
          </div>

          {/* Annotation Engine Panel */}
          <div className="cd-annot-panel is-hidden" id="cd-annot-panel">

            <div className="cd-annot-modes">
              <button className="cd-mode-btn" id="cd-mode-refA" onClick={() => cdAnnotSetMode('refA')} title="Place Ref A calibration point">A</button>
              <button className="cd-mode-btn" id="cd-mode-refB" onClick={() => cdAnnotSetMode('refB')} title="Place Ref B calibration point">B</button>
              <button className="cd-mode-btn" id="cd-mode-ball" onClick={() => cdAnnotSetMode('ball')} title="Mark ball (B)">●</button>
              <button className="cd-mode-btn" id="cd-mode-none" onClick={() => cdAnnotSetMode('none')} title="Deselect (Esc)">✕</button>
              <button className="cd-mode-btn cd-grid-btn" id="cd-mode-grid" onClick={() => cdAnnotToggleGrid()} title="Toggle 10×10 grid overlay">#</button>
            </div>

            <div className="cd-annot-frame-row">
              <span className="cd-annot-frame-label">Frame <strong id="cd-annot-frame">—</strong></span>
              <span className="cd-annot-frame-status" id="cd-annot-frame-status"></span>
            </div>

            <div className="cd-annot-section">
              <div className="cd-annot-sec-head">Calibration</div>
              <div className="cd-annot-calib-row">
                <span className="cd-annot-ref" id="cd-calib-refA-status">A</span>
                <span className="cd-annot-ref" id="cd-calib-refB-status">B</span>
                <label className="cd-annot-dist-label">
                  <input className="cd-annot-dist-input" id="cd-calib-dist" type="number"
                         defaultValue="0.45" min="0.1" max="25" step="0.01"
                         onChange={(e) => {
                           CD.annotEngine.calibration.distance_m = parseFloat(e.target.value) || 0.45;
                           _annotRecompute(); cdAnnotRender(); cdAnnotDrawCanvas();
                         }} />
                  <span>m</span>
                </label>
              </div>
              <div className="cd-annot-scale-row">
                <div className="cd-annot-scale" id="cd-annot-scale">Place Ref A + Ref B to calibrate</div>
                <button className="cd-annot-scale-reset-btn is-hidden" id="cd-annot-scale-reset"
                        onClick={() => cdAnnotResetBallScale()}
                        title="Clear locked scale — next ball click will re-open crop modal">↺</button>
              </div>
            </div>

            <div className="cd-annot-speed is-hidden" id="cd-annot-speed">
              <div className="cd-annot-speed-display">
                <span className="cd-annot-kmh" id="cd-annot-kmh">—</span>
                <span className="cd-annot-unit">km/h</span>
              </div>
              <div className="cd-annot-peak" id="cd-annot-peak">—</div>
            </div>

            <div className="cd-annot-pts" id="cd-annot-pts">
              <span className="cd-annot-pts-empty">No ball points yet</span>
            </div>

            <div className="cd-annot-controls">
              <button className="cd-annot-ctrl-btn" onClick={() => cdAnnotClearFrame()} title="Clear current frame annotations (Del)">Clear Frame</button>
              <button className="cd-annot-ctrl-btn cd-annot-ctrl-warn" onClick={() => cdAnnotClearAll()}>Clear All</button>
            </div>

          </div>

          {/* Bowler annotation panel */}
          <div className="cd-ann-panel" id="cd-ann-panel">
            <div className="cd-panel-header">
              <span className="cd-panel-title" id="cd-ann-header">Bowling Stages</span>
              <span className="cd-ann-progress" id="cd-ann-progress"></span>
            </div>
            <p className="cd-ann-no-sel" id="cd-ann-no-sel">Select a clip to mark bowling stages.</p>
            <div className="cd-ann-stages" id="cd-ann-stages"></div>
          </div>

          <div className="cd-actions">

            <button className="cd-action-btn cd-annot-toggle-btn" id="cd-annot-btn" onClick={() => cdAnnotToggle()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <circle cx="12" cy="12" r="3"/>
                <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              Ball Speed
            </button>

            <button className="cd-action-btn cd-export-btn" id="cd-export-btn" onClick={() => cdExportClips()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
              </svg>
              Export Data
            </button>

            <button className="cd-action-btn cd-upload-btn" id="cd-upload-btn"
                    onClick={() => cdUploadClips()}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
              </svg>
              Upload
            </button>
          </div>

        </aside>

      </main>
      </div>

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
