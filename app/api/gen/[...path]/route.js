// Proxy seguro hacia el proveedor de generación (adaptadores en lib/server/providers).
// El navegador nunca ve las credenciales y solo se permiten rutas conocidas.
import { NextResponse } from 'next/server';
import { generationProvider } from '@/lib/server/providers';
import { resolveAuth } from '@/lib/server/access';

export const dynamic = 'force-dynamic';

const GET_QUERY_KEYS = ['search', 'size', 'cursor'];

async function handle(request, { params }, method) {
  const provider = generationProvider();
  const { path: segments = [] } = await params;
  const path = segments.map(decodeURIComponent).join('/');
  if (!provider.isAllowed(method, path)) {
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

  let credentials;
  if (provider.needsAuth) {
    const auth = await resolveAuth(request);
    if (auth.error) return NextResponse.json({ detail: auth.error, code: auth.code }, { status: auth.status });
    credentials = auth.credentials;
  }

  // Solo las consultas de listados aceptan parámetros; nada de webhooks arbitrarios.
  let search = '';
  if (method === 'GET') {
    const incoming = new URL(request.url).searchParams;
    const qs = new URLSearchParams();
    for (const key of GET_QUERY_KEYS) if (incoming.has(key)) qs.set(key, incoming.get(key));
    search = qs.size ? `?${qs}` : '';
  }

  try {
    const result = await provider.request({ method, path, search, body, credentials, origin: new URL(request.url).origin });
    const headers = result.correlationId ? { 'x-correlation-id': result.correlationId } : undefined;
    if (result.status === 202 || result.data === null) return new NextResponse(null, { status: result.status, headers });
    return NextResponse.json(result.data, { status: result.status, headers });
  } catch (err) {
    return NextResponse.json({ detail: `No se pudo contactar con el proveedor: ${err.message}` }, { status: 502 });
  }
}

export const GET = (req, ctx) => handle(req, ctx, 'GET');
export const POST = (req, ctx) => handle(req, ctx, 'POST');
