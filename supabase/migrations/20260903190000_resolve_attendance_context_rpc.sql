create or replace function public.resolve_attendance_context(
  p_institution_id uuid,
  p_device_id uuid,
  p_rfid_uid text,
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
  v_rfid_id uuid;
  v_student_id uuid;
  v_student_name text;
  v_enrollment_id uuid;
  v_class_name text;
  v_face_profile_id uuid;
  v_face_model_name text;
  v_face_model_version text;
  v_face_template_reference text;
  v_sessions jsonb;
begin
  if p_institution_id is null or p_device_id is null then
    raise exception 'institution and device are required';
  end if;

  if p_rfid_uid is null or btrim(p_rfid_uid) = '' then
    raise exception 'rfid_uid is required';
  end if;

  if p_occurred_at is null then
    raise exception 'occurred_at is required';
  end if;

  select i.timezone
    into v_timezone
  from public.institutions i
  where i.id = p_institution_id;

  if v_timezone is null then
    raise exception 'institution not found';
  end if;

  if not exists (
    select 1
    from public.devices d
    where d.id = p_device_id
      and d.institution_id = p_institution_id
      and d.status = 'ACTIVE'
  ) then
    raise exception 'device is not active for institution';
  end if;

  v_school_date := (p_occurred_at at time zone v_timezone)::date;

  select r.id, r.student_id, s.full_name
    into v_rfid_id, v_student_id, v_student_name
  from public.rfid_credentials r
  join public.students s on s.id = r.student_id
  where r.institution_id = p_institution_id
    and r.uid = upper(btrim(p_rfid_uid))
    and r.status = 'ACTIVE'
    and s.is_active = true
  limit 1;

  if v_student_id is not null then
    select e.id, c.name
      into v_enrollment_id, v_class_name
    from public.student_enrollments e
    join public.classes c on c.id = e.class_id
    where e.institution_id = p_institution_id
      and e.student_id = v_student_id
      and e.status = 'ACTIVE'
      and e.enrolled_on <= v_school_date
      and (e.exited_on is null or e.exited_on >= v_school_date)
    order by e.enrolled_on desc
    limit 1;

    select f.id, f.model_name, f.model_version, f.template_reference
      into v_face_profile_id, v_face_model_name, v_face_model_version, v_face_template_reference
    from public.face_profiles f
    where f.institution_id = p_institution_id
      and f.student_id = v_student_id
      and f.status = 'ACTIVE'
    order by f.enrolled_at desc
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'name', o.name_snapshot,
        'sessionType', o.session_type_snapshot,
        'attendanceMode', o.attendance_mode_snapshot,
        'opensAt', o.opens_at,
        'lateAfterAt', o.late_after_at,
        'closesAt', o.closes_at,
        'eligible', coalesce(sp.eligibility = 'ELIGIBLE' and sp.required, false),
        'duplicate', ar.id is not null,
        'faceVerificationRequired', o.face_verification_required,
        'scheduleRelationship', o.schedule_relationship
      )
      order by o.opens_at, o.id
    ),
    '[]'::jsonb
  )
  into v_sessions
  from public.attendance_session_occurrences o
  left join public.session_participants sp
    on sp.occurrence_id = o.id
   and sp.student_id = v_student_id
  left join public.attendance_records ar
    on ar.occurrence_id = o.id
   and ar.student_id = v_student_id
  where o.institution_id = p_institution_id
    and o.status <> 'CANCELLED'
    and p_occurred_at between o.opens_at and o.closes_at;

  return jsonb_build_object(
    'institutionId', p_institution_id,
    'deviceId', p_device_id,
    'schoolDate', v_school_date,
    'timezone', v_timezone,
    'card', jsonb_strip_nulls(jsonb_build_object(
      'uid', upper(btrim(p_rfid_uid)),
      'registered', v_student_id is not null,
      'credentialId', v_rfid_id,
      'student', case
        when v_student_id is null then null
        else jsonb_strip_nulls(jsonb_build_object(
          'id', v_student_id,
          'name', v_student_name,
          'enrollmentId', v_enrollment_id,
          'className', v_class_name
        ))
      end
    )),
    'faceProfile', case
      when v_face_profile_id is null then null
      else jsonb_strip_nulls(jsonb_build_object(
        'id', v_face_profile_id,
        'modelName', v_face_model_name,
        'modelVersion', v_face_model_version,
        'templateReference', v_face_template_reference
      ))
    end,
    'sessions', v_sessions
  );
end;
$$;

revoke all on function public.resolve_attendance_context(uuid, uuid, text, timestamptz) from public;
revoke all on function public.resolve_attendance_context(uuid, uuid, text, timestamptz) from anon;
revoke all on function public.resolve_attendance_context(uuid, uuid, text, timestamptz) from authenticated;
grant execute on function public.resolve_attendance_context(uuid, uuid, text, timestamptz) to service_role;
