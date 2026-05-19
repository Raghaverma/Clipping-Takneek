export function requestId(req) {
  return req?.headers?.get?.('x-request-id') || crypto.randomUUID();
}

export function logInfo(event, fields = {}) {
  console.log(JSON.stringify({
    level: 'info',
    event,
    at: new Date().toISOString(),
    ...fields,
  }));
}

export function logWarn(event, fields = {}) {
  console.warn(JSON.stringify({
    level: 'warn',
    event,
    at: new Date().toISOString(),
    ...fields,
  }));
}

export function logError(event, error, fields = {}) {
  console.error(JSON.stringify({
    level: 'error',
    event,
    at: new Date().toISOString(),
    error: error?.message || String(error),
    ...fields,
  }));
}

export function jsonError(message, status, id, extra = {}) {
  return Response.json(
    { error: message, requestId: id, ...extra },
    { status, headers: { 'x-request-id': id } }
  );
}
