import { BRAND } from '@/lib/brand';
import { COPY } from '@/lib/copy';

// Mascota de EDAVI con estados de ánimo:
//   idle · thinking · success · error · empty · offline
// El estado cambia el halo y la animación (siempre con texto, nunca solo color).
// `speak` muestra un bocadillo con el mensaje del estado (o `message`).
export default function Avatar({ mood = 'idle', size = 'md', speak = false, message, decorative = true, className = '' }) {
  const text = message || COPY.avatar.moods[mood] || '';
  return (
    <figure className={`avatar avatar-${size} mood-${mood} ${className}`} data-mood={mood}>
      <span className="avatar-halo" aria-hidden />
      {mood === 'thinking' && <span className="avatar-orbit" aria-hidden />}
      <img
        className="avatar-img"
        src={BRAND.avatar.src}
        width={BRAND.avatar.width}
        height={BRAND.avatar.height}
        alt={decorative ? '' : COPY.avatar.alt}
        draggable={false}
      />
      {speak && text && (
        <figcaption className="avatar-bubble" role={mood === 'error' ? 'alert' : 'status'}>{text}</figcaption>
      )}
    </figure>
  );
}
