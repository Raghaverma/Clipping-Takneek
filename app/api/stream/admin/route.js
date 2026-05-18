export const dynamic = 'force-dynamic';

export async function GET(req) {
  const adminApi = (process.env.NEXT_PUBLIC_ADMIN_API || '').replace(/\/$/, '');
  const auth     = req.headers.get('authorization') || '';

  const upstream = await fetch(`${adminApi}/admin/stream`, {
    headers: {
      'Authorization':              auth,
      'Content-Type':               'application/json',
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Stream unavailable', { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
