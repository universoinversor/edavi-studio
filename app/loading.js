import { COPY } from '@/lib/copy';
import Avatar from '@/components/Avatar';

export default function Loading() {
  return (
    <main className="state-screen state-page" aria-busy="true">
      <Avatar size="md" mood="thinking" />
      <p className="dim">{COPY.states.loading}</p>
    </main>
  );
}
