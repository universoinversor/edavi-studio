// Proxy seguro hacia el proveedor de generación (adaptadores en lib/server/providers).
// El navegador nunca ve las credenciales y solo se permiten rutas conocidas.
import { NextResponse, after } from 'next/server';
import { generationProvider } from '@/lib/server/providers';
import { resolveAuth } from '@/lib/server/access';
import { archiveByRequest } from '@/lib/server/archive';
import { extractOutputs } from '@/lib/schema';

const STATUS_PATH = /^requests\/([0-9a-f-]{36})\/status$/i;

export const dynamic = 'force-dynamic';
// Margen para el archivado en segundo plano de videos grandes.
export const maxDuration = 300;

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
  let user = null;
  if (provider.needsAuth) {
    const auth = await resolveAuth(request);
    if (auth.error) return NextResponse.json({ detail: auth.error, code: auth.code }, { status: auth.status });
    credentials = auth.credentials;
    user = auth.user || null;
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
    // Terminado: copia los resultados a la nube del usuario en segundo plano, aunque
    // cierre la pestaña (Higgsfield solo los conserva 7 días).
    const done = method === 'GET' && user && result.data?.status === 'completed' && path.match(STATUS_PATH);
    if (done) after(() => archiveByRequest(user, done[1], extractOutputs(result.data)).catch(() => {}));
    if (result.status === 202 || result.data === null) return new NextResponse(null, { status: result.status, headers });
    return NextResponse.json(result.data, { status: result.status, headers });
  } catch (err) {
    return NextResponse.json({ detail: `No se pudo contactar con el proveedor: ${err.message}` }, { status: 502 });
  }
}

export const GET = (req, ctx) => handle(req, ctx, 'GET');
export const POST = (req, ctx) => handle(req, ctx, 'POST');
