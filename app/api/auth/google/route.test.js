import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieSet:          vi.fn(),
  fetchWithTimeout:   vi.fn(),
  getServerConfig:    vi.fn(),
  UpstreamTimeoutError: class UpstreamTimeoutError extends Error { name = 'UpstreamTimeoutError'; },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet, get: vi.fn(), delete: vi.fn() })),
}));

vi.mock('../../../../lib/env', () => ({
  getServerConfig: mocks.getServerConfig,
}));

vi.mock('../../../../lib/upstream', () => ({
  fetchWithTimeout:   mocks.fetchWithTimeout,
  UpstreamTimeoutError: mocks.UpstreamTimeoutError,
}));

vi.mock('../../../../lib/logger', () => ({
  requestId: () => 'req-test',
  logInfo:   vi.fn(),
  logError:  vi.fn(),
  jsonError: (msg, status, id, extra = {}) =>
    Response.json({ error: msg, requestId: id, ...extra }, { status, headers: { 'x-request-id': id } }),
}));

const BASE_CONFIG = {
  adminApi:           'http://test-admin/api/v1',
  googleClientId:     'test-client-id',
  googleClientSecret: 'test-secret',
  redirectUri:        'http://localhost:3000/oauth-callback.html',
};

const googleOkRes  = () => ({ ok: true,  json: async () => ({ id_token: 'test-id-token' }) });
const backendOkRes = () => ({ ok: true,  json: async () => ({ token: 'test-jwt', userId: 'u1', email: 'a@b.com' }) });
const failRes      = (s) => ({ ok: false, status: s, text: async () => 'error' });

function makeReq(body) {
  return new Request('http://localhost/api/auth/google', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/auth/google POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerConfig.mockReturnValue(BASE_CONFIG);
    mocks.fetchWithTimeout
      .mockResolvedValueOnce(googleOkRes())
      .mockResolvedValueOnce(backendOkRes());
  });

  it('returns 400 when code is missing', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: '' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Missing code or codeVerifier' });
  });

  it('returns 400 when codeVerifier is missing', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'abc' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Missing code or codeVerifier' });
  });

  it('returns 502 when Google token exchange fails', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockResolvedValueOnce(failRes(400));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: 'Google token exchange failed' });
  });

  it('returns 502 when Google response is missing id_token', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: 'No id_token in Google response' });
  });

  it('returns backend status when backend auth fails', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout
      .mockResolvedValueOnce(googleOkRes())
      .mockResolvedValueOnce(failRes(403));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Backend auth failed' });
  });

  it('returns 502 when backend response is missing token', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout
      .mockResolvedValueOnce(googleOkRes())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'u1' }) }); // no token
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(502);
  });

  it('sets an httpOnly cd_session cookie on success', async () => {
    const { POST } = await import('./route');
    await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      'cd_session',
      'test-jwt',
      expect.objectContaining({ httpOnly: true, path: '/' })
    );
  });

  it('returns user fields (not the token) in the response body', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ userId: 'u1', email: 'a@b.com' });
    expect(body.user.token).toBeUndefined(); // token must not leak to client
  });

  it('returns 504 on upstream timeout', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockRejectedValueOnce(new mocks.UpstreamTimeoutError('timeout'));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(504);
  });

  it('returns 500 on unexpected error', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockRejectedValueOnce(new Error('network error'));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ code: 'c', codeVerifier: 'v' }));
    expect(res.status).toBe(500);
  });
});
