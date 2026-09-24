// Indica al cliente cómo está configurado el servidor (sin exponer secretos).
import { NextResponse } from 'next/server';
import { isMock, passwordRequired, serverHasCredentials } from '@/lib/server/hf';
import { allowOwnKeys, loginRequired } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    mock: isMock(),
    serverCredentials: serverHasCredentials(),
    passwordRequired: !loginRequired() && passwordRequired(),
    loginRequired: loginRequired() && !isMock(),
    allowOwnKeys: allowOwnKeys(),
  });
}
