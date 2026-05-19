import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

const SCRIPT_SRC = readFileSync(join(process.cwd(), 'public/clipping.js'), 'utf-8');

function makeVideo(overrides = {}) {
  return {
    id: 'v1',
    player_id: 'p1',
    display_name: 'Player — batter',
    player_name: 'Player 1',
    angle: 'batter',
    video_url: 'http://test.mp4',
    video_processed_url: null,
    video_processing_status: 'completed',
    analysis_type: 'batter',
    is_streamable: false,
    isAdminApi: true,
    ...overrides,
  };
}

function makeDOM(extraBody = '') {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div id="cd-statusbar"></div>
      <div id="cd-login-overlay" style="display:none"></div>
      ${extraBody}
    </body></html>`,
    { runScripts: 'dangerously' }
  );

  const { window } = dom;

  // Set up globals before the script reads them
  window.__CD_CONFIG__ = {
    takneekApi:      'http://test-takneek/api/v1',
    adminApi:        'http://test-admin/api/v1',
    googleClientId:  '',
    r2MetadataUrl:   '',
    r2MetadataToken: '',
  };
  window.fetch = () => new Promise(() => {}); // never resolves — no real HTTP in tests
  window.Audio = function () { return { play() { return Promise.resolve(); } }; };
  window.Notification = function () {};
  window.Notification.permission = 'denied';
  window.Notification.requestPermission = () => Promise.resolve('denied');

  // Inject clipping.js — executes synchronously in JSDOM runScripts mode
  const script = window.document.createElement('script');
  script.textContent = SCRIPT_SRC;
  window.document.body.appendChild(script);

  return dom;
}

// ─── renderVideoList ──────────────────────────────────────────────────────────

describe('renderVideoList', () => {
  it('returns early without throwing when list elements are absent', () => {
    // This was the bug: calling renderVideoList on /overview crashed because
    // cd-video-list and cd-video-count-label only exist on the clipping view.
    const { window } = makeDOM();
    window.CD.allVideos = [];
    window.CD.filteredVideos = [];
    expect(() => window.renderVideoList()).not.toThrow();
  });

  it('shows singular label for one video', () => {
    const { window } = makeDOM(`
      <div id="cd-video-list"></div>
      <span id="cd-video-count-label"></span>
    `);
    const v = makeVideo();
    window.CD.allVideos = [v];
    window.CD.filteredVideos = [v];
    window.renderVideoList();
    expect(window.document.getElementById('cd-video-count-label').textContent).toBe('1 video');
  });

  it('shows plural label for multiple videos', () => {
    const { window } = makeDOM(`
      <div id="cd-video-list"></div>
      <span id="cd-video-count-label"></span>
    `);
    const videos = [makeVideo({ id: 'v1' }), makeVideo({ id: 'v2' }), makeVideo({ id: 'v3' })];
    window.CD.allVideos = videos;
    window.CD.filteredVideos = videos;
    window.renderVideoList();
    expect(window.document.getElementById('cd-video-count-label').textContent).toBe('3 videos');
  });

  it('shows filtered count when a subset is active', () => {
    const { window } = makeDOM(`
      <div id="cd-video-list"></div>
      <span id="cd-video-count-label"></span>
    `);
    window.CD.allVideos = [makeVideo({ id: 'v1' }), makeVideo({ id: 'v2' }), makeVideo({ id: 'v3' })];
    window.CD.filteredVideos = [makeVideo({ id: 'v1' })];
    window.renderVideoList();
    expect(window.document.getElementById('cd-video-count-label').textContent).toBe('1 of 3 videos');
  });
});

// ─── _cdToast ─────────────────────────────────────────────────────────────────

describe('_cdToast', () => {
  it('injects a toast element into the DOM', () => {
    const { window } = makeDOM();
    window._cdToast('New Video', 'Player — Face-on', 'new');
    expect(window.document.querySelector('.cd-toast')).not.toBeNull();
  });

  it('renders the correct title and body text', () => {
    const { window } = makeDOM();
    window._cdToast('New Video', 'Player — Face-on', 'new');
    const toast = window.document.querySelector('.cd-toast');
    expect(toast.querySelector('.cd-toast-title').textContent).toBe('New Video');
    expect(toast.querySelector('.cd-toast-text').textContent).toBe('Player — Face-on');
  });

  it('applies cd-toast--new class for new video events', () => {
    const { window } = makeDOM();
    window._cdToast('New Video', 'test', 'new');
    expect(window.document.querySelector('.cd-toast--new')).not.toBeNull();
  });

  it('applies cd-toast--processed class for processed events', () => {
    const { window } = makeDOM();
    window._cdToast('Video Processed', 'test.mp4 is ready', 'processed');
    expect(window.document.querySelector('.cd-toast--processed')).not.toBeNull();
  });

  it('adds is-leaving class when the close button is clicked', () => {
    const { window } = makeDOM();
    window._cdToast('New Video', 'test', 'new');
    window.document.querySelector('.cd-toast-close').click();
    expect(window.document.querySelector('.cd-toast').classList.contains('is-leaving')).toBe(true);
  });

  it('stacks multiple toasts without replacing earlier ones', () => {
    const { window } = makeDOM();
    window._cdToast('Video 1', 'a', 'new');
    window._cdToast('Video 2', 'b', 'new');
    window._cdToast('Video 3', 'c', 'processed');
    expect(window.document.querySelectorAll('.cd-toast').length).toBe(3);
  });

  it('escapes HTML in title and body', () => {
    const { window } = makeDOM();
    window._cdToast('<b>XSS</b>', '<script>alert(1)<\/script>', 'new');
    const toast = window.document.querySelector('.cd-toast');
    // textContent returns decoded text — innerHTML should not contain raw tags
    expect(toast.querySelector('.cd-toast-title').innerHTML).not.toContain('<b>');
    expect(toast.querySelector('.cd-toast-text').innerHTML).not.toContain('<script>');
  });
});

// ─── _cdNotify ────────────────────────────────────────────────────────────────

describe('_cdNotify', () => {
  it('shows an in-app toast on first call', () => {
    const { window } = makeDOM();
    window._cdNotify('New Video', 'Player 1 — Face-on');
    expect(window.document.querySelector('.cd-toast')).not.toBeNull();
  });

  it('uses the new type for non-processed titles', () => {
    const { window } = makeDOM();
    window._cdNotify('New Video', 'Player 1 — Face-on');
    expect(window.document.querySelector('.cd-toast--new')).not.toBeNull();
  });

  it('uses the processed type when title contains "process"', () => {
    const { window } = makeDOM();
    window._cdNotify('Video Processed', 'Player 1 — ready');
    expect(window.document.querySelector('.cd-toast--processed')).not.toBeNull();
  });

  it('debounces: suppresses a second call within 5 seconds', () => {
    const { window } = makeDOM();
    // Each makeDOM is a fresh context so _notifLastAt starts at 0
    window._cdNotify('New Video', 'Player 1');
    window._cdNotify('New Video', 'Player 2'); // should be swallowed
    expect(window.document.querySelectorAll('.cd-toast').length).toBe(1);
  });
});
