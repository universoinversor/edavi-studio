// Registro de proveedores de generación del servidor.
// Para añadir otro proveedor: crea un adaptador con la misma interfaz
// (id, needsAuth, isAllowed, request, uploadBytes) y selecciónalo aquí.
import 'server-only';
import { higgsfield } from './higgsfield';
import { mock } from './mock';

export const isMock = () => process.env.HF_MOCK === '1' || process.env.HF_MOCK === 'true';

export function generationProvider() {
  return isMock() ? mock : higgsfield;
}

export { mockFiles } from './mock';
