'use client'

import Link from 'next/link'
import AppShell from '../components/AppShell'

export default function OverviewPage() {
  return (
    <AppShell activePage="overview">
      <div id="cd-dashboard" className="cd-dashboard-view">

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
