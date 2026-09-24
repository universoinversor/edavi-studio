// Indica al cliente cómo está configurado el servidor (sin exponer secretos).
import { NextResponse } from 'next/server';
import { isMock, passwordRequired, serverHasCredentials } from '@/lib/server/hf';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    mock: isMock(),
    serverCredentials: serverHasCredentials(),
    passwordRequired: passwordRequired(),
  });
}
