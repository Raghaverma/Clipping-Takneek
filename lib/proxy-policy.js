const ROUTES = [
  {
    pattern: /^video-processing\/admin-payload$/,
    methods: ['POST'],
    bodyLimit: 750_000,
  },
  {
    pattern: /^players\/analysis$/,
    methods: ['POST'],
    bodyLimit: 500_000,
  },
  {
    pattern: /^upload\/download-url$/,
    methods: ['GET'],
    bodyLimit: 0,
  },
];

export function resolveProxyPolicy(path, method) {
  const normalized = String(path || '').replace(/^\/+|\/+$/g, '');
  const match = ROUTES.find(route => route.pattern.test(normalized));
  if (!match) return { ok: false, status: 404, error: 'Proxy route is not allowed' };
  if (!match.methods.includes(method)) {
    return {
      ok: false,
      status: 405,
      error: `Method ${method} is not allowed for this proxy route`,
      allowedMethods: match.methods,
    };
  }
  return { ok: true, path: normalized, bodyLimit: match.bodyLimit };
}
