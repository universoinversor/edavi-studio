'use client';
// Adaptador de cliente para la generación con Higgsfield. Habla SOLO con el
// proxy propio (/api/gen/…); las credenciales reales nunca llegan al navegador.
// Cualquier otro proveedor debe exponer esta misma interfaz.
import { apiFetch, ApiError, postBinary } from '../../api';

const gen = (path, opts) => apiFetch(`/api/gen/${path}`, opts);

const DIRECT_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4'],
  audio: ['audio/wav', 'audio/x-wav'],
};

async function imageToPng(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.png', { type: 'image/png' });
}

// Convierte lo que se pueda al formato admitido y rechaza el resto con un mensaje claro.
async function normalizeFile(file) {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (Object.values(DIRECT_TYPES).flat().includes(type)) return type === file.type ? file : new File([file], file.name, { type });
  if (type.startsWith('image/')) return imageToPng(file);
  if (type.startsWith('video/')) throw new Error('Solo se acepta video MP4. Convierte el archivo a .mp4.');
  if (type.startsWith('audio/')) throw new Error('Solo se acepta audio WAV. Convierte el archivo a .wav.');
  throw new Error(`Tipo de archivo no admitido: ${file.type || file.name}`);
}

function putWithProgress(url, headers, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers || {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, `La subida falló (${xhr.status}).`)));
    xhr.onerror = () => reject(new TypeError('network'));
    xhr.send(file);
  });
}

export const higgsfieldClient = {
  id: 'higgsfield',
  submit: (endpoint, payload) => gen(endpoint, { method: 'POST', body: payload }),
  status: (requestId) => gen(`requests/${requestId}/status`),
  cancel: (requestId) => gen(`requests/${requestId}/cancel`, { method: 'POST' }),
  estimate: (endpoint, payload) => gen(`estimate/${endpoint}`, { method: 'POST', body: payload, silent: true }),
  listStyles: (version) => gen(version === 'v2' ? 'v1/text2image/soul-styles/v2' : 'v1/text2image/soul-styles'),
  listPresets: (search) => gen('marketing-studio/image/presets', { query: { size: 100, search } }),
  createCharacter: (body) => gen('v1/custom-references', { method: 'POST', body }),
  getCharacter: (id) => gen(`v1/custom-references/${id}`),

  // Sube un archivo y devuelve la URL pública que se pasa al modelo.
  async upload(rawFile, onProgress) {
    const file = await normalizeFile(rawFile);
    const presign = await gen('files/generate-upload-url', { method: 'POST', body: { content_type: file.type } });
    try {
      await putWithProgress(presign.upload_url, presign.upload_headers, file, onProgress);
      return presign.public_url;
    } catch (err) {
      // Si el almacenamiento bloquea la subida directa (CORS), se sube a través del servidor.
      if (err instanceof TypeError) return (await postBinary('/api/upload', file)).public_url;
      throw err;
    }
  },
};
