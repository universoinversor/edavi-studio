-- EDAVI Studio: historial, personajes, monedero de créditos y almacenamiento propio.
-- Todas las tablas llevan prefijo edavi_ para convivir con otras apps en el mismo proyecto.

create table public.edavi_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_id text not null,
  request_id text,
  model_id text not null,
  endpoint text not null,
  family text,
  workflow text,
  studio text,
  output text,
  payload jsonb not null default '{}'::jsonb,
  status text not null,
  outputs jsonb not null default '[]'::jsonb,
  archived jsonb not null default '[]'::jsonb,
  error text,
  estimate jsonb,
  favorite boolean not null default false,
  label text,
  group_id text,
  parent_local_id text,
  then_step jsonb,
  chained_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);
create index edavi_generations_user_created_idx on public.edavi_generations (user_id, created_at desc);

create table public.edavi_characters (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  model_version text not null,
  status text not null,
  cover text,
  error text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Monedero para revender créditos con margen (fase de pagos).
create table public.edavi_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,3) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.edavi_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,3) not null,
  reason text not null,
  request_id text,
  created_at timestamptz not null default now()
);
create index edavi_credit_ledger_user_idx on public.edavi_credit_ledger (user_id, created_at desc);

alter table public.edavi_generations enable row level security;
alter table public.edavi_characters enable row level security;
alter table public.edavi_wallets enable row level security;
alter table public.edavi_credit_ledger enable row level security;

-- Cada persona solo ve y modifica lo suyo.
create policy "edavi_gen_select_own" on public.edavi_generations for select to authenticated using (user_id = (select auth.uid()));
create policy "edavi_gen_insert_own" on public.edavi_generations for insert to authenticated with check (user_id = (select auth.uid()));
create policy "edavi_gen_update_own" on public.edavi_generations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "edavi_gen_delete_own" on public.edavi_generations for delete to authenticated using (user_id = (select auth.uid()));

create policy "edavi_char_select_own" on public.edavi_characters for select to authenticated using (user_id = (select auth.uid()));
create policy "edavi_char_insert_own" on public.edavi_characters for insert to authenticated with check (user_id = (select auth.uid()));
create policy "edavi_char_update_own" on public.edavi_characters for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "edavi_char_delete_own" on public.edavi_characters for delete to authenticated using (user_id = (select auth.uid()));

-- Monedero y movimientos: solo lectura para el usuario. Solo el servidor (service role) escribe.
create policy "edavi_wallet_select_own" on public.edavi_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "edavi_ledger_select_own" on public.edavi_credit_ledger for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.edavi_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger edavi_generations_touch before update on public.edavi_generations
  for each row execute function public.edavi_touch_updated_at();

-- Almacenamiento propio: los resultados de Higgsfield caducan a los 7 días; aquí se guardan para siempre.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('edavi-media', 'edavi-media', true, 209715200, array['image/*', 'video/*', 'audio/*'])
on conflict (id) do nothing;

create policy "edavi_media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'edavi-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "edavi_media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'edavi-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "edavi_media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'edavi-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
