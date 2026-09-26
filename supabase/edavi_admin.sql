-- EDAVI · administración, galería pública, solicitudes de registro y clave del proveedor en Vault.
-- Ejecútalo después de edavi_install.sql. Cambia el email del administrador en el INSERT.

create table if not exists public.edavi_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.edavi_admins enable row level security;
create policy "edavi_admins_select_self" on public.edavi_admins for select to authenticated using (user_id = (select auth.uid()));

insert into public.edavi_admins (user_id)
select id from auth.users where lower(email) = 'universoinversor1@gmail.com'
on conflict do nothing;

create or replace function public.edavi_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.edavi_admins where user_id = (select auth.uid())) $$;

create or replace function public.edavi_user_is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.edavi_admins where user_id = p_user) $$;

alter table public.edavi_generations add column if not exists published boolean not null default true;
create policy "edavi_gen_select_showcase" on public.edavi_generations for select to anon, authenticated
  using (published and status = 'completed' and public.edavi_user_is_admin(user_id));

create table if not exists public.edavi_signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (length(name) <= 120),
  message text check (length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists edavi_signup_requests_email on public.edavi_signup_requests (lower(email));
alter table public.edavi_signup_requests enable row level security;
create policy "edavi_req_insert_public" on public.edavi_signup_requests for insert to anon, authenticated
  with check (status = 'pending' and reviewed_at is null);
create policy "edavi_req_select_admin" on public.edavi_signup_requests for select to authenticated using ((select public.edavi_is_admin()));
create policy "edavi_req_update_admin" on public.edavi_signup_requests for update to authenticated
  using ((select public.edavi_is_admin())) with check ((select public.edavi_is_admin()));
create policy "edavi_req_delete_admin" on public.edavi_signup_requests for delete to authenticated using ((select public.edavi_is_admin()));

create or replace function public.edavi_signup_allowed(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.edavi_signup_requests where lower(email) = lower(trim(p_email)) and status = 'approved') $$;

create or replace function public.edavi_set_provider_key(p_key text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.edavi_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into v_id from vault.secrets where name = 'edavi_hf_credentials';
  if p_key is null or btrim(p_key) = '' then
    if v_id is not null then delete from vault.secrets where id = v_id; end if;
    return;
  end if;
  if btrim(p_key) !~ '^[^:\s]+:[^:\s]+$' then raise exception 'invalid_format' using errcode = '22023'; end if;
  if v_id is null then
    perform vault.create_secret(btrim(p_key), 'edavi_hf_credentials', 'Clave de Higgsfield de EDAVI');
  else
    perform vault.update_secret(v_id, btrim(p_key));
  end if;
end $$;

create or replace function public.edavi_get_provider_key()
returns text language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.edavi_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name = 'edavi_hf_credentials' limit 1);
end $$;

create or replace function public.edavi_provider_key_status()
returns json language plpgsql stable security definer set search_path = ''
as $$
declare r record;
begin
  if not public.edavi_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select updated_at, left(split_part(decrypted_secret, ':', 1), 4) as hint into r
    from vault.decrypted_secrets where name = 'edavi_hf_credentials' limit 1;
  return json_build_object('configured', r.updated_at is not null, 'updated_at', r.updated_at, 'hint', r.hint);
end $$;

revoke all on function public.edavi_set_provider_key(text), public.edavi_get_provider_key(), public.edavi_provider_key_status() from public, anon;
grant execute on function public.edavi_set_provider_key(text), public.edavi_get_provider_key(), public.edavi_provider_key_status() to authenticated;
revoke all on function public.edavi_is_admin(), public.edavi_user_is_admin(uuid), public.edavi_signup_allowed(text) from public;
grant execute on function public.edavi_is_admin(), public.edavi_user_is_admin(uuid), public.edavi_signup_allowed(text) to anon, authenticated;
