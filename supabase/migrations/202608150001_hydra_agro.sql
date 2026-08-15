-- Hydra Agro — banco multiusuário, permissões, comunidade e administração.
-- Execute no SQL Editor de um projeto Supabase novo ou com `supabase db push`.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('user', 'moderator', 'admin', 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_tier as enum ('free', 'plus');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.moderation_status as enum ('published', 'hidden', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.announcement_level as enum ('info', 'attention', 'critical');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  avatar_path text,
  bio text,
  water_alerts boolean not null default true,
  push_notifications boolean not null default true,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  municipality text not null default '',
  state text not null default 'BA' check (state = 'BA'),
  area numeric,
  area_unit text not null default 'hectares',
  property_type text not null default '',
  main_activity text not null default '',
  other_activities text[] not null default '{}',
  approximate_animals integer,
  water_kinds text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_supported_municipality check (
    municipality = '' or municipality = any(array[
      'Amargosa', 'Brejões', 'Milagres', 'Nova Itarana', 'Santa Inês', 'Ubaíra'
    ])
  )
);

create table if not exists public.property_sectors (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  name text not null,
  kind text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.animals (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  identification text not null,
  name text,
  species text not null,
  breed text,
  sex text,
  birth_date date,
  weight numeric,
  photo_path text,
  status text not null default 'Ativo',
  electronic_id text,
  notes text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, identification),
  unique (owner_user_id, electronic_id)
);

create table if not exists public.animal_identifications (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  animal_id text not null references public.animals(id) on delete cascade,
  identification_type text not null check (identification_type in ('NFC', 'RFID', 'MANUAL')),
  code text not null,
  active boolean not null default true,
  linked_at timestamptz not null default now(),
  unique (owner_user_id, code)
);

create table if not exists public.nfc_tags (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  animal_id text references public.animals(id) on delete set null,
  code text not null,
  technology text not null default 'NFC/RFID',
  last_read_at timestamptz,
  read_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_user_id, code)
);

create table if not exists public.water_sources (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  name text not null,
  source_type text not null,
  status text not null default 'ativa' check (status in ('ativa', 'atenção', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.water_records (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  source_id text not null references public.water_sources(id) on delete restrict,
  recorded_on date not null,
  amount numeric not null check (amount > 0),
  purpose text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  sector_id text references public.property_sectors(id) on delete set null,
  animal_id text references public.animals(id) on delete set null,
  title text not null,
  category text not null,
  activity_date date not null,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitoring_records (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  sector_id text references public.property_sectors(id) on delete set null,
  monitored_on date not null,
  monitoring_type text not null,
  duration text,
  note text,
  occurrence text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drones (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  identifier text not null,
  status text not null default 'offline' check (status in ('offline', 'ready', 'mission', 'maintenance')),
  battery integer check (battery between 0 and 100),
  sector_id text references public.property_sectors(id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drone_missions (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  drone_id text not null references public.drones(id) on delete restrict,
  sector_id text references public.property_sectors(id) on delete set null,
  mission text not null,
  status text not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  observations text,
  occurrences text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  property_id text references public.properties(id) on delete set null,
  body text not null default '',
  image_path text,
  moderation_status public.moderation_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(body)) > 0 or image_path is not null)
);

create table if not exists public.comments (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  moderation_status public.moderation_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.plan_tier not null default 'free',
  status text not null default 'active',
  provider text,
  provider_reference text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_announcements (
  id text primary key,
  title text not null,
  body text not null,
  level public.announcement_level not null default 'info',
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_links (
  id text primary key,
  label text not null,
  url text not null check (url ~ '^https://'),
  description text,
  active boolean not null default true,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','roles','properties','property_sectors','animals','water_sources',
    'water_records','activities','monitoring_records','drones','drone_missions',
    'posts','comments','subscriptions','admin_announcements','admin_links'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.current_user_role()
returns public.app_role
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select role from public.roles where user_id = auth.uid()), 'user'::public.app_role);
$$;

create or replace function public.has_admin_role()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() in ('moderator', 'admin', 'owner');
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and banned_at is null);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  property_data jsonb := coalesce(new.raw_user_meta_data -> 'property', '{}'::jsonb);
  assigned_role public.app_role := case
    when lower(coalesce(new.email, '')) = 'danqxy7@gmail.com' then 'owner'::public.app_role
    else 'user'::public.app_role
  end;
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  ) on conflict (id) do nothing;

  insert into public.roles (user_id, role)
  values (new.id, assigned_role)
  on conflict (user_id) do update set role = case
    when excluded.role = 'owner' then 'owner'::public.app_role
    else public.roles.role
  end;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  insert into public.properties (
    id, owner_user_id, name, municipality, state, area, area_unit,
    property_type, main_activity, other_activities, approximate_animals, water_kinds
  ) values (
    'property-' || new.id::text,
    new.id,
    coalesce(property_data ->> 'name', ''),
    coalesce(property_data ->> 'municipality', ''),
    'BA',
    nullif(property_data ->> 'area', '')::numeric,
    coalesce(property_data ->> 'areaUnit', 'hectares'),
    coalesce(property_data ->> 'type', ''),
    coalesce(property_data ->> 'mainActivity', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(property_data -> 'otherActivities', '[]'::jsonb))), '{}'),
    nullif(property_data ->> 'approximateAnimals', '')::integer,
    coalesce(array(select jsonb_array_elements_text(coalesce(property_data -> 'waterKinds', '[]'::jsonb))), '{}')
  ) on conflict (owner_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Garante o papel do proprietário mesmo se a conta já existia antes da migração.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

insert into public.roles (user_id, role)
select id, case when lower(coalesce(email, '')) = 'danqxy7@gmail.com' then 'owner'::public.app_role else 'user'::public.app_role end
from auth.users
on conflict (user_id) do update set role = case
  when excluded.role = 'owner' then 'owner'::public.app_role
  else public.roles.role
end;

insert into public.subscriptions (user_id, plan, status)
select id, 'free', 'active' from auth.users
on conflict (user_id) do nothing;

insert into public.properties (id, owner_user_id)
select 'property-' || id::text, id from auth.users
on conflict (owner_user_id) do nothing;

-- Índices usados pelas telas e pelas políticas.
create index if not exists idx_animals_owner on public.animals(owner_user_id);
create index if not exists idx_water_records_owner_date on public.water_records(owner_user_id, recorded_on desc);
create index if not exists idx_activities_owner_date on public.activities(owner_user_id, activity_date desc);
create index if not exists idx_monitoring_owner_date on public.monitoring_records(owner_user_id, monitored_on desc);
create index if not exists idx_posts_status_date on public.posts(moderation_status, created_at desc);
create index if not exists idx_comments_post on public.comments(post_id, created_at);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id, created_at desc);

-- RLS: dados privados pertencem sempre ao usuário/propriedade autenticados.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.properties enable row level security;
alter table public.property_sectors enable row level security;
alter table public.animals enable row level security;
alter table public.animal_identifications enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.water_sources enable row level security;
alter table public.water_records enable row level security;
alter table public.activities enable row level security;
alter table public.monitoring_records enable row level security;
alter table public.drones enable row level security;
alter table public.drone_missions enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_announcements enable row level security;
alter table public.admin_links enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_admin_role());
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid() and public.is_active_user())
with check (id = auth.uid() and public.is_active_user());

create policy "roles_select_self_or_admin" on public.roles for select to authenticated
using (user_id = auth.uid() or public.has_admin_role());

create policy "properties_owner_or_admin" on public.properties for all to authenticated
using ((owner_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role())
with check ((owner_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'property_sectors','animals','animal_identifications','nfc_tags','water_sources',
    'water_records','activities','monitoring_records','drones','drone_missions'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((owner_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role()) with check ((owner_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role())',
      table_name || '_owner_or_admin', table_name
    );
  end loop;
end $$;

create policy "posts_read_published" on public.posts for select to authenticated
using ((moderation_status = 'published' and public.is_active_user()) or author_user_id = auth.uid() or public.has_admin_role());
create policy "posts_insert_own" on public.posts for insert to authenticated
with check (author_user_id = auth.uid() and public.is_active_user() and moderation_status = 'published');
create policy "posts_update_own_or_admin" on public.posts for update to authenticated
using ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role())
with check ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());
create policy "posts_delete_own_or_admin" on public.posts for delete to authenticated
using ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());

create policy "comments_read_published" on public.comments for select to authenticated
using ((moderation_status = 'published' and public.is_active_user()) or author_user_id = auth.uid() or public.has_admin_role());
create policy "comments_insert_own" on public.comments for insert to authenticated
with check (author_user_id = auth.uid() and public.is_active_user() and moderation_status = 'published');
create policy "comments_update_own_or_admin" on public.comments for update to authenticated
using ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role())
with check ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());
create policy "comments_delete_own_or_admin" on public.comments for delete to authenticated
using ((author_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());

create policy "likes_active_users" on public.likes for all to authenticated
using ((user_id = auth.uid() and public.is_active_user()) or public.has_admin_role())
with check (user_id = auth.uid() and public.is_active_user());

create policy "subscriptions_select_self_or_admin" on public.subscriptions for select to authenticated
using (user_id = auth.uid() or public.has_admin_role());

create policy "notifications_select_self_or_admin" on public.notifications for select to authenticated
using ((recipient_user_id = auth.uid() and public.is_active_user()) or public.has_admin_role());
create policy "notifications_update_self" on public.notifications for update to authenticated
using (recipient_user_id = auth.uid() and public.is_active_user())
with check (recipient_user_id = auth.uid() and public.is_active_user());

create policy "announcements_read_active_or_admin" on public.admin_announcements for select to authenticated
using ((active and coalesce(starts_at <= now(), true) and coalesce(ends_at >= now(), true) and public.is_active_user()) or public.has_admin_role());
create policy "announcements_admin_write" on public.admin_announcements for all to authenticated
using (public.has_admin_role()) with check (public.has_admin_role());

create policy "links_read_active_or_admin" on public.admin_links for select to authenticated
using ((active and public.is_active_user()) or public.has_admin_role());
create policy "links_admin_write" on public.admin_links for all to authenticated
using (public.has_admin_role()) with check (public.has_admin_role());

create policy "settings_admin" on public.app_settings for all to authenticated
using (public.has_admin_role()) with check (public.has_admin_role());
create policy "audit_admin_read" on public.audit_logs for select to authenticated
using (public.has_admin_role());

-- Usuários não podem remover o próprio banimento ou se promover pela API REST.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_path, bio, water_alerts, push_notifications, updated_at) on public.profiles to authenticated;
revoke insert, update, delete on public.roles from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare result jsonb;
begin
  if not public.has_admin_role() then
    raise exception 'Acesso administrativo negado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'properties', (select count(*) from public.properties where name <> ''),
      'animals', (select count(*) from public.animals),
      'waterRecords', (select count(*) from public.water_records),
      'posts', (select count(*) from public.posts where moderation_status = 'published'),
      'activeSubscriptions', (select count(*) from public.subscriptions where plan = 'plus' and status = 'active')
    ),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', p.full_name,
        'propertyName', pr.name,
        'municipality', pr.municipality,
        'role', r.role,
        'plan', case when s.plan = 'plus' then 'Hydra Agro+' else 'Gratuito' end,
        'createdAt', u.created_at,
        'bannedAt', p.banned_at,
        'banReason', p.ban_reason
      ) order by u.created_at desc)
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.properties pr on pr.owner_user_id = u.id
      left join public.roles r on r.user_id = u.id
      left join public.subscriptions s on s.user_id = u.id
    ), '[]'::jsonb),
    'announcements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'body', body, 'level', level,
        'active', active, 'startsAt', starts_at, 'endsAt', ends_at, 'createdAt', created_at
      ) order by created_at desc) from public.admin_announcements
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'label', label, 'url', url, 'description', description,
        'active', active, 'position', position
      ) order by position, created_at) from public.admin_links
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_set_user_ban(target_user_id uuid, should_ban boolean, reason text default null)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_admin_role() then
    raise exception 'Acesso administrativo negado' using errcode = '42501';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Você não pode bloquear a própria conta';
  end if;
  if exists(select 1 from public.roles where user_id = target_user_id and role = 'owner') then
    raise exception 'A conta proprietária não pode ser bloqueada';
  end if;

  update public.profiles
  set banned_at = case when should_ban then now() else null end,
      ban_reason = case when should_ban then nullif(trim(reason), '') else null end
  where id = target_user_id;

  insert into public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), case when should_ban then 'user.ban' else 'user.unban' end, 'user', target_user_id::text, jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.admin_set_user_role(target_user_id uuid, next_role public.app_role)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Somente o proprietário pode alterar permissões' using errcode = '42501';
  end if;
  if next_role = 'owner' then
    raise exception 'O papel owner é reservado à conta proprietária';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Você não pode alterar o próprio papel';
  end if;

  update public.roles set role = next_role where user_id = target_user_id and role <> 'owner';
  insert into public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'user.role', 'user', target_user_id::text, jsonb_build_object('role', next_role));
end;
$$;

create or replace function public.admin_send_notification(target_user_id uuid, notification_title text, notification_body text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_admin_role() then
    raise exception 'Acesso administrativo negado' using errcode = '42501';
  end if;
  insert into public.notifications(id, recipient_user_id, title, body, kind)
  values ('notification-' || gen_random_uuid()::text, target_user_id, trim(notification_title), trim(notification_body), 'admin');
  insert into public.audit_logs(actor_user_id, action, target_type, target_id)
  values (auth.uid(), 'notification.send', 'user', target_user_id::text);
end;
$$;

create or replace function public.admin_moderate_post(target_post_id text, next_status public.moderation_status)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_admin_role() then
    raise exception 'Acesso administrativo negado' using errcode = '42501';
  end if;
  update public.posts set moderation_status = next_status where id = target_post_id;
  insert into public.audit_logs(actor_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'post.moderate', 'post', target_post_id, jsonb_build_object('status', next_status));
end;
$$;

create or replace function public.community_feed()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not public.is_active_user() then
    raise exception 'Conta sem acesso ao feed' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', post.id,
    'authorId', post.author_user_id,
    'author', profile.full_name,
    'authorAvatarPath', profile.avatar_path,
    'propertyName', property.name,
    'municipality', property.municipality,
    'text', post.body,
    'date', post.created_at,
    'imagePath', post.image_path,
    'likes', (select count(*) from public.likes like_row where like_row.post_id = post.id),
    'liked', exists(select 1 from public.likes own_like where own_like.post_id = post.id and own_like.user_id = auth.uid()),
    'moderationStatus', post.moderation_status,
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', comment.id,
        'authorId', comment.author_user_id,
        'author', comment_profile.full_name,
        'text', comment.body,
        'date', comment.created_at
      ) order by comment.created_at)
      from public.comments comment
      left join public.profiles comment_profile on comment_profile.id = comment.author_user_id
      where comment.post_id = post.id and comment.moderation_status = 'published'
    ), '[]'::jsonb)
  ) order by post.created_at desc), '[]'::jsonb)
  into result
  from public.posts post
  left join public.profiles profile on profile.id = post.author_user_id
  left join public.properties property on property.id = post.property_id
  where post.moderation_status = 'published';

  return result;
end;
$$;

create or replace function public.record_nfc_read(tag_code text)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare affected integer;
begin
  if not public.is_active_user() then
    raise exception 'Conta sem acesso à leitura NFC' using errcode = '42501';
  end if;
  update public.nfc_tags
  set last_read_at = now(), read_count = read_count + 1
  where owner_user_id = auth.uid() and lower(code) = lower(trim(tag_code));
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_set_user_ban(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_send_notification(uuid, text, text) to authenticated;
grant execute on function public.admin_moderate_post(text, public.moderation_status) to authenticated;
grant execute on function public.community_feed() to authenticated;
grant execute on function public.record_nfc_read(text) to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_path, bio, water_alerts, push_notifications, updated_at) on public.profiles to authenticated;
revoke insert, update, delete on public.roles from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

-- Buckets e regras de mídia. O primeiro diretório do caminho deve ser o auth.uid().
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('community-media', 'community-media', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('farm-media', 'farm-media', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
create policy "avatars_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()))
with check (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));

create policy "community_media_public_read" on storage.objects for select using (bucket_id = 'community-media');
create policy "community_media_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
create policy "community_media_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'community-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));
create policy "community_media_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'community-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));

create policy "farm_media_private_read" on storage.objects for select to authenticated
using (bucket_id = 'farm-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));
create policy "farm_media_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'farm-media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
create policy "farm_media_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'farm-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));
create policy "farm_media_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'farm-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_admin_role()));
