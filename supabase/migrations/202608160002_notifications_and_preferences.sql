-- Hydra Agro 1.2.3 — preferências completas e leitura de avisos.
-- Migração incremental. Execute depois de 202608160001_hydra_agro_plus.sql.

alter table public.profiles
  add column if not exists property_alerts boolean not null default true,
  add column if not exists admin_notices boolean not null default true;

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id text not null references public.admin_announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);

create index if not exists idx_notification_reads_user
  on public.notification_reads(user_id, read_at desc);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_self" on public.notification_reads;
create policy "notification_reads_select_self"
on public.notification_reads for select to authenticated
using (user_id = auth.uid() and public.is_active_user());

drop policy if exists "notification_reads_insert_self" on public.notification_reads;
create policy "notification_reads_insert_self"
on public.notification_reads for insert to authenticated
with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "notification_reads_update_self" on public.notification_reads;
create policy "notification_reads_update_self"
on public.notification_reads for update to authenticated
using (user_id = auth.uid() and public.is_active_user())
with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "notification_reads_delete_self" on public.notification_reads;
create policy "notification_reads_delete_self"
on public.notification_reads for delete to authenticated
using (user_id = auth.uid() and public.is_active_user());

grant select, insert, update, delete on public.notification_reads to authenticated;

-- O cliente segue sem permissão para alterar cargo, banimento ou plano.
revoke update on public.profiles from authenticated;
grant update (
  full_name, phone, avatar_path, bio, water_alerts, push_notifications,
  property_alerts, admin_notices, premium_goals, updated_at
) on public.profiles to authenticated;

-- Mantém avisos individuais e comunicados públicos atualizados no app aberto.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'admin_announcements'
    ) then
      alter publication supabase_realtime add table public.admin_announcements;
    end if;
  end if;
end $$;
