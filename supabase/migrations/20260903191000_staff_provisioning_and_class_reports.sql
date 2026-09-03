create or replace function public.provision_staff_profile(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_full_name text,
  p_role text,
  p_institution_id uuid,
  p_class_id uuid default null,
  p_academic_year_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_institution uuid;
  v_target_class public.classes%rowtype;
  v_academic_year public.academic_years%rowtype;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'FULL_NAME_REQUIRED';
  end if;

  if p_role not in ('SYSTEM_ADMIN', 'HOMEROOM_TEACHER', 'OPERATOR') then
    raise exception 'INVALID_STAFF_ROLE';
  end if;

  if p_actor_user_id is not null then
    select role, institution_id
      into v_actor_role, v_actor_institution
    from public.profiles
    where user_id = p_actor_user_id
      and is_active = true;

    if v_actor_role <> 'SYSTEM_ADMIN' or v_actor_institution <> p_institution_id then
      raise exception 'PROVISIONING_FORBIDDEN';
    end if;
  else
    if exists (select 1 from public.profiles) then
      raise exception 'BOOTSTRAP_ONLY_WHEN_NO_PROFILES_EXIST';
    end if;
  end if;

  if not exists (
    select 1 from public.institutions where id = p_institution_id
  ) then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;

  if p_role = 'HOMEROOM_TEACHER' then
    if p_class_id is null or p_academic_year_id is null then
      raise exception 'HOMEROOM_CLASS_AND_YEAR_REQUIRED';
    end if;

    select * into v_target_class
    from public.classes
    where id = p_class_id
      and institution_id = p_institution_id
      and is_active = true;

    if not found then
      raise exception 'CLASS_NOT_FOUND';
    end if;

    select * into v_academic_year
    from public.academic_years
    where id = p_academic_year_id
      and institution_id = p_institution_id;

    if not found then
      raise exception 'ACADEMIC_YEAR_NOT_FOUND';
    end if;
  end if;

  insert into public.profiles (
    user_id,
    institution_id,
    full_name,
    role,
    is_active
  ) values (
    p_target_user_id,
    p_institution_id,
    btrim(p_full_name),
    p_role,
    true
  )
  on conflict (user_id)
  do update set
    institution_id = excluded.institution_id,
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = true;

  if p_role = 'HOMEROOM_TEACHER' then
    insert into public.homeroom_assignments (
      institution_id,
      academic_year_id,
      class_id,
      teacher_user_id,
      starts_on,
      ends_on
    ) values (
      p_institution_id,
      p_academic_year_id,
      p_class_id,
      p_target_user_id,
      v_academic_year.starts_on,
      v_academic_year.ends_on
    )
    on conflict (academic_year_id, class_id, teacher_user_id)
    do update set
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on;
  end if;

  insert into public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  ) values (
    p_institution_id,
    p_actor_user_id,
    case when p_actor_user_id is null then 'BOOTSTRAP_STAFF_PROFILE' else 'PROVISION_STAFF_PROFILE' end,
    'profile',
    p_target_user_id,
    jsonb_strip_nulls(jsonb_build_object(
      'fullName', btrim(p_full_name),
      'role', p_role,
      'classId', p_class_id,
      'academicYearId', p_academic_year_id
    ))
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'userId', p_target_user_id,
    'institutionId', p_institution_id,
    'fullName', btrim(p_full_name),
    'role', p_role,
    'classId', p_class_id,
    'academicYearId', p_academic_year_id
  ));
end;
$$;

create or replace function public.get_class_attendance_report(
  p_actor_user_id uuid,
  p_class_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_class public.classes%rowtype;
  v_authorized boolean := false;
  v_students jsonb;
  v_session_types jsonb;
  v_totals jsonb;
begin
  if p_end_date < p_start_date then
    raise exception 'INVALID_REPORT_RANGE';
  end if;

  if (p_end_date - p_start_date) > 550 then
    raise exception 'REPORT_RANGE_TOO_LARGE';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then
    raise exception 'AUTH_PROFILE_NOT_FOUND';
  end if;

  select c.* into v_class
  from public.classes c
  where c.id = p_class_id
    and c.institution_id = v_profile.institution_id
    and c.is_active = true;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if v_profile.role = 'SYSTEM_ADMIN' then
    v_authorized := true;
  elsif v_profile.role = 'HOMEROOM_TEACHER' then
    select exists (
      select 1
      from public.homeroom_assignments h
      join public.academic_years ay on ay.id = h.academic_year_id
      where h.teacher_user_id = v_profile.user_id
        and h.institution_id = v_profile.institution_id
        and h.class_id = p_class_id
        and ay.starts_on <= p_end_date
        and ay.ends_on >= p_start_date
        and (h.starts_on is null or h.starts_on <= p_end_date)
        and (h.ends_on is null or h.ends_on >= p_start_date)
    ) into v_authorized;
  end if;

  if not v_authorized then
    raise exception 'FORBIDDEN_CLASS_SCOPE';
  end if;

  with roster as (
    select distinct s.id as student_id, s.nis, s.full_name
    from public.student_enrollments e
    join public.students s on s.id = e.student_id
    join public.academic_years ay on ay.id = e.academic_year_id
    where e.institution_id = v_profile.institution_id
      and e.class_id = p_class_id
      and e.enrolled_on <= p_end_date
      and (e.exited_on is null or e.exited_on >= p_start_date)
      and ay.starts_on <= p_end_date
      and ay.ends_on >= p_start_date
      and e.status in ('ACTIVE', 'COMPLETED')
      and s.is_active = true
  ),
  required_days as (
    select distinct sp.student_id, o.school_date
    from public.attendance_session_occurrences o
    join public.session_participants sp on sp.occurrence_id = o.id
    join roster r on r.student_id = sp.student_id
    where o.institution_id = v_profile.institution_id
      and o.school_date between p_start_date and p_end_date
      and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
      and o.status <> 'CANCELLED'
      and sp.eligibility = 'ELIGIBLE'
      and sp.required = true
  ),
  daily as (
    select
      rd.student_id,
      rd.school_date,
      coalesce(
        sda.final_status,
        case
          when ar.attendance_status = 'ON_TIME' then 'PRESENT'
          when ar.attendance_status = 'LATE' then 'LATE'
          else 'PENDING'
        end
      ) as final_status
    from required_days rd
    left join public.school_day_attendance sda
      on sda.institution_id = v_profile.institution_id
     and sda.student_id = rd.student_id
     and sda.school_date = rd.school_date
    left join lateral (
      select a.attendance_status
      from public.attendance_records a
      join public.attendance_session_occurrences o on o.id = a.occurrence_id
      where a.institution_id = v_profile.institution_id
        and a.student_id = rd.student_id
        and o.school_date = rd.school_date
        and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
        and o.status <> 'CANCELLED'
      order by a.accepted_at asc
      limit 1
    ) ar on true
  ),
  per_student as (
    select
      r.student_id,
      r.nis,
      r.full_name,
      count(d.school_date)::int as required_days,
      count(*) filter (where d.final_status = 'PRESENT')::int as present,
      count(*) filter (where d.final_status = 'LATE')::int as late,
      count(*) filter (where d.final_status = 'SAKIT')::int as sakit,
      count(*) filter (where d.final_status = 'IZIN')::int as izin,
      count(*) filter (where d.final_status = 'ALPA')::int as alpa,
      count(*) filter (where d.final_status = 'PENDING')::int as pending
    from roster r
    left join daily d on d.student_id = r.student_id
    group by r.student_id, r.nis, r.full_name
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'studentId', student_id,
        'nis', nis,
        'fullName', full_name,
        'requiredDays', required_days,
        'present', present,
        'late', late,
        'sakit', sakit,
        'izin', izin,
        'alpa', alpa,
        'pending', pending
      ) order by full_name
    ),
    '[]'::jsonb
  ) into v_students
  from per_student;

  with roster as (
    select distinct s.id as student_id
    from public.student_enrollments e
    join public.students s on s.id = e.student_id
    join public.academic_years ay on ay.id = e.academic_year_id
    where e.institution_id = v_profile.institution_id
      and e.class_id = p_class_id
      and e.enrolled_on <= p_end_date
      and (e.exited_on is null or e.exited_on >= p_start_date)
      and ay.starts_on <= p_end_date
      and ay.ends_on >= p_start_date
      and e.status in ('ACTIVE', 'COMPLETED')
      and s.is_active = true
  ),
  participation as (
    select
      o.session_type_snapshot as session_type,
      count(*)::int as scheduled_participations,
      count(a.id)::int as attended_participations
    from public.attendance_session_occurrences o
    join public.session_participants sp on sp.occurrence_id = o.id
    join roster r on r.student_id = sp.student_id
    left join public.attendance_records a
      on a.occurrence_id = o.id
     and a.student_id = sp.student_id
    where o.institution_id = v_profile.institution_id
      and o.school_date between p_start_date and p_end_date
      and o.status <> 'CANCELLED'
      and sp.eligibility = 'ELIGIBLE'
      and sp.required = true
    group by o.session_type_snapshot
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sessionType', session_type,
        'scheduledParticipations', scheduled_participations,
        'attendedParticipations', attended_participations
      ) order by session_type
    ),
    '[]'::jsonb
  ) into v_session_types
  from participation;

  select jsonb_build_object(
    'students', coalesce(jsonb_array_length(v_students), 0),
    'requiredStudentDays', coalesce(sum((item->>'requiredDays')::int), 0),
    'present', coalesce(sum((item->>'present')::int), 0),
    'late', coalesce(sum((item->>'late')::int), 0),
    'sakit', coalesce(sum((item->>'sakit')::int), 0),
    'izin', coalesce(sum((item->>'izin')::int), 0),
    'alpa', coalesce(sum((item->>'alpa')::int), 0),
    'pending', coalesce(sum((item->>'pending')::int), 0)
  ) into v_totals
  from jsonb_array_elements(v_students) item;

  return jsonb_build_object(
    'class', jsonb_build_object('id', v_class.id, 'code', v_class.code, 'name', v_class.name),
    'period', jsonb_build_object('startDate', p_start_date, 'endDate', p_end_date),
    'totals', v_totals,
    'students', v_students,
    'sessionTypes', v_session_types,
    'policyNotes', jsonb_build_array(
      'School-day totals are derived from required SCHOOL_ARRIVAL days and final homeroom confirmations.',
      'Prayer/activity session participation is reported as raw scheduled vs attended counts; no attendance-rate denominator policy is applied yet.'
    )
  );
end;
$$;

revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from public;
revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from anon;
revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from authenticated;
grant execute on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) to service_role;

revoke all on function public.get_class_attendance_report(uuid, uuid, date, date) from public;
revoke all on function public.get_class_attendance_report(uuid, uuid, date, date) from anon;
revoke all on function public.get_class_attendance_report(uuid, uuid, date, date) from authenticated;
grant execute on function public.get_class_attendance_report(uuid, uuid, date, date) to service_role;
