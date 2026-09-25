// Identidad de marca: nombre, autor, avatar y colores base.
// Cambia aquí la marca y se actualiza en toda la app (textos en lib/copy.js).
export const BRAND = {
  name: 'EDAVI Studio',
  shortName: 'EDAVI',
  tagline: 'Estudio creativo con IA',
  description: 'Genera imágenes y videos con los modelos de Higgsfield: SOUL, Seedance, Kling, Wan, MiniMax y más.',
  author: 'EDAVI',
  repo: 'https://github.com/universoinversor/edavi-studio',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://edavi-studio.vercel.app',
  locale: 'es',
  // Mascota: PNG transparente cuadrado (recomendado 1024 px).
  avatar: { src: '/edavi-avatar.png', width: 200, height: 200 },
  colors: {
    dark: { background: '#07060b', accent: '#8f4dff' },
    light: { background: '#f4f2ec', accent: '#b8892a' },
  },
};
