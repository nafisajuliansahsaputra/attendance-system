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
        'secretConfigured', case
          when coalesce(d.metadata->>'terminalRuntime', '') = 'BROWSER' then exists (
            select 1
            from public.device_terminal_sessions ts
            where ts.device_id = d.id
              and ts.status = 'ACTIVE'
              and ts.expires_at > now()
          )
          else d.secret_hash is not null
        end,
        'pairingStatus', case
          when d.status = 'REVOKED' then 'REVOKED'
          when exists (
            select 1
            from public.device_pairing_sessions ps
            where ps.device_id = d.id
              and ps.status = 'ACTIVE'
              and ps.expires_at > now()
          ) then 'WAITING'
          when coalesce(d.metadata->>'terminalRuntime', '') = 'BROWSER'
            and exists (
              select 1
              from public.device_terminal_sessions ts
              where ts.device_id = d.id
                and ts.status = 'ACTIVE'
                and ts.expires_at > now()
            ) then 'PAIRED'
          when coalesce(d.metadata->>'terminalRuntime', '') <> 'BROWSER'
            and d.secret_hash is not null then 'PAIRED'
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
