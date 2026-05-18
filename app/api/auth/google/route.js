import { NextResponse } from 'next/server';

export async function POST(req) {
  const { code, codeVerifier } = await req.json();
  if (!code || !codeVerifier) {
    return NextResponse.json({ error: 'Missing code or codeVerifier' }, { status: 400 });
  }

  const clientId     = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/oauth-callback.html';
  const adminApi     = process.env.NEXT_PUBLIC_ADMIN_API;

  // Exchange auth code for Google tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: `Google token exchange failed: ${err}` }, { status: 502 });
  }

  const { id_token } = await tokenRes.json();
  if (!id_token) {
    return NextResponse.json({ error: 'No id_token in Google response' }, { status: 502 });
  }

  // Forward ID token to your backend
  const backendRes = await fetch(`${adminApi}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googleToken: id_token, role: 'ADMIN' }),
  });

  if (!backendRes.ok) {
    const err = await backendRes.text();
    return NextResponse.json({ error: `Backend auth failed: ${err}` }, { status: backendRes.status });
  }

  const session = await backendRes.json();
  return NextResponse.json(session);
}
