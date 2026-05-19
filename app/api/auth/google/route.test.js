import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() })),
}));

describe('/api/auth/google', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects missing OAuth fields before calling upstream services', async () => {
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ code: '' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Missing code or codeVerifier',
    });
  });
});
