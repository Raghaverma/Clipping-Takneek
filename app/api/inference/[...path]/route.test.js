import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../lib/logger', () => ({
  requestId: () => 'req-test',
  logError: vi.fn(),
  jsonError: (msg, status, id, extra = {}) =>
    Response.json({ error: msg, requestId: id, ...extra }, { status, headers: { 'x-request-id': id } }),
}));

describe('/api/inference/[...path]', () => {
  it('serves files from the root inference folder', async () => {
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/inference/README.md'), {
      params: { path: ['README.md'] },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    await expect(res.text()).resolves.toContain('Local Inference Folder');
  });

  it('rejects traversal outside the inference folder', async () => {
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/inference/../package.json'), {
      params: { path: ['..', 'package.json'] },
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid inference asset path' });
  });
});
