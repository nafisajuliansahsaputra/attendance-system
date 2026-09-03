create table if not exists public.device_verification_transactions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  request_id text not null,
  student_id uuid not null references public.students(id) on delete restrict,
  occurrence_id uuid not null references public.attendance_session_occurrences(id) on delete restrict,
  face_profile_id uuid not null references public.face_profiles(id) on delete restrict,
  rfid_uid text not null,
  occurred_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'PENDING',
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint device_verification_transaction_status_valid check (status in ('PENDING', 'CONSUMED', 'EXPIRED', 'CANCELLED')),
  constraint device_verification_transaction_expiry_valid check (expires_at > created_at - interval '5 seconds'),
  unique (device_id, request_id)
);

create index if not exists device_verification_transactions_expiry_idx
  on public.device_verification_transactions(status, expires_at);

alter table public.device_verification_transactions enable row level security;
revoke all on table public.device_verification_transactions from public;
revoke all on table public.device_verification_transactions from anon;
revoke all on table public.device_verification_transactions from authenticated;
grant select, insert, update, delete on table public.device_verification_transactions to service_role;

create or replace function public.authenticate_device(
  p_device_id uuid,
  p_secret_hash text,
  p_protocol_version text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_device public.devices%rowtype;
begin
  if p_device_id is null
     or p_secret_hash is null
     or p_secret_hash !~ '^sha256:[0-9a-f]{64}$'
     or p_protocol_version is null
     or btrim(p_protocol_version) = '' then
    raise exception 'DEVICE_AUTH_FAILED';
  end if;

  select d.* into v_device
  from public.devices d
  where d.id = p_device_id
    and d.status = 'ACTIVE'
    and d.secret_hash = p_secret_hash
    and d.protocol_version = p_protocol_version;

  if not found then
    raise exception 'DEVICE_AUTH_FAILED';
  end if;

  update public.devices
  set last_seen_at = now(), updated_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'institutionId', v_device.institution_id,
    'code', v_device.code,
    'name', v_device.name,
    'deviceType', v_device.device_type,
    'protocolVersion', v_device.protocol_version
  );
end;
$$;

create or replace function public.set_device_secret_hash(
  p_device_id uuid,
  p_secret_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_device public.devices%rowtype;
begin
  if p_secret_hash is null or p_secret_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'INVALID_DEVICE_SECRET_HASH';
  end if;

  update public.devices d
  set secret_hash = p_secret_hash,
      updated_at = now()
  where d.id = p_device_id
    and d.status <> 'REVOKED'
  returning d.* into v_device;

  if not found then
    raise exception 'DEVICE_NOT_FOUND_OR_REVOKED';
  end if;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'institutionId', v_device.institution_id,
    'code', v_device.code,
    'protocolVersion', v_device.protocol_version
  );
end;
$$;

create or replace function public.materialize_attendance_schedule_at(
  p_institution_id uuid,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_school_date date;
  v_result jsonb;
begin
  if p_occurred_at is null then
    raise exception 'OCCURRED_AT_REQUIRED';
  end if;

  select i.timezone into v_timezone
  from public.institutions i
  where i.id = p_institution_id;

  if v_timezone is null then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;

  v_school_date := (p_occurred_at at time zone v_timezone)::date;
  v_result := public.materialize_attendance_schedule_range(
    p_institution_id,
    v_school_date,
    v_school_date
  );

  return v_result || jsonb_build_object('schoolDate', v_school_date);
end;
$$;

create or replace function public.persist_device_stage_event(
  p_institution_id uuid,
  p_device_id uuid,
  p_request_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_student_id uuid default null,
  p_occurrence_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
begin
  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  if p_event_type not in ('RFID_SCANNED', 'UNKNOWN_CARD', 'NOT_ELIGIBLE', 'OUTSIDE_SESSION', 'ATTENDANCE_DUPLICATE', 'DEVICE_ERROR') then
    raise exception 'INVALID_STAGE_EVENT_TYPE';
  end if;

  if not exists (
    select 1 from public.devices d
    where d.id = p_device_id
      and d.institution_id = p_institution_id
      and d.status = 'ACTIVE'
  ) then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  insert into public.device_events (
    institution_id,
    device_id,
    request_id,
    event_type,
    occurred_at,
    student_id,
    occurrence_id,
    payload
  ) values (
    p_institution_id,
    p_device_id,
    p_request_id,
    p_event_type,
    p_occurred_at,
    p_student_id,
    p_occurrence_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (device_id, request_id, event_type)
    where request_id is not null
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select de.id into v_event_id
    from public.device_events de
    where de.device_id = p_device_id
      and de.request_id = p_request_id
      and de.event_type = p_event_type
    limit 1;
  end if;

  return v_event_id;
end;
$$;

create or replace function public.create_device_verification_transaction(
  p_institution_id uuid,
  p_device_id uuid,
  p_request_id text,
  p_student_id uuid,
  p_occurrence_id uuid,
  p_face_profile_id uuid,
  p_rfid_uid text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existing public.device_verification_transactions%rowtype;
  v_occurrence public.attendance_session_occurrences%rowtype;
  v_expires_at timestamptz;
  v_transaction_id uuid;
begin
  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  update public.device_verification_transactions
  set status = 'EXPIRED'
  where device_id = p_device_id
    and status = 'PENDING'
    and expires_at <= now();

  if not exists (
    select 1 from public.devices d
    where d.id = p_device_id
      and d.institution_id = p_institution_id
      and d.status = 'ACTIVE'
  ) then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  select o.* into v_occurrence
  from public.attendance_session_occurrences o
  join public.session_participants sp
    on sp.occurrence_id = o.id
   and sp.student_id = p_student_id
   and sp.eligibility = 'ELIGIBLE'
   and sp.required = true
  where o.id = p_occurrence_id
    and o.institution_id = p_institution_id
    and o.status <> 'CANCELLED'
    and p_occurred_at between o.opens_at and o.closes_at;

  if not found then
    raise exception 'VERIFICATION_SESSION_NOT_ELIGIBLE';
  end if;

  if not exists (
    select 1 from public.face_profiles f
    where f.id = p_face_profile_id
      and f.institution_id = p_institution_id
      and f.student_id = p_student_id
      and f.status = 'ACTIVE'
  ) then
    raise exception 'FACE_PROFILE_NOT_ACTIVE';
  end if;

  if exists (
    select 1 from public.attendance_records ar
    where ar.occurrence_id = p_occurrence_id
      and ar.student_id = p_student_id
  ) then
    raise exception 'ATTENDANCE_ALREADY_RECORDED';
  end if;

  select t.* into v_existing
  from public.device_verification_transactions t
  where t.device_id = p_device_id
    and t.request_id = p_request_id;

  if found then
    if v_existing.institution_id <> p_institution_id
       or v_existing.student_id <> p_student_id
       or v_existing.occurrence_id <> p_occurrence_id
       or v_existing.face_profile_id <> p_face_profile_id
       or v_existing.rfid_uid <> upper(btrim(p_rfid_uid)) then
      raise exception 'REQUEST_ID_REUSE_CONFLICT';
    end if;

    if v_existing.status <> 'PENDING' or v_existing.expires_at <= now() then
      raise exception 'VERIFICATION_TRANSACTION_NOT_ACTIVE';
    end if;

    return jsonb_build_object(
      'transactionId', v_existing.id,
      'expiresAt', v_existing.expires_at,
      'occurrenceId', v_existing.occurrence_id
    );
  end if;

  v_expires_at := least(v_occurrence.closes_at, now() + interval '2 minutes');
  if v_expires_at <= now() then
    raise exception 'VERIFICATION_SESSION_EXPIRED';
  end if;

  insert into public.device_verification_transactions (
    institution_id,
    device_id,
    request_id,
    student_id,
    occurrence_id,
    face_profile_id,
    rfid_uid,
    occurred_at,
    expires_at
  ) values (
    p_institution_id,
    p_device_id,
    p_request_id,
    p_student_id,
    p_occurrence_id,
    p_face_profile_id,
    upper(btrim(p_rfid_uid)),
    p_occurred_at,
    v_expires_at
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'transactionId', v_transaction_id,
    'expiresAt', v_expires_at,
    'occurrenceId', p_occurrence_id
  );
end;
$$;

revoke all on function public.authenticate_device(uuid, text, text) from public;
revoke all on function public.authenticate_device(uuid, text, text) from anon;
revoke all on function public.authenticate_device(uuid, text, text) from authenticated;
grant execute on function public.authenticate_device(uuid, text, text) to service_role;

revoke all on function public.set_device_secret_hash(uuid, text) from public;
revoke all on function public.set_device_secret_hash(uuid, text) from anon;
revoke all on function public.set_device_secret_hash(uuid, text) from authenticated;
grant execute on function public.set_device_secret_hash(uuid, text) to service_role;

revoke all on function public.materialize_attendance_schedule_at(uuid, timestamptz) from public;
revoke all on function public.materialize_attendance_schedule_at(uuid, timestamptz) from anon;
revoke all on function public.materialize_attendance_schedule_at(uuid, timestamptz) from authenticated;
grant execute on function public.materialize_attendance_schedule_at(uuid, timestamptz) to service_role;

revoke all on function public.persist_device_stage_event(uuid, uuid, text, text, timestamptz, uuid, uuid, jsonb) from public;
revoke all on function public.persist_device_stage_event(uuid, uuid, text, text, timestamptz, uuid, uuid, jsonb) from anon;
revoke all on function public.persist_device_stage_event(uuid, uuid, text, text, timestamptz, uuid, uuid, jsonb) from authenticated;
grant execute on function public.persist_device_stage_event(uuid, uuid, text, text, timestamptz, uuid, uuid, jsonb) to service_role;

revoke all on function public.create_device_verification_transaction(uuid, uuid, text, uuid, uuid, uuid, text, timestamptz) from public;
revoke all on function public.create_device_verification_transaction(uuid, uuid, text, uuid, uuid, uuid, text, timestamptz) from anon;
revoke all on function public.create_device_verification_transaction(uuid, uuid, text, uuid, uuid, uuid, text, timestamptz) from authenticated;
grant execute on function public.create_device_verification_transaction(uuid, uuid, text, uuid, uuid, uuid, text, timestamptz) to service_role;