// Indica al cliente cómo está configurado el servidor (sin exponer secretos).
import { NextResponse } from 'next/server';
import { generationProvider, isMock } from '@/lib/server/providers';
import { passwordRequired, serverHasCredentials } from '@/lib/server/access';
import { allowOwnKeys, allowSignup, loginRequired } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    provider: generationProvider().id,
    mock: isMock(),
    serverCredentials: serverHasCredentials(),
    passwordRequired: !loginRequired() && passwordRequired(),
    loginRequired: loginRequired() && !isMock(),
    allowOwnKeys: allowOwnKeys(),
    allowSignup: allowSignup(),
  });
}
