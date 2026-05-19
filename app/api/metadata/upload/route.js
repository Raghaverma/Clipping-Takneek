import { cookies } from 'next/headers';
import { getServerConfig } from '../../../../lib/env';
import { jsonError, logError, logInfo, requestId } from '../../../../lib/logger';
import { fetchWithTimeout, readBodyWithLimit, UpstreamTimeoutError } from '../../../../lib/upstream';

export async function PUT(req) {
  const id = requestId(req);

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cd_session')?.value;
    if (!token) return jsonError('Missing session', 401, id);

    const config = getServerConfig();
    if (!config.r2MetadataUrl) return jsonError('Metadata upload is not configured', 501, id);

    const raw = await readBodyWithLimit(req, 750_000);
    const metadata = JSON.parse(new TextDecoder().decode(raw));
    if (!metadata?.sessionId || !Array.isArray(metadata?.clips)) {
      return jsonError('Invalid metadata payload', 400, id);
    }

    const key = `takneek/${encodeURIComponent(metadata.sessionId)}.json`;
    const url = `${config.r2MetadataUrl}/${key}`;

    logInfo('metadata.upload.start', { requestId: id, key, clipCount: metadata.clips.length });

    const res = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(config.r2MetadataToken ? { Authorization: `Bearer ${config.r2MetadataToken}` } : {}),
        'x-request-id': id,
      },
      body: JSON.stringify(metadata, null, 2),
    }, 15000);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Metadata upstream failed with ${res.status}: ${text.slice(0, 300)}`);
    }

    logInfo('metadata.upload.success', { requestId: id, key });
    return Response.json({ ok: true, key, requestId: id }, { headers: { 'x-request-id': id } });
  } catch (error) {
    const status = error instanceof UpstreamTimeoutError ? 504 : error instanceof SyntaxError ? 400 : 500;
    logError('metadata.upload.error', error, { requestId: id, status });
    return jsonError(status === 400 ? 'Invalid metadata JSON' : 'Metadata upload failed', status, id);
  }
}
