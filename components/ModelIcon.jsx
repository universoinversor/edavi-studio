// Icono de la familia de un modelo (SVG monocromo de public/model-icons, teñido con el color del tema).
/** @type {Array<[RegExp, string]>} */
const ICONS = [
  [/seedance/i, 'seedance'], [/kling/i, 'kling'], [/wan/i, 'wan'], [/minimax|hailuo/i, 'minimax'],
  [/pixverse/i, 'pixverse'], [/qwen/i, 'qwen'], [/recraft/i, 'recraft'], [/ideogram/i, 'ideogram'],
  [/grok/i, 'grok'], [/z-image/i, 'z-image'], [/ltx/i, 'ltx'], [/happy.?horse/i, 'happy-horse'], [/flux/i, 'flux'],
];

export function iconFor(name = '') {
  return (ICONS.find(([re]) => re.test(name)) || [null, 'higgsfield'])[1];
}

/** @param {{ name: string, size?: number, className?: string }} props */
export default function ModelIcon({ name, size = 18, className = '' }) {
  const src = `/model-icons/${iconFor(name)}.svg`;
  return (
    <span className={`micon ${className}`} aria-hidden
      style={/** @type {any} */ ({ width: size, height: size, '--micon': `url(${src})` })} />
  );
}
