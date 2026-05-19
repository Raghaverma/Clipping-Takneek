import { jsonError, logInfo, requestId } from '../../../lib/logger';
import { readBodyWithLimit } from '../../../lib/upstream';

export async function POST(req) {
  const id = requestId(req);

  try {
    const raw = await readBodyWithLimit(req, 50_000);
    const payload = JSON.parse(new TextDecoder().decode(raw));
    logInfo('client.event', {
      requestId: id,
      clientEvent: payload.event || 'client.log',
      level: payload.level || 'info',
      message: payload.message || '',
      context: payload.context || {},
    });
    return Response.json({ ok: true, requestId: id }, { headers: { 'x-request-id': id } });
  } catch {
    return jsonError('Invalid log payload', 400, id);
  }
}
