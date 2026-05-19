import { describe, expect, it } from 'vitest';
import { resolveProxyPolicy } from './proxy-policy';

describe('resolveProxyPolicy', () => {
  it('allows known upload endpoints with the expected method', () => {
    expect(resolveProxyPolicy('video-processing/admin-payload', 'POST')).toMatchObject({
      ok: true,
      path: 'video-processing/admin-payload',
    });
  });

  it('rejects unknown upstream paths', () => {
    expect(resolveProxyPolicy('admin/users', 'GET')).toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it('rejects unsupported methods on allowed paths', () => {
    expect(resolveProxyPolicy('players/analysis', 'GET')).toMatchObject({
      ok: false,
      status: 405,
      allowedMethods: ['POST'],
    });
  });
});
