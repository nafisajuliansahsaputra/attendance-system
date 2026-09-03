create or replace function public.persist_resolved_attendance_attempt(
  p_institution_id uuid,
  p_device_id uuid,
  p_request_id text,
  p_occurred_at timestamptz,
  p_student_id uuid default null,
  p_occurrence_id uuid default null,
  p_rfid_uid text default null,
  p_verification_result text default null,
  p_verification_score numeric default null,
  p_model_version text default null,
  p_outcome_code text default null,
  p_accepted boolean default false
)
returns table (
  device_event_id uuid,
  verification_attempt_id uuid,
  attendance_record_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
  v_event_id uuid;
  v_verification_id uuid;
  v_attendance_id uuid;
  v_rfid_id uuid;
  v_attendance_status text;
begin
  if p_institution_id is null or p_device_id is null then
    raise exception 'institution and device are required';
  end if;

  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'request_id is required';
  end if;

  if p_occurred_at is null then
    raise exception 'occurred_at is required';
  end if;

  if not exists (
    select 1 from public.devices d
    where d.id = p_device_id
      and d.institution_id = p_institution_id
      and d.status = 'ACTIVE'
  ) then
    raise exception 'device is not active for institution';
  end if;

  if p_accepted and p_outcome_code not in ('ACCEPTED_ON_TIME', 'ACCEPTED_LATE') then
    raise exception 'accepted attempt has inconsistent outcome code';
  end if;

  if not p_accepted and p_outcome_code in ('ACCEPTED_ON_TIME', 'ACCEPTED_LATE') then
    raise exception 'rejected attempt has inconsistent outcome code';
  end if;

  if p_accepted and (p_student_id is null or p_occurrence_id is null) then
    raise exception 'accepted attendance requires student and occurrence';
  end if;

  if p_student_id is not null and not exists (
    select 1 from public.students s
    where s.id = p_student_id and s.institution_id = p_institution_id
  ) then
    raise exception 'student does not belong to institution';
  end if;

  if p_occurrence_id is not null and not exists (
    select 1 from public.attendance_session_occurrences o
    where o.id = p_occurrence_id and o.institution_id = p_institution_id
  ) then
    raise exception 'occurrence does not belong to institution';
  end if;

  if p_rfid_uid is not null then
    select r.id into v_rfid_id
    from public.rfid_credentials r
    where r.institution_id = p_institution_id
      and r.uid = p_rfid_uid
      and r.status = 'ACTIVE'
      and (p_student_id is null or r.student_id = p_student_id)
    limit 1;
  end if;

  v_event_type := case p_outcome_code
    when 'ACCEPTED_ON_TIME' then 'ATTENDANCE_ACCEPTED'
    when 'ACCEPTED_LATE' then 'ATTENDANCE_ACCEPTED'
    when 'UNKNOWN_CARD' then 'UNKNOWN_CARD'
    when 'FACE_MISMATCH' then 'FACE_REJECTED'
    when 'FACE_SERVICE_ERROR' then 'DEVICE_ERROR'
    when 'NO_ACTIVE_SESSION' then 'OUTSIDE_SESSION'
    when 'NOT_ELIGIBLE' then 'NOT_ELIGIBLE'
    when 'DUPLICATE' then 'ATTENDANCE_DUPLICATE'
    when 'OUTSIDE_SESSION_WINDOW' then 'OUTSIDE_SESSION'
    else 'DEVICE_ERROR'
  end;

  select e.id into v_event_id
  from public.device_events e
  where e.device_id = p_device_id
    and e.request_id = p_request_id
    and e.event_type = v_event_type
  limit 1;

  if v_event_id is null then
    insert into public.device_events (
      institution_id, device_id, request_id, event_type, occurred_at,
      student_id, occurrence_id, rfid_credential_id, payload
    ) values (
      p_institution_id, p_device_id, p_request_id, v_event_type, p_occurred_at,
      p_student_id, p_occurrence_id, v_rfid_id,
      jsonb_strip_nulls(jsonb_build_object(
        'outcome_code', p_outcome_code,
        'accepted', p_accepted,
        'rfid_uid', p_rfid_uid,
        'verification_result', p_verification_result,
        'verification_score', p_verification_score,
        'model_version', p_model_version
      ))
    )
    returning id into v_event_id;
  end if;

  if p_student_id is not null and p_verification_result is not null then
    if p_verification_result not in ('MATCH', 'MISMATCH', 'NO_FACE', 'LOW_QUALITY', 'SERVICE_ERROR', 'NOT_REQUIRED') then
      raise exception 'unsupported verification result';
    end if;

    select v.id into v_verification_id
    from public.verification_attempts v
    where v.institution_id = p_institution_id
      and v.request_id = p_request_id
    limit 1;

    if v_verification_id is null then
      insert into public.verification_attempts (
        institution_id, request_id, device_id, device_event_id, occurrence_id,
        expected_student_id, result, score, model_version, attempted_at, metadata
      ) values (
        p_institution_id, p_request_id, p_device_id, v_event_id, p_occurrence_id,
        p_student_id, p_verification_result, p_verification_score, p_model_version,
        p_occurred_at, jsonb_build_object('outcome_code', p_outcome_code)
      )
      returning id into v_verification_id;
    end if;
  end if;

  if p_accepted then
    v_attendance_status := case p_outcome_code
      when 'ACCEPTED_LATE' then 'LATE'
      else 'ON_TIME'
    end;

    select a.id into v_attendance_id
    from public.attendance_records a
    where a.occurrence_id = p_occurrence_id
      and a.student_id = p_student_id
    limit 1;

    if v_attendance_id is null then
      insert into public.attendance_records (
        institution_id, occurrence_id, student_id, device_id,
        verification_attempt_id, attendance_status, accepted_at, source
      ) values (
        p_institution_id, p_occurrence_id, p_student_id, p_device_id,
        v_verification_id, v_attendance_status, p_occurred_at, 'DEVICE'
      )
      returning id into v_attendance_id;
    end if;
  end if;

  return query select v_event_id, v_verification_id, v_attendance_id;
end;
$$;

revoke all on function public.persist_resolved_attendance_attempt(uuid, uuid, text, timestamptz, uuid, uuid, text, text, numeric, text, text, boolean) from public;
revoke all on function public.persist_resolved_attendance_attempt(uuid, uuid, text, timestamptz, uuid, uuid, text, text, numeric, text, text, boolean) from anon;
revoke all on function public.persist_resolved_attendance_attempt(uuid, uuid, text, timestamptz, uuid, uuid, text, text, numeric, text, text, boolean) from authenticated;
grant execute on function public.persist_resolved_attendance_attempt(uuid, uuid, text, timestamptz, uuid, uuid, text, text, numeric, text, text, boolean) to service_role;
