create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'Sistema',
  action text not null,
  entity_type text not null,
  entity_id text,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_owner_created_idx
  on public.activity_log (owner_user_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_log_select_own" on public.activity_log;
create policy "activity_log_select_own"
  on public.activity_log
  for select
  to authenticated
  using (owner_user_id = auth.uid());

grant select on public.activity_log to authenticated;

create or replace function public.log_hydra_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  row_data jsonb;
  previous_data jsonb;
  owner_id uuid;
  actor_id uuid;
  actor_label text;
  action_label text;
  title_label text;
  detail_label text;
  item_id text;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;
  previous_data := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;

  owner_id := nullif(row_data->>'owner_user_id', '')::uuid;
  if owner_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  actor_id := auth.uid();
  if actor_id is null then actor_id := owner_id; end if;
  select full_name into actor_label from public.profiles where id = actor_id;
  actor_label := coalesce(nullif(actor_label, ''), 'Produtor');
  item_id := row_data->>'id';
  action_label := lower(tg_op);

  if tg_table_name = 'animals' then
    title_label := case tg_op when 'INSERT' then 'Animal cadastrado' when 'DELETE' then 'Animal removido' else 'Animal atualizado' end;
    detail_label := coalesce(nullif(row_data->>'name', ''), row_data->>'identification', 'Animal');
  elsif tg_table_name = 'water_records' then
    title_label := case tg_op when 'INSERT' then 'Água registrada' when 'DELETE' then 'Registro de água removido' else 'Registro de água atualizado' end;
    detail_label := concat_ws(' · ', nullif(row_data->>'amount', '') || ' L', nullif(row_data->>'purpose', ''));
  elsif tg_table_name = 'activities' then
    if tg_op = 'UPDATE'
      and coalesce((previous_data->>'done')::boolean, false) = false
      and coalesce((row_data->>'done')::boolean, false) = true then
      action_label := 'complete';
      title_label := 'Atividade concluída';
    else
      title_label := case tg_op when 'INSERT' then 'Atividade criada' when 'DELETE' then 'Atividade removida' else 'Atividade atualizada' end;
    end if;
    detail_label := coalesce(row_data->>'title', 'Atividade');
  elsif tg_table_name = 'monitoring_records' then
    title_label := case tg_op when 'INSERT' then 'Monitoramento registrado' when 'DELETE' then 'Monitoramento removido' else 'Monitoramento atualizado' end;
    detail_label := concat_ws(' · ', nullif(row_data->>'monitoring_type', ''), nullif(row_data->>'occurrence', ''));
  elsif tg_table_name = 'property_sectors' then
    title_label := case tg_op when 'INSERT' then 'Setor criado' when 'DELETE' then 'Setor removido' else 'Setor atualizado' end;
    detail_label := coalesce(row_data->>'name', 'Setor');
  elsif tg_table_name = 'nfc_tags' then
    if tg_op = 'UPDATE'
      and coalesce((row_data->>'read_count')::int, 0) > coalesce((previous_data->>'read_count')::int, 0) then
      action_label := 'read';
      title_label := 'Leitura NFC registrada';
    else
      title_label := case tg_op when 'INSERT' then 'NFC vinculada' when 'DELETE' then 'NFC desvinculada' else 'NFC atualizada' end;
    end if;
    detail_label := coalesce(row_data->>'code', 'Identificação eletrônica');
  elsif tg_table_name = 'properties' then
    title_label := case tg_op when 'INSERT' then 'Propriedade cadastrada' when 'DELETE' then 'Propriedade removida' else 'Propriedade atualizada' end;
    detail_label := coalesce(row_data->>'name', 'Propriedade');
  else
    title_label := 'Registro atualizado';
    detail_label := tg_table_name;
  end if;

  insert into public.activity_log (
    owner_user_id, actor_user_id, actor_name, action, entity_type, entity_id, title, detail
  ) values (
    owner_id, actor_id, actor_label, action_label, tg_table_name, item_id, title_label, nullif(detail_label, '')
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function public.log_hydra_activity() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['animals','water_records','activities','monitoring_records','property_sectors','nfc_tags','properties']
  loop
    execute format('drop trigger if exists hydra_activity_log_trigger on public.%I', table_name);
    execute format(
      'create trigger hydra_activity_log_trigger after insert or update or delete on public.%I for each row execute function public.log_hydra_activity()',
      table_name
    );
  end loop;
end $$;
