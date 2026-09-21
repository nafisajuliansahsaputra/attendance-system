alter table public.devices
  add column if not exists location text,
  add column if not exists paired_at timestamptz,
  add column if not exists credential_rotated_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz;

create table if not exists public.device_pairing_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  code_hash text not null,
  mode text not null default 'PAIR',
  status text not null default 'ACTIVE',
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  client_metadata jsonb not null default '{}'::jsonb,
  constraint device_pairing_code_hash_valid check (code_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint device_pairing_mode_valid check (mode in ('PAIR', 'ROTATE')),
  constraint device_pairing_status_valid check (status in ('ACTIVE', 'CLAIMED', 'EXPIRED', 'CANCELLED')),
  constraint device_pairing_expiry_valid check (expires_at > created_at)
);

create unique index if not exists device_pairing_active_per_device_idx
  on public.device_pairing_sessions(device_id)
  where status = 'ACTIVE';

create unique index if not exists device_pairing_code_hash_unique_idx
  on public.device_pairing_sessions(code_hash);

create index if not exists device_pairing_expiry_idx
  on public.device_pairing_sessions(status, expires_at);

alter table public.device_pairing_sessions enable row level security;
revoke all on table public.device_pairing_sessions from public;
revoke all on table public.device_pairing_sessions from anon;
revoke all on table public.device_pairing_sessions from authenticated;
grant select, insert, update, delete on table public.device_pairing_sessions to service_role;

create or replace function public.create_admin_device_v2(
  p_actor_user_id uuid,
  p_code text,
  p_name text,
  p_device_type text,
  p_protocol_version text default 'v1',
  p_location text default null,
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
  v_location text;
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
  v_location := nullif(btrim(coalesce(p_location, '')), '');

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

  if v_location is not null and char_length(v_location) > 120 then
    raise exception 'INVALID_DEVICE_LOCATION';
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
      location,
      metadata
    ) values (
      v_institution_id,
      v_code,
      v_name,
      p_device_type,
      'ACTIVE',
      v_protocol,
      null,
      v_location,
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
      'protocolVersion', v_device.protocol_version,
      'location', v_device.location
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
    'location', v_device.location,
    'secretConfigured', false
  );
end;
$$;

create or replace function public.create_admin_device_pairing(
  p_actor_user_id uuid,
  p_device_id uuid,
  p_code_hash text,
  p_expires_at timestamptz,
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
  v_device public.devices%rowtype;
  v_pairing public.device_pairing_sessions%rowtype;
  v_mode text;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  if p_code_hash is null or p_code_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'INVALID_PAIRING_CODE_HASH';
  end if;

  if p_expires_at is null
     or p_expires_at <= now() + interval '2 minutes'
     or p_expires_at > now() + interval '30 minutes' then
    raise exception 'INVALID_PAIRING_EXPIRY';
  end if;

  select d.* into v_device
  from public.devices d
  where d.id = p_device_id
    and d.institution_id = v_institution_id
  for update;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  if v_device.status = 'REVOKED' then
    raise exception 'REVOKED_DEVICE_CANNOT_PAIR';
  end if;

  update public.device_pairing_sessions
  set status = case when expires_at <= now() then 'EXPIRED' else 'CANCELLED' end,
      cancelled_at = case when expires_at > now() then now() else cancelled_at end
  where device_id = p_device_id
    and status = 'ACTIVE';

  v_mode := case when v_device.secret_hash is null then 'PAIR' else 'ROTATE' end;

  insert into public.device_pairing_sessions (
    institution_id,
    device_id,
    code_hash,
    mode,
    status,
    created_by,
    expires_at
  ) values (
    v_institution_id,
    p_device_id,
    p_code_hash,
    v_mode,
    'ACTIVE',
    p_actor_user_id,
    p_expires_at
  )
  returning * into v_pairing;

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
    'DEVICE_PAIRING_CODE_CREATED',
    'device',
    p_device_id,
    jsonb_build_object(
      'pairingSessionId', v_pairing.id,
      'mode', v_pairing.mode,
      'expiresAt', v_pairing.expires_at
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object(
    'pairingSessionId', v_pairing.id,
    'deviceId', v_pairing.device_id,
    'mode', v_pairing.mode,
    'expiresAt', v_pairing.expires_at
  );
end;
$$;

create or replace function public.cancel_admin_device_pairing(
  p_actor_user_id uuid,
  p_device_id uuid,
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
  v_count integer;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  if not exists (
    select 1 from public.devices d
    where d.id = p_device_id
      and d.institution_id = v_institution_id
  ) then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  update public.device_pairing_sessions
  set status = 'CANCELLED',
      cancelled_at = now()
  where device_id = p_device_id
    and status = 'ACTIVE';

  get diagnostics v_count = row_count;

  if v_count > 0 then
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
      'DEVICE_PAIRING_CANCELLED',
      'device',
      p_device_id,
      jsonb_build_object('cancelledSessions', v_count),
      nullif(btrim(p_note), '')
    );
  end if;

  return jsonb_build_object(
    'deviceId', p_device_id,
    'cancelled', v_count > 0
  );
end;
$$;

create or replace function public.claim_device_pairing(
  p_code_hash text,
  p_secret_hash text,
  p_protocol_version text,
  p_client_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_pairing public.device_pairing_sessions%rowtype;
  v_device public.devices%rowtype;
  v_had_secret boolean;
  v_metadata jsonb;
begin
  if p_code_hash is null or p_code_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'PAIRING_CODE_INVALID';
  end if;

  if p_secret_hash is null or p_secret_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'INVALID_DEVICE_SECRET_HASH';
  end if;

  if p_protocol_version is null or btrim(p_protocol_version) = '' then
    raise exception 'INVALID_PROTOCOL_VERSION';
  end if;

  update public.device_pairing_sessions
  set status = 'EXPIRED'
  where status = 'ACTIVE'
    and expires_at <= now();

  select ps.* into v_pairing
  from public.device_pairing_sessions ps
  where ps.code_hash = p_code_hash
    and ps.status = 'ACTIVE'
    and ps.expires_at > now()
  for update;

  if not found then
    raise exception 'PAIRING_CODE_INVALID';
  end if;

  select d.* into v_device
  from public.devices d
  where d.id = v_pairing.device_id
  for update;

  if not found
     or v_device.institution_id <> v_pairing.institution_id
     or v_device.status <> 'ACTIVE' then
    raise exception 'DEVICE_NOT_AVAILABLE_FOR_PAIRING';
  end if;

  if v_device.protocol_version <> btrim(p_protocol_version) then
    raise exception 'DEVICE_PROTOCOL_MISMATCH';
  end if;

  v_had_secret := v_device.secret_hash is not null;
  v_metadata := coalesce(v_device.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'pairedClient',
      coalesce(p_client_metadata, '{}'::jsonb),
      'lastPairingAt',
      now()
    );

  update public.devices
  set secret_hash = p_secret_hash,
      paired_at = coalesce(paired_at, now()),
      credential_rotated_at = case when v_had_secret then now() else credential_rotated_at end,
      last_seen_at = now(),
      last_heartbeat_at = now(),
      metadata = v_metadata,
      updated_at = now()
  where id = v_device.id
  returning * into v_device;

  update public.device_pairing_sessions
  set status = 'CLAIMED',
      claimed_at = now(),
      client_metadata = coalesce(p_client_metadata, '{}'::jsonb)
  where id = v_pairing.id;

  insert into public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    reason
  ) values (
    v_pairing.institution_id,
    v_pairing.created_by,
    case when v_had_secret then 'DEVICE_CREDENTIAL_ROTATED' else 'DEVICE_PAIRED' end,
    'device',
    v_device.id,
    jsonb_build_object(
      'pairingSessionId', v_pairing.id,
      'mode', v_pairing.mode,
      'protocolVersion', v_device.protocol_version,
      'pairedAt', v_device.paired_at,
      'credentialRotatedAt', v_device.credential_rotated_at
    ),
    'Pairing code claimed by device'
  );

  return jsonb_build_object(
    'deviceId', v_device.id,
    'institutionId', v_device.institution_id,
    'code', v_device.code,
    'name', v_device.name,
    'deviceType', v_device.device_type,
    'protocolVersion', v_device.protocol_version,
    'location', v_device.location,
    'pairedAt', v_device.paired_at,
    'credentialRotated', v_had_secret
  );
end;
$$;

create or replace function public.record_device_heartbeat(
  p_device_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_device public.devices%rowtype;
begin
  update public.devices d
  set last_seen_at = now(),
      last_heartbeat_at = now(),
      metadata = coalesce(d.metadata, '{}'::jsonb)
        || jsonb_build_object('runtime', coalesce(p_metadata, '{}'::jsonb)),
      updated_at = now()
  where d.id = p_device_id
    and d.status = 'ACTIVE'
  returning d.* into v_device;

  if not found then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.device_events de
    where de.device_id = p_device_id
      and de.event_type = 'DEVICE_HEARTBEAT'
      and de.received_at >= now() - interval '5 minutes'
  ) then
    insert into public.device_events (
      institution_id,
      device_id,
      event_type,
      occurred_at,
      payload
    ) values (
      v_device.institution_id,
      v_device.id,
      'DEVICE_HEARTBEAT',
      now(),
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'lastHeartbeatAt', v_device.last_heartbeat_at
  );
end;
$$;

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
        'location', d.location,
        'lastSeenAt', d.last_seen_at,
        'lastHeartbeatAt', d.last_heartbeat_at,
        'pairedAt', d.paired_at,
        'credentialRotatedAt', d.credential_rotated_at,
        'secretConfigured', d.secret_hash is not null,
        'pairingStatus', case
          when d.status = 'REVOKED' then 'REVOKED'
          when exists (
            select 1 from public.device_pairing_sessions ps
            where ps.device_id = d.id
              and ps.status = 'ACTIVE'
              and ps.expires_at > now()
          ) then 'WAITING'
          when d.secret_hash is not null then 'PAIRED'
          else 'UNPAIRED'
        end,
        'connectionStatus', case
          when d.status <> 'ACTIVE' then 'INACTIVE'
          when d.last_seen_at is null then 'NEVER'
          when d.last_seen_at >= now() - interval '90 seconds' then 'ONLINE'
          else 'OFFLINE'
        end,
        'pairingExpiresAt', (
          select ps.expires_at
          from public.device_pairing_sessions ps
          where ps.device_id = d.id
            and ps.status = 'ACTIVE'
            and ps.expires_at > now()
          order by ps.created_at desc
          limit 1
        ),
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
        ),
        'lastEventAt', (
          select max(de.received_at)
          from public.device_events de
          where de.device_id = d.id
        ),
        'lastAttendanceAt', (
          select max(ar.accepted_at)
          from public.attendance_records ar
          where ar.device_id = d.id
        )
      )
      order by d.name, d.code
    )
    from public.devices d
    where d.institution_id = v_institution_id
  ), '[]'::jsonb);
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

    update public.device_pairing_sessions
    set status = 'CANCELLED',
        cancelled_at = now()
    where device_id = p_device_id
      and status = 'ACTIVE';
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

revoke all on function public.create_admin_device_v2(uuid, text, text, text, text, text, text) from public;
revoke all on function public.create_admin_device_v2(uuid, text, text, text, text, text, text) from anon;
revoke all on function public.create_admin_device_v2(uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.create_admin_device_v2(uuid, text, text, text, text, text, text) to service_role;

revoke all on function public.create_admin_device_pairing(uuid, uuid, text, timestamptz, text) from public;
revoke all on function public.create_admin_device_pairing(uuid, uuid, text, timestamptz, text) from anon;
revoke all on function public.create_admin_device_pairing(uuid, uuid, text, timestamptz, text) from authenticated;
grant execute on function public.create_admin_device_pairing(uuid, uuid, text, timestamptz, text) to service_role;

revoke all on function public.cancel_admin_device_pairing(uuid, uuid, text) from public;
revoke all on function public.cancel_admin_device_pairing(uuid, uuid, text) from anon;
revoke all on function public.cancel_admin_device_pairing(uuid, uuid, text) from authenticated;
grant execute on function public.cancel_admin_device_pairing(uuid, uuid, text) to service_role;

revoke all on function public.claim_device_pairing(text, text, text, jsonb) from public;
revoke all on function public.claim_device_pairing(text, text, text, jsonb) from anon;
revoke all on function public.claim_device_pairing(text, text, text, jsonb) from authenticated;
grant execute on function public.claim_device_pairing(text, text, text, jsonb) to service_role;

revoke all on function public.record_device_heartbeat(uuid, jsonb) from public;
revoke all on function public.record_device_heartbeat(uuid, jsonb) from anon;
revoke all on function public.record_device_heartbeat(uuid, jsonb) from authenticated;
grant execute on function public.record_device_heartbeat(uuid, jsonb) to service_role;
