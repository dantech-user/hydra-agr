-- Hydra Agro+ — evolução incremental do perfil e da assinatura manual.
-- Esta migração deve ser executada depois de 202608150001_hydra_agro.sql.

alter table public.profiles
  add column if not exists premium_goals jsonb not null default '{}'::jsonb;

alter table public.properties
  add column if not exists location_details text,
  add column if not exists cover_path text;

alter table public.subscriptions
  add column if not exists premium_started_at timestamptz,
  add column if not exists premium_expires_at timestamptz,
  add column if not exists premium_deactivated_at timestamptz,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_premium_goals_object'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_premium_goals_object
      check (jsonb_typeof(premium_goals) = 'object');
  end if;
end $$;

update public.subscriptions
set premium_started_at = coalesce(premium_started_at, created_at)
where plan = 'plus' and premium_started_at is null;

-- O usuário pode manter somente as próprias metas. Plano e datas premium
-- continuam fora das permissões de escrita do cliente.
revoke update on public.profiles from authenticated;
grant update (
  full_name, phone, avatar_path, bio, water_alerts, push_notifications,
  premium_goals, updated_at
) on public.profiles to authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

create or replace function public.admin_set_subscription(
  target_user_id uuid,
  enable_plus boolean,
  premium_until timestamptz default null
)
returns void
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  if public.current_user_role() not in ('admin'::public.app_role, 'owner'::public.app_role) then
    raise exception 'Somente administrador ou proprietário pode alterar assinaturas'
      using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  if enable_plus and premium_until is not null and premium_until <= now() then
    raise exception 'A data final precisa estar no futuro';
  end if;

  if enable_plus then
    insert into public.subscriptions (
      user_id, plan, status, provider, provider_reference,
      current_period_end, premium_started_at, premium_expires_at,
      premium_deactivated_at, updated_by
    ) values (
      target_user_id, 'plus', 'active', 'manual_admin', auth.uid()::text,
      premium_until, now(), premium_until, null, auth.uid()
    )
    on conflict (user_id) do update set
      plan = 'plus',
      status = 'active',
      provider = 'manual_admin',
      provider_reference = auth.uid()::text,
      current_period_end = excluded.current_period_end,
      premium_started_at = now(),
      premium_expires_at = excluded.premium_expires_at,
      premium_deactivated_at = null,
      updated_by = auth.uid();

    insert into public.notifications (id, recipient_user_id, title, body, kind)
    values (
      'notification-' || gen_random_uuid()::text,
      target_user_id,
      'Hydra Agro+ ativado',
      'Seu acesso premium foi confirmado pela administração.',
      'subscription'
    );
  else
    insert into public.subscriptions (
      user_id, plan, status, provider, provider_reference,
      premium_deactivated_at, updated_by
    ) values (
      target_user_id, 'free', 'active', 'manual_admin', auth.uid()::text,
      now(), auth.uid()
    )
    on conflict (user_id) do update set
      plan = 'free',
      status = 'active',
      provider = 'manual_admin',
      provider_reference = auth.uid()::text,
      current_period_end = null,
      premium_expires_at = null,
      premium_deactivated_at = now(),
      updated_by = auth.uid();

    insert into public.notifications (id, recipient_user_id, title, body, kind)
    values (
      'notification-' || gen_random_uuid()::text,
      target_user_id,
      'Plano atualizado',
      'Sua conta voltou ao plano Gratuito. Seus dados permanecem preservados.',
      'subscription'
    );
  end if;

  insert into public.audit_logs (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    auth.uid(),
    case when enable_plus then 'subscription.activate' else 'subscription.deactivate' end,
    'subscription',
    target_user_id::text,
    jsonb_build_object('plus', enable_plus, 'premiumUntil', premium_until)
  );
end;
$$;

revoke all on function public.admin_set_subscription(uuid, boolean, timestamptz) from public;
grant execute on function public.admin_set_subscription(uuid, boolean, timestamptz) to authenticated;

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
      'activeSubscriptions', (
        select count(*) from public.subscriptions
        where plan = 'plus'
          and status = 'active'
          and (premium_expires_at is null or premium_expires_at > now())
      )
    ),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', coalesce(p.full_name, ''),
        'propertyName', pr.name,
        'municipality', pr.municipality,
        'role', coalesce(r.role, 'user'::public.app_role),
        'plan', case
          when s.plan = 'plus'
            and s.status = 'active'
            and (s.premium_expires_at is null or s.premium_expires_at > now())
          then 'Hydra Agro+' else 'Gratuito' end,
        'subscriptionStatus', coalesce(s.status, 'active'),
        'subscriptionCreatedAt', coalesce(s.created_at, u.created_at),
        'premiumStartedAt', s.premium_started_at,
        'premiumExpiresAt', s.premium_expires_at,
        'premiumDeactivatedAt', s.premium_deactivated_at,
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
        'active', active, 'startsAt', starts_at, 'endsAt', ends_at,
        'createdAt', created_at
      ) order by created_at desc)
      from public.admin_announcements
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'label', label, 'url', url, 'description', description,
        'active', active, 'position', position
      ) order by position, created_at)
      from public.admin_links
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Atualizações de assinatura chegam à conta conectada sem novo cadastro.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'subscriptions'
    ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
