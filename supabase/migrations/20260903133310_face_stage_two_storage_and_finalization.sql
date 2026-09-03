alter table public.face_profiles
  add column if not exists embedding real[],
  add column if not exists embedding_dimensions smallint,
  add column if not exists quality_score numeric(8,6);

alter table public.face_profiles
  drop constraint if exists face_profile_embedding_consistency;

alter table public.face_profiles
  add constraint face_profile_embedding_consistency check (
    (embedding is null and embedding_dimensions is null)
    or (
      embedding is not null
      and embedding_dimensions is not null
      and embedding_dimensions = cardinality(embedding)
      and embedding_dimensions between 32 and 2048
    )
  );

create or replace function public.enroll_admin_face_profile(
  p_actor_user_id uuid,
  p_student_id uuid,
  p_model_name text,
  p_model_version text,
  p_embedding real[],
  p_quality_score numeric,
  p_template_fingerprint text,
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
  v_profile public.face_profiles%rowtype;
begin
  select p.institution_id, p.role into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id = p_student_id and s.institution_id = v_institution_id and s.is_active = true
  ) then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  if p_model_name is null or btrim(p_model_name) = '' or p_model_version is null or btrim(p_model_version) = '' then
    raise exception 'FACE_MODEL_REQUIRED';
  end if;

  if p_embedding is null or cardinality(p_embedding) < 32 or cardinality(p_embedding) > 2048 then
    raise exception 'INVALID_FACE_EMBEDDING';
  end if;

  if p_quality_score is not null and (p_quality_score < 0 or p_quality_score > 1) then
    raise exception 'INVALID_FACE_QUALITY_SCORE';
  end if;

  if p_template_fingerprint is null or p_template_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_FACE_TEMPLATE_FINGERPRINT';
  end if;

  update public.face_profiles
  set status = 'REVOKED', revoked_at = now(), updated_at = now()
  where institution_id = v_institution_id and student_id = p_student_id and status = 'ACTIVE';

  insert into public.face_profiles (
    institution_id, student_id, status, model_name, model_version,
    template_reference, template_fingerprint, embedding, embedding_dimensions,
    quality_score, enrolled_by, enrolled_at
  ) values (
    v_institution_id, p_student_id, 'ACTIVE', btrim(p_model_name), btrim(p_model_version),
    null, p_template_fingerprint, p_embedding, cardinality(p_embedding),
    p_quality_score, p_actor_user_id, now()
  ) returning * into v_profile;

  insert into public.audit_logs (
    institution_id, actor_user_id, action, entity_type, entity_id, after_data, reason
  ) values (
    v_institution_id, p_actor_user_id, 'FACE_PROFILE_ENROLLED', 'face_profile', v_profile.id,
    jsonb_build_object(
      'studentId', p_student_id,
      'modelName', v_profile.model_name,
      'modelVersion', v_profile.model_version,
      'embeddingDimensions', v_profile.embedding_dimensions,
      'qualityScore', v_profile.quality_score,
      'templateFingerprint', v_profile.template_fingerprint
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object(
    'faceProfileId', v_profile.id,
    'studentId', v_profile.student_id,
    'modelName', v_profile.model_name,
    'modelVersion', v_profile.model_version,
    'embeddingDimensions', v_profile.embedding_dimensions,
    'qualityScore', v_profile.quality_score,
    'templateFingerprint', v_profile.template_fingerprint,
    'enrolledAt', v_profile.enrolled_at
  );
end;
$$;

create or replace function public.get_device_verification_payload(
  p_device_id uuid,
  p_transaction_id uuid,
  p_request_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx public.device_verification_transactions%rowtype;
  v_face public.face_profiles%rowtype;
  v_occurrence public.attendance_session_occurrences%rowtype;
  v_student public.students%rowtype;
  v_class_name text;
begin
  update public.device_verification_transactions
  set status = 'EXPIRED'
  where id = p_transaction_id and status = 'PENDING' and expires_at <= now();

  select t.* into v_tx
  from public.device_verification_transactions t
  where t.id = p_transaction_id
    and t.device_id = p_device_id
    and t.request_id = p_request_id
    and t.status = 'PENDING'
    and t.expires_at > now();

  if not found then raise exception 'VERIFICATION_TRANSACTION_NOT_ACTIVE'; end if;

  select f.* into v_face
  from public.face_profiles f
  where f.id = v_tx.face_profile_id
    and f.student_id = v_tx.student_id
    and f.institution_id = v_tx.institution_id
    and f.status = 'ACTIVE'
    and f.embedding is not null;

  if not found then raise exception 'FACE_TEMPLATE_NOT_AVAILABLE'; end if;

  select o.* into v_occurrence
  from public.attendance_session_occurrences o
  where o.id = v_tx.occurrence_id
    and o.institution_id = v_tx.institution_id
    and o.status <> 'CANCELLED';

  if not found then raise exception 'VERIFICATION_OCCURRENCE_NOT_AVAILABLE'; end if;

  select s.* into v_student
  from public.students s
  where s.id = v_tx.student_id and s.institution_id = v_tx.institution_id;

  select c.name into v_class_name
  from public.session_participants sp
  left join public.student_enrollments e on e.id = sp.enrollment_id
  left join public.classes c on c.id = e.class_id
  where sp.occurrence_id = v_tx.occurrence_id and sp.student_id = v_tx.student_id
  limit 1;

  return jsonb_build_object(
    'transactionId', v_tx.id,
    'institutionId', v_tx.institution_id,
    'deviceId', v_tx.device_id,
    'requestId', v_tx.request_id,
    'rfidUid', v_tx.rfid_uid,
    'occurredAt', v_tx.occurred_at,
    'expiresAt', v_tx.expires_at,
    'student', jsonb_build_object('id', v_student.id, 'name', v_student.full_name, 'className', coalesce(v_class_name, 'Tanpa kelas')),
    'session', jsonb_build_object(
      'id', v_occurrence.id,
      'name', v_occurrence.name_snapshot,
      'type', v_occurrence.session_type_snapshot,
      'opensAt', v_occurrence.opens_at,
      'lateAfter', v_occurrence.late_after_at,
      'closesAt', v_occurrence.closes_at,
      'eligible', true
    ),
    'faceProfile', jsonb_build_object(
      'id', v_face.id,
      'modelName', v_face.model_name,
      'modelVersion', v_face.model_version,
      'embedding', to_jsonb(v_face.embedding),
      'embeddingDimensions', v_face.embedding_dimensions,
      'templateFingerprint', v_face.template_fingerprint
    )
  );
end;
$$;

create or replace function public.finalize_device_verification_transaction(
  p_device_id uuid,
  p_transaction_id uuid,
  p_request_id text,
  p_verification_result text,
  p_verification_score numeric,
  p_threshold numeric,
  p_model_name text,
  p_model_version text,
  p_outcome_code text,
  p_accepted boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx public.device_verification_transactions%rowtype;
  v_persist record;
begin
  select t.* into v_tx
  from public.device_verification_transactions t
  where t.id = p_transaction_id and t.device_id = p_device_id and t.request_id = p_request_id
  for update;

  if not found then raise exception 'VERIFICATION_TRANSACTION_NOT_FOUND'; end if;

  if v_tx.status = 'CONSUMED' then
    select de.id as device_event_id, va.id as verification_attempt_id, ar.id as attendance_record_id
      into v_persist
    from public.device_events de
    left join public.verification_attempts va
      on va.institution_id = v_tx.institution_id and va.request_id = v_tx.request_id
    left join public.attendance_records ar on ar.verification_attempt_id = va.id
    where de.device_id = v_tx.device_id
      and de.request_id = v_tx.request_id
      and de.event_type in ('ATTENDANCE_ACCEPTED', 'FACE_REJECTED', 'DEVICE_ERROR')
    order by de.created_at desc
    limit 1;

    return jsonb_build_object(
      'transactionId', v_tx.id,
      'status', 'CONSUMED',
      'deviceEventId', v_persist.device_event_id,
      'verificationAttemptId', v_persist.verification_attempt_id,
      'attendanceRecordId', v_persist.attendance_record_id,
      'replayed', true
    );
  end if;

  if v_tx.status <> 'PENDING' or v_tx.expires_at <= now() then
    update public.device_verification_transactions
    set status = case when status = 'PENDING' then 'EXPIRED' else status end
    where id = v_tx.id;
    raise exception 'VERIFICATION_TRANSACTION_NOT_ACTIVE';
  end if;

  if p_verification_result not in ('MATCH', 'MISMATCH', 'NO_FACE', 'LOW_QUALITY', 'SERVICE_ERROR') then
    raise exception 'INVALID_VERIFICATION_RESULT';
  end if;

  if p_accepted and p_verification_result <> 'MATCH' then
    raise exception 'ACCEPTED_VERIFICATION_MUST_MATCH';
  end if;

  select * into v_persist
  from public.persist_resolved_attendance_attempt(
    v_tx.institution_id,
    v_tx.device_id,
    v_tx.request_id,
    v_tx.occurred_at,
    v_tx.student_id,
    v_tx.occurrence_id,
    v_tx.rfid_uid,
    p_verification_result,
    p_verification_score,
    p_model_version,
    p_outcome_code,
    p_accepted
  );

  update public.verification_attempts
  set threshold = p_threshold,
      model_name = p_model_name,
      model_version = p_model_version,
      metadata = metadata || jsonb_build_object('faceTransactionId', v_tx.id, 'faceServiceResult', p_verification_result)
  where id = v_persist.verification_attempt_id;

  update public.device_verification_transactions
  set status = 'CONSUMED', consumed_at = now()
  where id = v_tx.id;

  return jsonb_build_object(
    'transactionId', v_tx.id,
    'status', 'CONSUMED',
    'deviceEventId', v_persist.device_event_id,
    'verificationAttemptId', v_persist.verification_attempt_id,
    'attendanceRecordId', v_persist.attendance_record_id,
    'replayed', false
  );
end;
$$;

revoke all on function public.enroll_admin_face_profile(uuid, uuid, text, text, real[], numeric, text, text) from public;
revoke all on function public.enroll_admin_face_profile(uuid, uuid, text, text, real[], numeric, text, text) from anon;
revoke all on function public.enroll_admin_face_profile(uuid, uuid, text, text, real[], numeric, text, text) from authenticated;
grant execute on function public.enroll_admin_face_profile(uuid, uuid, text, text, real[], numeric, text, text) to service_role;

revoke all on function public.get_device_verification_payload(uuid, uuid, text) from public;
revoke all on function public.get_device_verification_payload(uuid, uuid, text) from anon;
revoke all on function public.get_device_verification_payload(uuid, uuid, text) from authenticated;
grant execute on function public.get_device_verification_payload(uuid, uuid, text) to service_role;

revoke all on function public.finalize_device_verification_transaction(uuid, uuid, text, text, numeric, numeric, text, text, text, boolean) from public;
revoke all on function public.finalize_device_verification_transaction(uuid, uuid, text, text, numeric, numeric, text, text, text, boolean) from anon;
revoke all on function public.finalize_device_verification_transaction(uuid, uuid, text, text, numeric, numeric, text, text, text, boolean) from authenticated;
grant execute on function public.finalize_device_verification_transaction(uuid, uuid, text, text, numeric, numeric, text, text, text, boolean) to service_role;
