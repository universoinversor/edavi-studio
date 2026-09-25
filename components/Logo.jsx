import { BRAND } from '@/lib/brand';

// Isotipo + nombre. El color del isotipo sale del tema (morado u oro).
export default function Logo({ withName = true }) {
  return (
    <>
      <span className="brand-mark" aria-hidden />
      {withName && <span className="brand-name">{BRAND.name}</span>}
    </>
  );
}
