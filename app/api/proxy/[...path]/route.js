import { cookies } from 'next/headers';
import { getAdminApiBase } from '../../../../lib/env';
import { jsonError, logError, logInfo, requestId } from '../../../../lib/logger';
import { resolveProxyPolicy } from '../../../../lib/proxy-policy';
import { fetchWithTimeout, readBodyWithLimit, UpstreamTimeoutError } from '../../../../lib/upstream';

async function handler(req, { params }) {
  const id = requestId(req);
  const path = (await params).path.join('/');
  const policy = resolveProxyPolicy(path, req.method);
  if (!policy.ok) {
    return jsonError(policy.error, policy.status, id, policy.allowedMethods ? { allowedMethods: policy.allowedMethods } : {});
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cd_session')?.value;
    if (!token) return jsonError('Missing session', 401, id);

    const adminApi = getAdminApiBase();
    const search = new URL(req.url).search;
    const upstream = `${adminApi}/${policy.path}${search}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': '1',
      'x-request-id': id,
    };
    const ct = req.headers.get('content-type');
    if (ct) headers['Content-Type'] = ct;

    const body = await readBodyWithLimit(req, policy.bodyLimit);

    logInfo('proxy.upstream.start', { requestId: id, method: req.method, path: policy.path });
    const res = await fetchWithTimeout(upstream, { method: req.method, headers, body }, 15000);

    const resHeaders = new Headers({ 'x-request-id': id });
    ['content-type', 'content-length'].forEach(k => {
      const v = res.headers.get(k);
      if (v) resHeaders.set(k, v);
    });

    logInfo('proxy.upstream.finish', { requestId: id, method: req.method, path: policy.path, status: res.status });
    return new Response(res.body, { status: res.status, headers: resHeaders });
  } catch (error) {
    const status = error instanceof UpstreamTimeoutError ? 504 : error.message.includes('exceeds') ? 413 : 500;
    logError('proxy.upstream.error', error, { requestId: id, method: req.method, path });
    return jsonError(status === 504 ? 'Upstream request timed out' : error.message, status, id);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
