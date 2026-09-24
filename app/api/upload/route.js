// Subida de archivos por el servidor (respaldo si el navegador no puede subir
// directamente a la URL prefirmada por CORS). Pide la URL, sube y devuelve public_url.
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { forward, isMock, resolveAuth } from '@/lib/server/hf';
import { mockFiles } from '@/lib/server/mock';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'audio/wav', 'audio/x-wav', 'video/mp4']);

export async function POST(request) {
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ detail: `Tipo de archivo no admitido por Higgsfield: ${contentType || 'desconocido'}.` }, { status: 415 });
  }
  const bytes = Buffer.from(await request.arrayBuffer());

  if (isMock()) {
    const id = randomUUID();
    mockFiles.set(id, { contentType, bytes });
    return NextResponse.json({ public_url: `${new URL(request.url).origin}/api/mock-media/${id}` });
  }

  const auth = resolveAuth(request);
  if (auth.error) return NextResponse.json({ detail: auth.error, code: auth.code }, { status: auth.status });

  const presign = await forward({
    method: 'POST', path: 'files/generate-upload-url', authorization: auth.authorization,
    body: JSON.stringify({ content_type: contentType }), contentType: 'application/json',
  });
  if (presign.status >= 300) return NextResponse.json(presign.data, { status: presign.status });

  const { upload_url: uploadUrl, upload_headers: uploadHeaders = {}, public_url: publicUrl } = presign.data;
  const put = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: bytes });
  if (!put.ok) {
    return NextResponse.json({ detail: `La subida al almacenamiento falló (${put.status}).` }, { status: 502 });
  }
  return NextResponse.json({ public_url: publicUrl });
}
