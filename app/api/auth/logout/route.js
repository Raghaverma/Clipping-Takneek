import { cookies } from 'next/headers';
import { logInfo, requestId } from '../../../../lib/logger';

export async function POST(req) {
  const id = requestId(req);
  const cookieStore = await cookies();
  cookieStore.delete('cd_session');
  logInfo('auth.logout', { requestId: id });
  return Response.json({ ok: true, requestId: id }, { headers: { 'x-request-id': id } });
}
