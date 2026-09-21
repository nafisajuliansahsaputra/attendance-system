create table if not exists public.device_terminal_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  token_hash text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  client_metadata jsonb not null default '{}'::jsonb,
  constraint device_terminal_session_token_hash_valid check (token_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint device_terminal_session_status_valid check (status in ('ACTIVE', 'EXPIRED', 'REVOKED')),
  constraint device_terminal_session_expiry_valid check (expires_at > created_at)
);

create unique index if not exists device_terminal_session_token_hash_unique_idx
  on public.device_terminal_sessions(token_hash);

create index if not exists device_terminal_session_device_idx
  on public.device_terminal_sessions(device_id);

create index if not exists device_terminal_session_institution_idx
  on public.device_terminal_sessions(institution_id);

create index if not exists device_terminal_session_expiry_idx
  on public.device_terminal_sessions(status, expires_at);

alter table public.device_terminal_sessions enable row level security;
revoke all on table public.device_terminal_sessions from public;
revoke all on table public.device_terminal_sessions from anon;
revoke all on table public.device_terminal_sessions from authenticated;
grant select, insert, update, delete on table public.device_terminal_sessions to service_role;

create or replace function public.claim_browser_terminal_pairing(
  p_code_hash text,
  p_session_hash text,
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
  v_had_credentials boolean;
  v_session public.device_terminal_sessions%rowtype;
  v_metadata jsonb;
begin
  if p_code_hash is null or p_code_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'PAIRING_CODE_INVALID';
  end if;

  if p_session_hash is null or p_session_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'INVALID_TERMINAL_SESSION_HASH';
  end if;

  if p_protocol_version is null or btrim(p_protocol_version) = '' then
    raise exception 'INVALID_PROTOCOL_VERSION';
  end if;

  update public.device_pairing_sessions
  set status = 'EXPIRED'
  where status = 'ACTIVE'
    and expires_at <= now();

  update public.device_terminal_sessions
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

  v_had_credentials :=
    v_device.secret_hash is not null
    or exists (
      select 1
      from public.device_terminal_sessions ts
      where ts.device_id = v_device.id
        and ts.status = 'ACTIVE'
        and ts.expires_at > now()
    );

  update public.device_terminal_sessions
  set status = 'REVOKED',
      revoked_at = now()
  where device_id = v_device.id
    and status = 'ACTIVE';

  v_metadata := coalesce(v_device.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'pairedClient',
      coalesce(p_client_metadata, '{}'::jsonb),
      'terminalRuntime',
      'BROWSER',
      'lastPairingAt',
      now()
    );

  update public.devices
  set secret_hash = null,
      paired_at = coalesce(paired_at, now()),
      credential_rotated_at = case
        when v_had_credentials then now()
        else credential_rotated_at
      end,
      last_seen_at = now(),
      last_heartbeat_at = now(),
      metadata = v_metadata,
      updated_at = now()
  where id = v_device.id
  returning * into v_device;

  insert into public.device_terminal_sessions (
    institution_id,
    device_id,
    token_hash,
    status,
    expires_at,
    last_seen_at,
    client_metadata
  ) values (
    v_device.institution_id,
    v_device.id,
    p_session_hash,
    'ACTIVE',
    now() + interval '30 days',
    now(),
    coalesce(p_client_metadata, '{}'::jsonb)
  )
  returning * into v_session;

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
    case when v_had_credentials then 'DEVICE_CREDENTIAL_ROTATED' else 'DEVICE_PAIRED' end,
    'device',
    v_device.id,
    jsonb_build_object(
      'pairingSessionId', v_pairing.id,
      'terminalSessionId', v_session.id,
      'runtime', 'BROWSER',
      'protocolVersion', v_device.protocol_version,
      'pairedAt', v_device.paired_at,
      'sessionExpiresAt', v_session.expires_at
    ),
    'Pairing code claimed by hosted browser terminal'
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
    'credentialRotated', v_had_credentials,
    'sessionExpiresAt', v_session.expires_at
  );
end;
$$;

create or replace function public.authenticate_terminal_session(
  p_session_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_session public.device_terminal_sessions%rowtype;
  v_device public.devices%rowtype;
begin
  if p_session_hash is null or p_session_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'TERMINAL_SESSION_AUTH_FAILED';
  end if;

  update public.device_terminal_sessions
  set status = 'EXPIRED'
  where status = 'ACTIVE'
    and expires_at <= now();

  select ts.* into v_session
  from public.device_terminal_sessions ts
  where ts.token_hash = p_session_hash
    and ts.status = 'ACTIVE'
    and ts.expires_at > now()
  for update;

  if not found then
    raise exception 'TERMINAL_SESSION_AUTH_FAILED';
  end if;

  select d.* into v_device
  from public.devices d
  where d.id = v_session.device_id
    and d.institution_id = v_session.institution_id
    and d.status = 'ACTIVE';

  if not found then
    update public.device_terminal_sessions
    set status = 'REVOKED',
        revoked_at = now()
    where id = v_session.id;

    raise exception 'TERMINAL_SESSION_AUTH_FAILED';
  end if;

  update public.device_terminal_sessions
  set last_seen_at = now()
  where id = v_session.id;

  update public.devices
  set last_seen_at = now(),
      updated_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'institutionId', v_device.institution_id,
    'code', v_device.code,
    'name', v_device.name,
    'deviceType', v_device.device_type,
    'protocolVersion', v_device.protocol_version,
    'sessionExpiresAt', v_session.expires_at
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

  update public.device_terminal_sessions
  set status = 'EXPIRED'
  where status = 'ACTIVE'
    and expires_at <= now();

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
        'secretConfigured',
          d.secret_hash is not null
          or exists (
            select 1
            from public.device_terminal_sessions ts
            where ts.device_id = d.id
              and ts.status = 'ACTIVE'
              and ts.expires_at > now()
          ),
        'pairingStatus', case
          when d.status = 'REVOKED' then 'REVOKED'
          when exists (
            select 1 from public.device_pairing_sessions ps
            where ps.device_id = d.id
              and ps.status = 'ACTIVE'
              and ps.expires_at > now()
          ) then 'WAITING'
          when d.secret_hash is not null
            or exists (
              select 1
              from public.device_terminal_sessions ts
              where ts.device_id = d.id
                and ts.status = 'ACTIVE'
                and ts.expires_at > now()
            ) then 'PAIRED'
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

  v_mode := case
    when v_device.secret_hash is not null
      or exists (
        select 1
        from public.device_terminal_sessions ts
        where ts.device_id = v_device.id
          and ts.status = 'ACTIVE'
          and ts.expires_at > now()
      )
    then 'ROTATE'
    else 'PAIR'
  end;

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

    update public.device_terminal_sessions
    set status = 'REVOKED',
        revoked_at = now()
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
      jsonb_build_object('status', v_before.status),
      jsonb_build_object('status', v_after.status),
      nullif(btrim(p_note), '')
    );
  end if;

  return jsonb_build_object(
    'id', v_after.id,
    'status', v_after.status,
    'secretConfigured',
      v_after.secret_hash is not null
      or exists (
        select 1
        from public.device_terminal_sessions ts
        where ts.device_id = v_after.id
          and ts.status = 'ACTIVE'
          and ts.expires_at > now()
      )
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
as $
declare
  v_pairing public.device_pairing_sessions%rowtype;
  v_device public.devices%rowtype;
  v_had_secret boolean;
  v_had_browser_session boolean;
  v_metadata jsonb;
begin
  if p_code_hash is null or p_code_hash !~ '^sha256:[0-9a-f]{64}(text, text, text, jsonb) from public;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from anon;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from authenticated;
grant execute on function public.claim_browser_terminal_pairing(text, text, text, jsonb) to service_role;

revoke all on function public.authenticate_terminal_session(text) from public;
revoke all on function public.authenticate_terminal_session(text) from anon;
revoke all on function public.authenticate_terminal_session(text) from authenticated;
grant execute on function public.authenticate_terminal_session(text) to service_role;
 then
    raise exception 'PAIRING_CODE_INVALID';
  end if;

  if p_secret_hash is null or p_secret_hash !~ '^sha256:[0-9a-f]{64}(text, text, text, jsonb) from public;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from anon;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from authenticated;
grant execute on function public.claim_browser_terminal_pairing(text, text, text, jsonb) to service_role;

revoke all on function public.authenticate_terminal_session(text) from public;
revoke all on function public.authenticate_terminal_session(text) from anon;
revoke all on function public.authenticate_terminal_session(text) from authenticated;
grant execute on function public.authenticate_terminal_session(text) to service_role;
 then
    raise exception 'INVALID_DEVICE_SECRET_HASH';
  end if;

  if p_protocol_version is null or btrim(p_protocol_version) = '' then
    raise exception 'INVALID_PROTOCOL_VERSION';
  end if;

  update public.device_pairing_sessions
  set status = 'EXPIRED'
  where status = 'ACTIVE'
    and expires_at <= now();

  update public.device_terminal_sessions
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
  v_had_browser_session := exists (
    select 1
    from public.device_terminal_sessions ts
    where ts.device_id = v_device.id
      and ts.status = 'ACTIVE'
      and ts.expires_at > now()
  );

  update public.device_terminal_sessions
  set status = 'REVOKED',
      revoked_at = now()
  where device_id = v_device.id
    and status = 'ACTIVE';

  v_metadata := coalesce(v_device.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'pairedClient',
      coalesce(p_client_metadata, '{}'::jsonb),
      'terminalRuntime',
      'HEADLESS',
      'lastPairingAt',
      now()
    );

  update public.devices
  set secret_hash = p_secret_hash,
      paired_at = coalesce(paired_at, now()),
      credential_rotated_at = case
        when v_had_secret or v_had_browser_session then now()
        else credential_rotated_at
      end,
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
    case
      when v_had_secret or v_had_browser_session then 'DEVICE_CREDENTIAL_ROTATED'
      else 'DEVICE_PAIRED'
    end,
    'device',
    v_device.id,
    jsonb_build_object(
      'pairingSessionId', v_pairing.id,
      'runtime', 'HEADLESS',
      'protocolVersion', v_device.protocol_version,
      'pairedAt', v_device.paired_at,
      'credentialRotatedAt', v_device.credential_rotated_at
    ),
    'Pairing code claimed by headless device'
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
    'credentialRotated', v_had_secret or v_had_browser_session
  );
end;
$;

revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from public;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from anon;
revoke all on function public.claim_browser_terminal_pairing(text, text, text, jsonb) from authenticated;
grant execute on function public.claim_browser_terminal_pairing(text, text, text, jsonb) to service_role;

revoke all on function public.authenticate_terminal_session(text) from public;
revoke all on function public.authenticate_terminal_session(text) from anon;
revoke all on function public.authenticate_terminal_session(text) from authenticated;
grant execute on function public.authenticate_terminal_session(text) to service_role;
