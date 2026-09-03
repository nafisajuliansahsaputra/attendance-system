create extension if not exists btree_gist with schema extensions;

alter table public.student_enrollments
  drop constraint if exists student_enrollments_academic_year_id_student_id_key;

alter table public.student_enrollments
  add constraint student_enrollments_no_overlapping_periods
  exclude using gist (
    institution_id with =,
    student_id with =,
    daterange(enrolled_on, coalesce(exited_on, 'infinity'::date), '[]') with &&
  );

create index if not exists student_enrollments_academic_student_idx
  on public.student_enrollments(academic_year_id, student_id, enrolled_on desc);

create or replace function public.transfer_student_enrollment(
  p_actor_user_id uuid,
  p_student_id uuid,
  p_target_class_id uuid,
  p_effective_on date,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_student public.students%rowtype;
  v_target_class public.classes%rowtype;
  v_academic_year public.academic_years%rowtype;
  v_current public.student_enrollments%rowtype;
  v_new_id uuid;
  v_before jsonb;
begin
  if p_actor_user_id is null or p_student_id is null or p_target_class_id is null or p_effective_on is null then
    raise exception 'actor, student, target class, and effective date are required';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then
    raise exception 'AUTH_PROFILE_NOT_FOUND';
  end if;

  if v_profile.role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
    and s.institution_id = v_profile.institution_id;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select c.* into v_target_class
  from public.classes c
  where c.id = p_target_class_id
    and c.institution_id = v_profile.institution_id
    and c.is_active = true;

  if not found then
    raise exception 'TARGET_CLASS_NOT_FOUND';
  end if;

  select ay.* into v_academic_year
  from public.academic_years ay
  where ay.institution_id = v_profile.institution_id
    and p_effective_on between ay.starts_on and ay.ends_on
  order by ay.starts_on desc
  limit 1;

  if not found then
    raise exception 'ACADEMIC_YEAR_NOT_FOUND_FOR_DATE';
  end if;

  select e.* into v_current
  from public.student_enrollments e
  where e.institution_id = v_profile.institution_id
    and e.student_id = p_student_id
    and e.enrolled_on <= p_effective_on
    and (e.exited_on is null or e.exited_on >= p_effective_on)
  order by e.enrolled_on desc
  limit 1
  for update;

  if found then
    if v_current.class_id = p_target_class_id then
      return jsonb_build_object(
        'studentId', p_student_id,
        'enrollmentId', v_current.id,
        'classId', v_current.class_id,
        'effectiveOn', p_effective_on,
        'unchanged', true,
        'previousEnrollmentId', null
      );
    end if;

    if p_effective_on <= v_current.enrolled_on then
      raise exception 'TRANSFER_DATE_MUST_FOLLOW_ENROLLMENT_START';
    end if;

    v_before := jsonb_build_object(
      'enrollmentId', v_current.id,
      'academicYearId', v_current.academic_year_id,
      'classId', v_current.class_id,
      'enrolledOn', v_current.enrolled_on,
      'exitedOn', v_current.exited_on,
      'status', v_current.status
    );

    update public.student_enrollments
    set
      exited_on = p_effective_on - 1,
      status = 'TRANSFERRED',
      updated_at = now()
    where id = v_current.id;
  else
    v_before := null;
  end if;

  insert into public.student_enrollments (
    institution_id,
    academic_year_id,
    student_id,
    class_id,
    enrolled_on,
    exited_on,
    status
  ) values (
    v_profile.institution_id,
    v_academic_year.id,
    p_student_id,
    p_target_class_id,
    p_effective_on,
    null,
    'ACTIVE'
  )
  returning id into v_new_id;

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
    v_profile.institution_id,
    p_actor_user_id,
    case when v_before is null then 'STUDENT_ENROLLED' else 'STUDENT_TRANSFERRED' end,
    'student_enrollment',
    v_new_id,
    v_before,
    jsonb_build_object(
      'enrollmentId', v_new_id,
      'academicYearId', v_academic_year.id,
      'classId', p_target_class_id,
      'enrolledOn', p_effective_on,
      'status', 'ACTIVE'
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object(
    'studentId', p_student_id,
    'enrollmentId', v_new_id,
    'classId', p_target_class_id,
    'effectiveOn', p_effective_on,
    'unchanged', false,
    'previousEnrollmentId', case when v_before is null then null else v_current.id end
  );
end;
$$;

revoke all on function public.transfer_student_enrollment(uuid, uuid, uuid, date, text) from public;
revoke all on function public.transfer_student_enrollment(uuid, uuid, uuid, date, text) from anon;
revoke all on function public.transfer_student_enrollment(uuid, uuid, uuid, date, text) from authenticated;
grant execute on function public.transfer_student_enrollment(uuid, uuid, uuid, date, text) to service_role;
