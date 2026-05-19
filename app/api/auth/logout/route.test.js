import { describe, expect, it, vi } from 'vitest';

const mockDelete = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ delete: mockDelete })),
}));

vi.mock('../../../../lib/logger', () => ({
  requestId: () => 'req-test',
  logInfo:   vi.fn(),
}));

describe('/api/auth/logout POST', () => {
  it('deletes the cd_session cookie', async () => {
    const { POST } = await import('./route');
    await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }));
    expect(mockDelete).toHaveBeenCalledWith('cd_session');
  });

  it('returns ok: true', async () => {
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });

  it('sets x-request-id header on the response', async () => {
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/auth/logout', { method: 'POST' }));
    expect(res.headers.get('x-request-id')).toBe('req-test');
  });
});
