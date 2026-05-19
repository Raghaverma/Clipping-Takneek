'use client'

import Link from 'next/link'
import AppShell from '../components/AppShell'

export default function OverviewPage() {
  return (
    <AppShell activePage="overview">
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
                <Link href="/clipping" className="cd-dash-action-btn cd-dash-action-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                  Open Clipping Tool
                </Link>
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
    </AppShell>
  )
}
