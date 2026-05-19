import { describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: mockGet })),
}));

vi.mock('../../../../lib/logger', () => ({
  requestId: () => 'req-test',
  jsonError: (msg, status, id, extra = {}) =>
    Response.json({ error: msg, requestId: id, ...extra }, { status, headers: { 'x-request-id': id } }),
}));

function makeJwt(payload) {
  return `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload))}.fakesig`;
}

describe('/api/auth/session GET', () => {
  it('returns 401 when no session cookie is present', async () => {
    mockGet.mockReturnValue(undefined);
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Not authenticated' });
  });

  it('returns 200 with decoded user payload for a valid JWT cookie', async () => {
    const payload = { userId: 'u1', email: 'a@b.com', role: 'ADMIN' };
    mockGet.mockReturnValue({ value: makeJwt(payload) });
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ user: payload });
  });

  it('returns 401 when the cookie value is not a valid JWT', async () => {
    mockGet.mockReturnValue({ value: 'not-a-jwt' });
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid session' });
  });

  it('returns 401 when the JWT payload is not valid JSON', async () => {
    mockGet.mockReturnValue({ value: 'header.!!!invalid-base64!!!.sig' });
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/auth/session'));
    expect(res.status).toBe(401);
  });

  it('sets x-request-id header on the response', async () => {
    const payload = { userId: 'u1' };
    mockGet.mockReturnValue({ value: makeJwt(payload) });
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/auth/session'));
    expect(res.headers.get('x-request-id')).toBe('req-test');
  });
});
