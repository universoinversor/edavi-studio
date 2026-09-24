// Solo para el modo demo (HF_MOCK=1): sirve archivos subidos e imágenes simuladas.
import { NextResponse } from 'next/server';
import { isMock } from '@/lib/server/hf';
import { mockFiles } from '@/lib/server/mock';

export const dynamic = 'force-dynamic';

function frameSvg(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 40) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><radialGradient id="g" cx="${30 + (h % 40)}%" cy="${25 + (h % 50)}%" r="85%">
<stop offset="0" stop-color="hsl(${hue} 85% 62%)"/><stop offset=".55" stop-color="hsl(${hue2} 60% 22%)"/><stop offset="1" stop-color="#0b0908"/></radialGradient>
<filter id="n"><feTurbulence baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .08 0"/></filter></defs>
<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" filter="url(#n)"/>
<circle cx="${300 + (h % 400)}" cy="${420 + (h % 200)}" r="${120 + (h % 90)}" fill="hsl(${hue} 90% 70% / .35)"/>
<text x="48" y="980" font-family="monospace" font-size="28" fill="#efe8dc" opacity=".7">DEMO · ${id.slice(0, 8)}</text></svg>`;
}

export async function GET(_request, { params }) {
  if (!isMock()) return NextResponse.json({ detail: 'Solo disponible en modo demo.' }, { status: 404 });
  const { id } = await params;
  const file = mockFiles.get(id);
  if (file) return new NextResponse(file.bytes, { headers: { 'Content-Type': file.contentType } });
  return new NextResponse(frameSvg(id), { headers: { 'Content-Type': 'image/svg+xml' } });
}

export async function PUT(request, { params }) {
  if (!isMock()) return NextResponse.json({ detail: 'Solo disponible en modo demo.' }, { status: 404 });
  const { id } = await params;
  mockFiles.set(id, { contentType: request.headers.get('content-type') || 'application/octet-stream', bytes: Buffer.from(await request.arrayBuffer()) });
  return new NextResponse(null, { status: 200 });
}
