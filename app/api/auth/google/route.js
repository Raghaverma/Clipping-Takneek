import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerConfig } from '../../../../lib/env';
import { jsonError, logError, logInfo, requestId } from '../../../../lib/logger';
import { fetchWithTimeout, UpstreamTimeoutError } from '../../../../lib/upstream';

export async function POST(req) {
  const id = requestId(req);

  try {
    const { code, codeVerifier } = await req.json();
    if (!code || !codeVerifier) return jsonError('Missing code or codeVerifier', 400, id);

    const config = getServerConfig();
    logInfo('auth.google.exchange.start', { requestId: id });

    const tokenRes = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    }, 10000);

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      logError('auth.google.exchange.failed', new Error(err), { requestId: id, status: tokenRes.status });
      return jsonError('Google token exchange failed', 502, id);
    }

    const { id_token } = await tokenRes.json();
    if (!id_token) return jsonError('No id_token in Google response', 502, id);

    const backendRes = await fetchWithTimeout(`${config.adminApi}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': id },
      body: JSON.stringify({ googleToken: id_token, role: 'ADMIN' }),
    }, 10000);

    if (!backendRes.ok) {
      const err = await backendRes.text();
      logError('auth.backend.failed', new Error(err), { requestId: id, status: backendRes.status });
      return jsonError('Backend auth failed', backendRes.status, id);
    }

    const session = await backendRes.json();
    const { token, ...userFields } = session;
    if (!token) return jsonError('Backend auth response did not include a session token', 502, id);

    const cookieStore = await cookies();
    cookieStore.set('cd_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    logInfo('auth.google.success', { requestId: id });
    return NextResponse.json({ user: userFields, requestId: id }, { headers: { 'x-request-id': id } });
  } catch (error) {
    const status = error instanceof UpstreamTimeoutError ? 504 : 500;
    logError('auth.google.error', error, { requestId: id, status });
    return jsonError(status === 504 ? 'Authentication upstream timed out' : 'Authentication failed', status, id);
  }
}
