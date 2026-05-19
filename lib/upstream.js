export class UpstreamTimeoutError extends Error {
  constructor(message = 'Upstream request timed out') {
    super(message);
    this.name = 'UpstreamTimeoutError';
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new UpstreamTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function readBodyWithLimit(req, limitBytes = 1_000_000) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > limitBytes) {
    throw new Error(`Request body exceeds ${limitBytes} bytes`);
  }

  const body = await req.arrayBuffer();
  if (body.byteLength > limitBytes) {
    throw new Error(`Request body exceeds ${limitBytes} bytes`);
  }

  return body;
}
