import { cookies } from 'next/headers';
import { getAdminApiBase } from '../../../../lib/env';
import { jsonError, logError, logInfo, requestId } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const id = requestId(req);

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cd_session')?.value;
    if (!token) return jsonError('Missing session', 401, id);

    const adminApi = getAdminApiBase();
    logInfo('stream.admin.start', { requestId: id });

    const upstream = await fetch(`${adminApi}/admin/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-request-id': id,
      },
    });

    if (!upstream.ok || !upstream.body) {
      logInfo('stream.admin.unavailable', { requestId: id, status: upstream.status });
      return jsonError('Stream unavailable', upstream.status, id);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'x-request-id': id,
      },
    });
  } catch (error) {
    logError('stream.admin.error', error, { requestId: id });
    return jsonError('Stream unavailable', 502, id);
  }
}
