'use client';
// Cliente único de Supabase para el navegador (auth + base de datos con RLS).
// Solo usa la clave publicable: nunca la clave de servicio.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(URL && KEY);

let client = null;
export function supabase() {
  if (!supabaseEnabled || typeof window === 'undefined') return null;
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'edavi.auth' } });
  return client;
}
