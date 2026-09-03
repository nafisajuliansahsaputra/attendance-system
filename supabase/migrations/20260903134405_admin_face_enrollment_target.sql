create or replace function public.get_admin_face_enrollment_target(
  p_actor_user_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_role text;
  v_timezone text;
  v_school_date date;
  v_student public.students%rowtype;
  v_enrollment public.student_enrollments%rowtype;
  v_class public.classes%rowtype;
  v_face public.face_profiles%rowtype;
begin
  select p.institution_id, p.role, i.timezone
    into v_institution_id, v_role, v_timezone
  from public.profiles p
  join public.institutions i on i.id = p.institution_id
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  v_school_date := (now() at time zone v_timezone)::date;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
    and s.institution_id = v_institution_id;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select e.* into v_enrollment
  from public.student_enrollments e
  where e.student_id = v_student.id
    and e.institution_id = v_institution_id
    and e.enrolled_on <= v_school_date
    and (e.exited_on is null or e.exited_on >= v_school_date)
  order by e.enrolled_on desc
  limit 1;

  if v_enrollment.id is not null then
    select c.* into v_class
    from public.classes c
    where c.id = v_enrollment.class_id;
  end if;

  select f.* into v_face
  from public.face_profiles f
  where f.student_id = v_student.id
    and f.institution_id = v_institution_id
    and f.status = 'ACTIVE'
  limit 1;

  return jsonb_build_object(
    'studentId', v_student.id,
    'nis', v_student.nis,
    'fullName', v_student.full_name,
    'active', v_student.is_active,
    'classId', v_class.id,
    'classCode', v_class.code,
    'className', v_class.name,
    'faceProfile', case when v_face.id is null then null else jsonb_build_object(
      'id', v_face.id,
      'modelName', v_face.model_name,
      'modelVersion', v_face.model_version,
      'qualityScore', v_face.quality_score,
      'templateFingerprint', v_face.template_fingerprint,
      'enrolledAt', v_face.enrolled_at
    ) end,
    'schoolDate', v_school_date
  );
end;
$$;

revoke all on function public.get_admin_face_enrollment_target(uuid, uuid) from public;
revoke all on function public.get_admin_face_enrollment_target(uuid, uuid) from anon;
revoke all on function public.get_admin_face_enrollment_target(uuid, uuid) from authenticated;
grant execute on function public.get_admin_face_enrollment_target(uuid, uuid) to service_role;
