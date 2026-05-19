'use client'

export default function ClippingView({ videoId }) {
  return (
    <div id="cd-clipping-view" className="cd-clipping-view" data-video-id={videoId || ''}>
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

          {/* Analysis section — Stages / Ball Speed tabs */}
          <div className="cd-analysis-section">

            <div className="cd-analysis-tabs">
              <button className="cd-analysis-tab active" id="cd-tab-stages" onClick={() => cdSetAnalysisTab('stages')}>
                Stages
              </button>
              <button className="cd-analysis-tab" id="cd-tab-ballspeed" onClick={() => cdSetAnalysisTab('ballspeed')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                  <circle cx="12" cy="12" r="3"/>
                  <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
                Ball Speed
              </button>
            </div>

            <div className="cd-analysis-body">

              {/* Ball Speed annotation engine */}
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

              {/* Bowler / Batsman stages */}
              <div className="cd-ann-panel" id="cd-ann-panel">
                <div className="cd-panel-header">
                  <span className="cd-panel-title" id="cd-ann-header">Bowling Stages</span>
                  <span className="cd-ann-progress" id="cd-ann-progress"></span>
                </div>
                <p className="cd-ann-no-sel" id="cd-ann-no-sel">Select a clip to mark bowling stages.</p>
                <div className="cd-ann-stages" id="cd-ann-stages"></div>
              </div>

            </div>
          </div>

          <div className="cd-actions">
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
  )
}
