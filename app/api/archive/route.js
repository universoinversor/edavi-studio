// Copia los resultados de una generación a Supabase Storage (bucket edavi-media)
// para que no caduquen a los 7 días. Actúa siempre con el token del usuario (RLS).
import { NextResponse } from 'next/server';
import { getUser, loginRequired } from '@/lib/server/session';
import { supabaseStorage as store } from '@/lib/server/providers/storage.supabase';
import { archiveRow } from '@/lib/server/archive';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request) {
  if (!loginRequired()) return NextResponse.json({ detail: 'La base de datos no está configurada.' }, { status: 400 });
  const user = await getUser(request);
  if (!user) return NextResponse.json({ detail: 'Inicia sesión para guardar en tu nube.', code: 'login' }, { status: 401 });

  const { localId } = await request.json().catch(() => ({}));
  if (!localId || typeof localId !== 'string') return NextResponse.json({ detail: 'Falta localId.' }, { status: 400 });

  const row = await store.getGeneration(user, localId);
  if (!row) return NextResponse.json({ detail: 'No encontré esa generación en tu cuenta (espera unos segundos y reintenta).' }, { status: 404 });
  if (row.status !== 'completed') return NextResponse.json({ detail: 'La generación aún no ha terminado.' }, { status: 409 });

  const result = await archiveRow(user, row);
  if (result.error) return NextResponse.json({ detail: result.error }, { status: result.status });
  const { archived } = result;
  return NextResponse.json({ archived });
}
