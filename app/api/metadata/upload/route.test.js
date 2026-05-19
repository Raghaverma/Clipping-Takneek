import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

describe('/api/metadata/upload', () => {
  beforeEach(() => {
    vi.resetModules();
    cookieGet.mockReset();
  });

  it('rejects unauthenticated upload attempts', async () => {
    cookieGet.mockReturnValue(undefined);
    const { PUT } = await import('./route');
    const res = await PUT(new Request('http://localhost/api/metadata/upload', {
      method: 'PUT',
      body: JSON.stringify({ sessionId: 'sess-1', clips: [] }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(res.status).toBe(401);
  });
});
