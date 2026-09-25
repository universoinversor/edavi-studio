import Link from 'next/link';
import { COPY } from '@/lib/copy';
import Avatar from '@/components/Avatar';

export const metadata = { title: COPY.states.notFoundTitle };

export default function NotFound() {
  return (
    <main className="state-screen state-page">
      <Avatar size="lg" mood="empty" />
      <h1>{COPY.states.notFoundTitle}</h1>
      <p className="dim">{COPY.states.notFoundText}</p>
      <Link className="cta" href="/">{COPY.states.goHome}</Link>
    </main>
  );
}
