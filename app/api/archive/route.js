// Copia los resultados de una generación a Supabase Storage (bucket edavi-media)
// para que no caduquen a los 7 días. Actúa siempre con el token del usuario (RLS).
import { NextResponse } from 'next/server';
import { getUser, loginRequired } from '@/lib/server/session';
import { supabaseStorage as store } from '@/lib/server/providers/storage.supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 200 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };

// Solo URLs https públicas: nada de IPs ni hosts internos.
function safeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (/^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname) || !u.hostname.includes('.')) return null;
    return u;
  } catch { return null; }
}

export async function POST(request) {
  if (!loginRequired()) return NextResponse.json({ detail: 'La base de datos no está configurada.' }, { status: 400 });
  const user = await getUser(request);
  if (!user) return NextResponse.json({ detail: 'Inicia sesión para guardar en tu nube.', code: 'login' }, { status: 401 });

  const { localId } = await request.json().catch(() => ({}));
  if (!localId || typeof localId !== 'string') return NextResponse.json({ detail: 'Falta localId.' }, { status: 400 });

  const row = await store.getGeneration(user, localId);
  if (!row) return NextResponse.json({ detail: 'No encontré esa generación en tu cuenta (espera unos segundos y reintenta).' }, { status: 404 });
  if (row.status !== 'completed') return NextResponse.json({ detail: 'La generación aún no ha terminado.' }, { status: 409 });

  const archived = Array.isArray(row.archived) ? [...row.archived] : [];
  for (const [i, output] of (row.outputs || []).entries()) {
    if (archived[i]?.url) continue;
    const source = safeUrl(output.url);
    if (!source) continue;
    const media = await fetch(source, { cache: 'no-store' });
    if (!media.ok) return NextResponse.json({ detail: `El proveedor ya no tiene el archivo ${i + 1} (${media.status}).` }, { status: 410 });
    const type = (media.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    if (!/^(image|video|audio)\//.test(type)) return NextResponse.json({ detail: 'El archivo no es imagen, video ni audio.' }, { status: 415 });
    const bytes = Buffer.from(await media.arrayBuffer());
    if (bytes.length > MAX_BYTES) return NextResponse.json({ detail: 'El archivo supera 200 MB.' }, { status: 413 });

    const path = `${user.id}/${localId}-${i + 1}.${EXT[type] || type.split('/')[1] || 'bin'}`;
    const up = await store.putObject(user, path, bytes, type);
    if (!up.ok) return NextResponse.json({ detail: `No se pudo guardar en tu nube (${up.status}).` }, { status: 502 });
    archived[i] = { type: output.type, url: up.url };
  }

  await store.setArchived(user, localId, archived);
  return NextResponse.json({ archived });
}
