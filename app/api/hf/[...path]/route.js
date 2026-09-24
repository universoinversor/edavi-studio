// Proxy seguro hacia https://api.higgsfield.ai.
// El navegador nunca ve las credenciales del servidor y solo se permiten rutas conocidas.
import { NextResponse } from 'next/server';
import { forward, isAllowed, isGenerationPath, isMock, resolveAuth, rewriteUrls } from '@/lib/server/hf';
import { mockRequest } from '@/lib/server/mock';

export const dynamic = 'force-dynamic';

const GET_QUERY_KEYS = ['search', 'size', 'cursor'];

async function handle(request, { params }, method) {
  const { path: segments = [] } = await params;
  const path = segments.map(decodeURIComponent).join('/');
  if (!isAllowed(method, path)) {
    return NextResponse.json({ detail: 'Ruta no permitida por el proxy.' }, { status: 404 });
  }

  let body;
  if (method === 'POST') {
    const raw = await request.text();
    if (raw) {
      try { body = JSON.parse(raw); } catch {
        return NextResponse.json({ detail: 'El cuerpo debe ser JSON.' }, { status: 400 });
      }
    }
  }

  if (isMock()) {
    const { status, data } = mockRequest(method, path, body, new URL(request.url).origin);
    return status === 202 ? new NextResponse(null, { status }) : NextResponse.json(data, { status });
  }

  const auth = resolveAuth(request);
  if (auth.error) return NextResponse.json({ detail: auth.error, code: auth.code }, { status: auth.status });

  // Solo las consultas de listados aceptan parámetros; nada de webhooks arbitrarios.
  let search = '';
  if (method === 'GET') {
    const incoming = new URL(request.url).searchParams;
    const qs = new URLSearchParams();
    for (const key of GET_QUERY_KEYS) if (incoming.has(key)) qs.set(key, incoming.get(key));
    search = qs.size ? `?${qs}` : '';
  }

  try {
    const result = await forward({
      method, path, search, authorization: auth.authorization,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      contentType: body !== undefined ? 'application/json' : undefined,
    });
    const headers = result.correlationId ? { 'x-correlation-id': result.correlationId } : undefined;
    if (result.status === 202 || result.data === null) return new NextResponse(null, { status: result.status, headers });
    const data = isGenerationPath(path) || path.startsWith('requests/') ? rewriteUrls(result.data) : result.data;
    return NextResponse.json(data, { status: result.status, headers });
  } catch (err) {
    return NextResponse.json({ detail: `No se pudo contactar con Higgsfield: ${err.message}` }, { status: 502 });
  }
}

export const GET = (req, ctx) => handle(req, ctx, 'GET');
export const POST = (req, ctx) => handle(req, ctx, 'POST');
