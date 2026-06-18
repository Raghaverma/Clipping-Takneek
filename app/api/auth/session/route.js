import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jsonError, requestId } from '../../../../lib/logger';

export async function GET(req) {
  const id = requestId(req);
  const cookieStore = await cookies();
  const token = cookieStore.get('cd_session')?.value;
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        user: { email: 'mock-dev-user@takneek.ai', name: 'Mock Dev User' },
        requestId: id
      }, { headers: { 'x-request-id': id } });
    }
    return jsonError('Not authenticated', 401, id);
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return NextResponse.json({ user: payload, requestId: id }, { headers: { 'x-request-id': id } });
  } catch {
    return jsonError('Invalid session', 401, id);
  }
}
