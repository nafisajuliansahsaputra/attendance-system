create or replace function public.get_user_authorization_context(
  p_user_id uuid,
  p_school_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_timezone text;
  v_school_date date;
  v_classes jsonb;
begin
  select p.* into v_profile
  from public.profiles p
  where p.user_id = p_user_id
    and p.is_active = true;

  if not found then
    return null;
  end if;

  select i.timezone into v_timezone
  from public.institutions i
  where i.id = v_profile.institution_id;

  v_school_date := coalesce(
    p_school_date,
    (now() at time zone coalesce(v_timezone, 'Asia/Jakarta'))::date
  );

  if v_profile.role = 'SYSTEM_ADMIN' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name)
        order by c.name
      ),
      '[]'::jsonb
    ) into v_classes
    from public.classes c
    where c.institution_id = v_profile.institution_id
      and c.is_active = true;
  elsif v_profile.role = 'HOMEROOM_TEACHER' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name)
        order by c.name
      ),
      '[]'::jsonb
    ) into v_classes
    from public.homeroom_assignments h
    join public.academic_years ay on ay.id = h.academic_year_id
    join public.classes c on c.id = h.class_id
    where h.teacher_user_id = v_profile.user_id
      and h.institution_id = v_profile.institution_id
      and ay.starts_on <= v_school_date
      and ay.ends_on >= v_school_date
      and (h.starts_on is null or h.starts_on <= v_school_date)
      and (h.ends_on is null or h.ends_on >= v_school_date)
      and c.is_active = true;
  else
    v_classes := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'userId', v_profile.user_id,
    'institutionId', v_profile.institution_id,
    'fullName', v_profile.full_name,
    'role', v_profile.role,
    'schoolDate', v_school_date,
    'classes', coalesce(v_classes, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_homeroom_attendance_snapshot(
  p_actor_user_id uuid,
  p_class_id uuid,
  p_school_date date
)
returns table (
  student_id uuid,
  nis text,
  full_name text,
  class_id uuid,
  class_name text,
  arrival_record_id uuid,
  arrival_time timestamptz,
  attendance_status text,
  system_state text,
  final_status text,
  needs_confirmation boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_class public.classes%rowtype;
  v_authorized boolean := false;
begin
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
        and ay.starts_on <= p_school_date
        and ay.ends_on >= p_school_date
        and (h.starts_on is null or h.starts_on <= p_school_date)
        and (h.ends_on is null or h.ends_on >= p_school_date)
    ) into v_authorized;
  end if;

  if not v_authorized then
    raise exception 'FORBIDDEN_CLASS_SCOPE';
  end if;

  return query
  select
    s.id,
    s.nis,
    s.full_name,
    c.id,
    c.name,
    ar.id,
    ar.accepted_at,
    ar.attendance_status,
    case
      when coalesce(req.required_session, false) = false then 'NOT_SCHEDULED'
      when ar.attendance_status = 'ON_TIME' then 'PRESENT_ON_TIME'
      when ar.attendance_status = 'LATE' then 'PRESENT_LATE'
      when sda.system_state is not null then sda.system_state
      else 'PENDING_CONFIRMATION'
    end,
    coalesce(
      sda.final_status,
      case
        when ar.attendance_status = 'ON_TIME' then 'PRESENT'
        when ar.attendance_status = 'LATE' then 'LATE'
        else null
      end
    ),
    (
      coalesce(req.required_session, false) = true
      and ar.id is null
      and sda.final_status is null
    )
  from public.student_enrollments e
  join public.academic_years ay on ay.id = e.academic_year_id
  join public.students s on s.id = e.student_id
  join public.classes c on c.id = e.class_id
  left join lateral (
    select true as required_session
    from public.attendance_session_occurrences o
    join public.session_participants sp
      on sp.occurrence_id = o.id
     and sp.student_id = s.id
     and sp.eligibility = 'ELIGIBLE'
     and sp.required = true
    where o.institution_id = v_profile.institution_id
      and o.school_date = p_school_date
      and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
      and o.status <> 'CANCELLED'
    order by o.opens_at asc
    limit 1
  ) req on true
  left join lateral (
    select a.id, a.accepted_at, a.attendance_status
    from public.attendance_records a
    join public.attendance_session_occurrences o on o.id = a.occurrence_id
    where a.student_id = s.id
      and a.institution_id = v_profile.institution_id
      and o.school_date = p_school_date
      and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
      and o.status <> 'CANCELLED'
    order by a.accepted_at asc
    limit 1
  ) ar on true
  left join public.school_day_attendance sda
    on sda.institution_id = v_profile.institution_id
   and sda.student_id = s.id
   and sda.school_date = p_school_date
  where e.institution_id = v_profile.institution_id
    and e.class_id = p_class_id
    and ay.starts_on <= p_school_date
    and ay.ends_on >= p_school_date
    and e.enrolled_on <= p_school_date
    and (e.exited_on is null or e.exited_on >= p_school_date)
    and e.status in ('ACTIVE', 'COMPLETED')
    and s.is_active = true
  order by s.full_name;
end;
$$;

create or replace function public.confirm_school_day_status(
  p_actor_user_id uuid,
  p_student_id uuid,
  p_school_date date,
  p_new_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_enrollment_id uuid;
  v_class_id uuid;
  v_authorized boolean := false;
  v_required boolean := false;
  v_has_arrival boolean := false;
  v_previous_status text;
  v_day_id uuid;
begin
  if p_new_status not in ('SAKIT', 'IZIN', 'ALPA') then
    raise exception 'INVALID_CONFIRMATION_STATUS';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then
    raise exception 'AUTH_PROFILE_NOT_FOUND';
  end if;

  select e.id, e.class_id
    into v_enrollment_id, v_class_id
  from public.student_enrollments e
  join public.academic_years ay on ay.id = e.academic_year_id
  where e.student_id = p_student_id
    and e.institution_id = v_profile.institution_id
    and ay.starts_on <= p_school_date
    and ay.ends_on >= p_school_date
    and e.enrolled_on <= p_school_date
    and (e.exited_on is null or e.exited_on >= p_school_date)
    and e.status in ('ACTIVE', 'COMPLETED')
  order by e.enrolled_on desc
  limit 1;

  if v_enrollment_id is null then
    raise exception 'STUDENT_ENROLLMENT_NOT_FOUND';
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
        and h.class_id = v_class_id
        and ay.starts_on <= p_school_date
        and ay.ends_on >= p_school_date
        and (h.starts_on is null or h.starts_on <= p_school_date)
        and (h.ends_on is null or h.ends_on >= p_school_date)
    ) into v_authorized;
  end if;

  if not v_authorized then
    raise exception 'FORBIDDEN_CLASS_SCOPE';
  end if;

  select exists (
    select 1
    from public.attendance_session_occurrences o
    join public.session_participants sp
      on sp.occurrence_id = o.id
     and sp.student_id = p_student_id
     and sp.eligibility = 'ELIGIBLE'
     and sp.required = true
    where o.institution_id = v_profile.institution_id
      and o.school_date = p_school_date
      and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
      and o.status <> 'CANCELLED'
  ) into v_required;

  if not v_required then
    raise exception 'NO_REQUIRED_ARRIVAL_SESSION';
  end if;

  select exists (
    select 1
    from public.attendance_records a
    join public.attendance_session_occurrences o on o.id = a.occurrence_id
    where a.institution_id = v_profile.institution_id
      and a.student_id = p_student_id
      and o.school_date = p_school_date
      and o.session_type_snapshot = 'SCHOOL_ARRIVAL'
      and o.status <> 'CANCELLED'
  ) into v_has_arrival;

  if v_has_arrival then
    raise exception 'STUDENT_HAS_VALID_ARRIVAL';
  end if;

  select sda.final_status into v_previous_status
  from public.school_day_attendance sda
  where sda.institution_id = v_profile.institution_id
    and sda.student_id = p_student_id
    and sda.school_date = p_school_date;

  if v_previous_status = p_new_status then
    raise exception 'STATUS_ALREADY_CONFIRMED';
  end if;

  insert into public.school_day_attendance (
    institution_id,
    student_id,
    enrollment_id,
    school_date,
    system_state,
    final_status,
    finalized_by,
    finalized_at
  ) values (
    v_profile.institution_id,
    p_student_id,
    v_enrollment_id,
    p_school_date,
    'NO_VALID_ARRIVAL',
    p_new_status,
    v_profile.user_id,
    now()
  )
  on conflict (institution_id, student_id, school_date)
  do update set
    enrollment_id = excluded.enrollment_id,
    system_state = 'NO_VALID_ARRIVAL',
    final_status = excluded.final_status,
    finalized_by = excluded.finalized_by,
    finalized_at = excluded.finalized_at
  returning id into v_day_id;

  insert into public.attendance_confirmations (
    institution_id,
    school_day_attendance_id,
    actor_user_id,
    previous_status,
    new_status,
    note
  ) values (
    v_profile.institution_id,
    v_day_id,
    v_profile.user_id,
    v_previous_status,
    p_new_status,
    nullif(btrim(coalesce(p_note, '')), '')
  );

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
    v_profile.user_id,
    'CONFIRM_SCHOOL_DAY_STATUS',
    'school_day_attendance',
    v_day_id,
    jsonb_build_object('finalStatus', v_previous_status),
    jsonb_build_object('finalStatus', p_new_status),
    nullif(btrim(coalesce(p_note, '')), '')
  );

  return jsonb_build_object(
    'schoolDayAttendanceId', v_day_id,
    'studentId', p_student_id,
    'schoolDate', p_school_date,
    'previousStatus', v_previous_status,
    'finalStatus', p_new_status
  );
end;
$$;

revoke all on function public.get_user_authorization_context(uuid, date) from public;
revoke all on function public.get_user_authorization_context(uuid, date) from anon;
revoke all on function public.get_user_authorization_context(uuid, date) from authenticated;
grant execute on function public.get_user_authorization_context(uuid, date) to service_role;

revoke all on function public.get_homeroom_attendance_snapshot(uuid, uuid, date) from public;
revoke all on function public.get_homeroom_attendance_snapshot(uuid, uuid, date) from anon;
revoke all on function public.get_homeroom_attendance_snapshot(uuid, uuid, date) from authenticated;
grant execute on function public.get_homeroom_attendance_snapshot(uuid, uuid, date) to service_role;

revoke all on function public.confirm_school_day_status(uuid, uuid, date, text, text) from public;
revoke all on function public.confirm_school_day_status(uuid, uuid, date, text, text) from anon;
revoke all on function public.confirm_school_day_status(uuid, uuid, date, text, text) from authenticated;
grant execute on function public.confirm_school_day_status(uuid, uuid, date, text, text) to service_role;
