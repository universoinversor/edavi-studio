'use client';
// Fachada de proveedores para la UI y los almacenes. Los componentes importan
// desde aquí y nunca conocen URLs ni SDKs de terceros.
import { higgsfieldClient } from './generation/higgsfield.client';
import * as supabaseStorage from './storage/supabase.client';

// Generación: submit, status, cancel, estimate, upload, listStyles, listPresets, createCharacter, getCharacter
export const generation = higgsfieldClient;

// Almacenamiento en la nube: historial, personajes y archivos permanentes
export const storage = supabaseStorage;
