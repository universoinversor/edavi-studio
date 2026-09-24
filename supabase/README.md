# Base de datos de EDAVI Studio (Supabase)

Todo lo de EDAVI está separado: tablas con prefijo `edavi_` y el bucket `edavi-media`.
Así puede convivir en un proyecto de Supabase existente y sacarse fácilmente después.

- `edavi_install.sql`: crea tablas, seguridad por fila (RLS) y el bucket. Se ejecuta en el *SQL Editor* de Supabase.
- `edavi_uninstall.sql`: borra **todo** lo de EDAVI (datos incluidos) sin tocar nada más.

## Mover EDAVI a su propio proyecto

1. En el proyecto nuevo, ejecuta `edavi_install.sql`.
2. Copia los datos, si los quieres conservar:
   `pg_dump --data-only -t 'public.edavi_*' <url-antigua> | psql <url-nueva>`
3. En Vercel, cambia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` al proyecto nuevo.
4. En el proyecto antiguo, ejecuta `edavi_uninstall.sql`.
