// Subida de archivos por el servidor (respaldo si el navegador no puede subir
// directamente a la URL prefirmada por CORS). Delegada en el adaptador del proveedor.
import { NextResponse } from 'next/server';
import { generationProvider } from '@/lib/server/providers';
import { resolveAuth } from '@/lib/server/access';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'audio/wav', 'audio/x-wav', 'video/mp4']);

export async function POST(request) {
  const provider = generationProvider();
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ detail: `Tipo de archivo no admitido: ${contentType || 'desconocido'}.` }, { status: 415 });
  }

  let credentials;
  if (provider.needsAuth) {
    const auth = await resolveAuth(request);
    if (auth.error) return NextResponse.json({ detail: auth.error, code: auth.code }, { status: auth.status });
    credentials = auth.credentials;
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  const result = await provider.uploadBytes({ bytes, contentType, credentials, origin: new URL(request.url).origin });
  return NextResponse.json(result.data, { status: result.status });
}
