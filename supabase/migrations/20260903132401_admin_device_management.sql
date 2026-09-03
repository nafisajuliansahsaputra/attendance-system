create or replace function public.get_admin_device_directory(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_role text;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role not in ('SYSTEM_ADMIN', 'OPERATOR') then
    raise exception 'FORBIDDEN_DEVICE_DIRECTORY';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'deviceType', d.device_type,
        'status', d.status,
        'protocolVersion', d.protocol_version,
        'lastSeenAt', d.last_seen_at,
        'secretConfigured', d.secret_hash is not null,
        'createdAt', d.created_at,
        'metadata', d.metadata,
        'pendingTransactions', (
          select count(*)
          from public.device_verification_transactions vt
          where vt.device_id = d.id
            and vt.status = 'PENDING'
            and vt.expires_at > now()
        ),
        'recentErrors24h', (
          select count(*)
          from public.device_events de
          where de.device_id = d.id
            and de.event_type = 'DEVICE_ERROR'
            and de.received_at >= now() - interval '24 hours'
        )
      )
      order by d.name, d.code
    )
    from public.devices d
    where d.institution_id = v_institution_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_admin_device(
  p_actor_user_id uuid,
  p_code text,
  p_name text,
  p_device_type text,
  p_protocol_version text default 'v1',
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_role text;
  v_code text;
  v_name text;
  v_protocol text;
  v_device public.devices%rowtype;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  v_name := btrim(coalesce(p_name, ''));
  v_protocol := btrim(coalesce(p_protocol_version, ''));

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{1,49}$' then
    raise exception 'INVALID_DEVICE_CODE';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'INVALID_DEVICE_NAME';
  end if;

  if p_device_type not in ('SIMULATOR', 'ARDUINO_BRIDGE', 'ESP32', 'OTHER') then
    raise exception 'INVALID_DEVICE_TYPE';
  end if;

  if v_protocol !~ '^v[0-9]+([.][0-9]+)?$' then
    raise exception 'INVALID_PROTOCOL_VERSION';
  end if;

  begin
    insert into public.devices (
      institution_id,
      code,
      name,
      device_type,
      status,
      protocol_version,
      secret_hash,
      metadata
    ) values (
      v_institution_id,
      v_code,
      v_name,
      p_device_type,
      'ACTIVE',
      v_protocol,
      null,
      '{}'::jsonb
    )
    returning * into v_device;
  exception
    when unique_violation then
      raise exception 'DEVICE_CODE_IN_USE';
  end;

  insert into public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    reason
  ) values (
    v_institution_id,
    p_actor_user_id,
    'DEVICE_CREATED',
    'device',
    v_device.id,
    jsonb_build_object(
      'code', v_device.code,
      'name', v_device.name,
      'deviceType', v_device.device_type,
      'status', v_device.status,
      'protocolVersion', v_device.protocol_version
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object(
    'id', v_device.id,
    'code', v_device.code,
    'name', v_device.name,
    'deviceType', v_device.device_type,
    'status', v_device.status,
    'protocolVersion', v_device.protocol_version,
    'secretConfigured', false
  );
end;
$$;

create or replace function public.set_admin_device_status(
  p_actor_user_id uuid,
  p_device_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_role text;
  v_before public.devices%rowtype;
  v_after public.devices%rowtype;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  if p_status not in ('ACTIVE', 'DISABLED', 'REVOKED') then
    raise exception 'INVALID_DEVICE_STATUS';
  end if;

  select d.* into v_before
  from public.devices d
  where d.id = p_device_id
    and d.institution_id = v_institution_id
  for update;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  if v_before.status = 'REVOKED' and p_status <> 'REVOKED' then
    raise exception 'REVOKED_DEVICE_CANNOT_REACTIVATE';
  end if;

  update public.devices d
  set status = p_status,
      secret_hash = case when p_status = 'REVOKED' then null else d.secret_hash end,
      updated_at = now()
  where d.id = p_device_id
  returning d.* into v_after;

  if p_status in ('DISABLED', 'REVOKED') then
    update public.device_verification_transactions
    set status = 'CANCELLED'
    where device_id = p_device_id
      and status = 'PENDING';
  end if;

  if v_before.status is distinct from v_after.status then
    insert into public.audit_logs (
      institution_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason
    ) values (
      v_institution_id,
      p_actor_user_id,
      'DEVICE_STATUS_CHANGED',
      'device',
      p_device_id,
      jsonb_build_object('status', v_before.status, 'secretConfigured', v_before.secret_hash is not null),
      jsonb_build_object('status', v_after.status, 'secretConfigured', v_after.secret_hash is not null),
      nullif(btrim(p_note), '')
    );
  end if;

  return jsonb_build_object(
    'id', v_after.id,
    'status', v_after.status,
    'secretConfigured', v_after.secret_hash is not null
  );
end;
$$;

revoke all on function public.get_admin_device_directory(uuid) from public;
revoke all on function public.get_admin_device_directory(uuid) from anon;
revoke all on function public.get_admin_device_directory(uuid) from authenticated;
grant execute on function public.get_admin_device_directory(uuid) to service_role;

revoke all on function public.create_admin_device(uuid, text, text, text, text, text) from public;
revoke all on function public.create_admin_device(uuid, text, text, text, text, text) from anon;
revoke all on function public.create_admin_device(uuid, text, text, text, text, text) from authenticated;
grant execute on function public.create_admin_device(uuid, text, text, text, text, text) to service_role;

revoke all on function public.set_admin_device_status(uuid, uuid, text, text) from public;
revoke all on function public.set_admin_device_status(uuid, uuid, text, text) from anon;
revoke all on function public.set_admin_device_status(uuid, uuid, text, text) from authenticated;
grant execute on function public.set_admin_device_status(uuid, uuid, text, text) to service_role;
