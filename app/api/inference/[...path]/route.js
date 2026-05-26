import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jsonError, logError, requestId } from '../../../../lib/logger';

const INFERENCE_ROOT = path.join(process.cwd(), 'inference');

const CONTENT_TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
};

function safeInferencePath(parts = []) {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  if (parts.some(part => !part || part.startsWith('.') || part.includes('\0'))) return null;

  const resolved = path.resolve(INFERENCE_ROOT, ...parts);
  const rootWithSep = INFERENCE_ROOT.endsWith(path.sep) ? INFERENCE_ROOT : `${INFERENCE_ROOT}${path.sep}`;
  if (resolved !== INFERENCE_ROOT && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

export async function GET(req, { params }) {
  const id = requestId(req);
  const filePath = safeInferencePath((await params).path);
  if (!filePath) return jsonError('Invalid inference asset path', 400, id);

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new Response(data, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'x-request-id': id,
      },
    });
  } catch (error) {
    if (error?.code === 'ENOENT') return jsonError('Inference asset not found', 404, id);
    logError('inference.asset.error', error, { requestId: id });
    return jsonError('Could not read inference asset', 500, id);
  }
}
