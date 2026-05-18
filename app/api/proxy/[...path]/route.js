const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

async function handler(req, { params }) {
  const adminApi  = (process.env.NEXT_PUBLIC_ADMIN_API || '').replace(/\/$/, '');
  const path      = (await params).path.join('/');
  const search    = new URL(req.url).search;
  const upstream  = `${adminApi}/${path}${search}`;

  const headers = {
    'ngrok-skip-browser-warning': '1',
  };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const res = await fetch(upstream, {
    method:  req.method,
    headers,
    body:    hasBody ? req.body : undefined,
    duplex:  hasBody ? 'half' : undefined,
  });

  const resHeaders = new Headers();
  ['content-type', 'content-length'].forEach(k => {
    const v = res.headers.get(k);
    if (v) resHeaders.set(k, v);
  });

  return new Response(res.body, { status: res.status, headers: resHeaders });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
