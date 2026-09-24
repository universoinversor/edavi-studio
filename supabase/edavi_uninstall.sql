-- Quita EDAVI Studio de este proyecto de Supabase (tablas, datos, archivos y políticas).
-- No toca ninguna tabla que no empiece por edavi_.
drop policy if exists "edavi_media_insert_own" on storage.objects;
drop policy if exists "edavi_media_update_own" on storage.objects;
drop policy if exists "edavi_media_delete_own" on storage.objects;
delete from storage.objects where bucket_id = 'edavi-media';
delete from storage.buckets where id = 'edavi-media';

drop table if exists public.edavi_credit_ledger;
drop table if exists public.edavi_wallets;
drop table if exists public.edavi_characters;
drop table if exists public.edavi_generations;
drop function if exists public.edavi_touch_updated_at();
