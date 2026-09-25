'use client';
import { useEffect } from 'react';
import { COPY } from '@/lib/copy';
import Avatar from '@/components/Avatar';

export default function Error({ error, reset }) {
  useEffect(() => { console.error('[EDAVI]', error); }, [error]);
  return (
    <main className="state-screen state-page" role="alert">
      <Avatar size="lg" mood="error" />
      <h1>{COPY.states.errorTitle}</h1>
      <p className="dim">{COPY.states.errorText}</p>
      <button type="button" className="cta" onClick={() => reset()}>{COPY.states.retry}</button>
    </main>
  );
}
