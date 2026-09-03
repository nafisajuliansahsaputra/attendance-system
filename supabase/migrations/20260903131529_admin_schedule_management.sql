insert into public.attendance_session_templates (
  institution_id, code, name, session_type, attendance_mode,
  face_verification_required, late_enabled, is_active
)
select
  i.id,
  v.code,
  v.name,
  v.session_type,
  v.attendance_mode,
  true,
  v.late_enabled,
  true
from public.institutions i
cross join (
  values
    ('DEPARTURE', 'Pulang Sekolah', 'SCHOOL_DEPARTURE', 'CHECK_OUT', false),
    ('DZUHUR', 'Absensi Dzuhur', 'DZUHUR', 'SINGLE_PRESENCE', false),
    ('ASHAR', 'Absensi Ashar', 'ASHAR', 'SINGLE_PRESENCE', false)
) as v(code, name, session_type, attendance_mode, late_enabled)
where not exists (
  select 1
  from public.attendance_session_templates t
  where t.institution_id = i.id
    and t.code = v.code
);

create or replace function public.get_admin_schedule_configuration(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_templates jsonb;
  v_rules jsonb;
  v_classes jsonb;
  v_grades jsonb;
  v_departments jsonb;
begin
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'code', t.code,
    'name', t.name,
    'sessionType', t.session_type,
    'attendanceMode', t.attendance_mode,
    'faceVerificationRequired', t.face_verification_required,
    'lateEnabled', t.late_enabled,
    'active', t.is_active
  ) order by t.name), '[]'::jsonb)
  into v_templates
  from public.attendance_session_templates t
  where t.institution_id = v_profile.institution_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'templateId', r.session_template_id,
    'name', r.name,
    'recurrenceRule', r.recurrence_rule,
    'startsOn', r.starts_on,
    'endsOn', r.ends_on,
    'opensAt', r.opens_at,
    'lateAfterAt', r.late_after_at,
    'closesAt', r.closes_at,
    'targetType', r.target_type,
    'targetSelector', r.target_selector,
    'scheduleRelationship', r.schedule_relationship,
    'active', r.is_active,
    'materializedOccurrences', (
      select count(*)::int
      from public.attendance_session_occurrences o
      where o.source_schedule_rule_id = r.id
    ),
    'lastMaterializedDate', (
      select max(o.school_date)
      from public.attendance_session_occurrences o
      where o.source_schedule_rule_id = r.id
    )
  ) order by r.starts_on desc, r.name), '[]'::jsonb)
  into v_rules
  from public.attendance_schedule_rules r
  where r.institution_id = v_profile.institution_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'code', c.code,
    'name', c.name,
    'active', c.is_active
  ) order by c.name), '[]'::jsonb)
  into v_classes
  from public.classes c
  where c.institution_id = v_profile.institution_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'code', g.code,
    'name', g.name
  ) order by g.sort_order, g.name), '[]'::jsonb)
  into v_grades
  from public.grade_levels g
  where g.institution_id = v_profile.institution_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'code', d.code,
    'name', d.name
  ) order by d.name), '[]'::jsonb)
  into v_departments
  from public.departments d
  where d.institution_id = v_profile.institution_id;

  return jsonb_build_object(
    'templates', v_templates,
    'rules', v_rules,
    'classes', v_classes,
    'gradeLevels', v_grades,
    'departments', v_departments
  );
end;
$$;

create or replace function public.create_attendance_schedule_rule(
  p_actor_user_id uuid,
  p_session_template_id uuid,
  p_name text,
  p_recurrence_rule text,
  p_starts_on date,
  p_ends_on date,
  p_opens_at time,
  p_late_after_at time,
  p_closes_at time,
  p_target_type text,
  p_target_selector jsonb,
  p_schedule_relationship text default 'NORMAL',
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_template public.attendance_session_templates%rowtype;
  v_selector jsonb := coalesce(p_target_selector, '{}'::jsonb);
  v_rule_id uuid;
  v_invalid_count integer;
begin
  select p.* into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then raise exception 'AUTH_PROFILE_NOT_FOUND'; end if;
  if v_profile.role <> 'SYSTEM_ADMIN' then raise exception 'FORBIDDEN_ADMIN_ONLY'; end if;

  if p_name is null or btrim(p_name) = '' or length(btrim(p_name)) > 150 then
    raise exception 'INVALID_SCHEDULE_NAME';
  end if;
  if p_starts_on is null or p_opens_at is null or p_closes_at is null then
    raise exception 'SCHEDULE_DATES_AND_TIMES_REQUIRED';
  end if;
  if p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'INVALID_SCHEDULE_DATE_RANGE';
  end if;
  if p_closes_at < p_opens_at then raise exception 'INVALID_SCHEDULE_TIME_RANGE'; end if;
  if p_late_after_at is not null and (p_late_after_at < p_opens_at or p_late_after_at > p_closes_at) then
    raise exception 'INVALID_LATE_THRESHOLD';
  end if;

  select t.* into v_template
  from public.attendance_session_templates t
  where t.id = p_session_template_id
    and t.institution_id = v_profile.institution_id
    and t.is_active = true;

  if not found then raise exception 'SESSION_TEMPLATE_NOT_FOUND'; end if;
  if not v_template.late_enabled and p_late_after_at is not null then
    raise exception 'LATE_NOT_SUPPORTED_BY_TEMPLATE';
  end if;

  if p_recurrence_rule is not null and btrim(p_recurrence_rule) <> '' then
    perform public.schedule_rule_matches_date(p_recurrence_rule, p_starts_on, p_starts_on);
  end if;

  if p_target_type not in ('ALL_STUDENTS', 'GRADE_LEVELS', 'CLASSES', 'DEPARTMENTS', 'SELECTED_STUDENTS') then
    raise exception 'INVALID_TARGET_TYPE';
  end if;
  if p_schedule_relationship not in ('NORMAL', 'ADDITIVE', 'REPLACE_NORMAL', 'CANCEL_NORMAL') then
    raise exception 'INVALID_SCHEDULE_RELATIONSHIP';
  end if;

  if p_target_type = 'ALL_STUDENTS' then
    v_selector := '{}'::jsonb;
  elsif p_target_type = 'CLASSES' then
    if jsonb_typeof(v_selector->'class_ids') <> 'array' or jsonb_array_length(v_selector->'class_ids') = 0 then raise exception 'TARGET_CLASSES_REQUIRED'; end if;
    select count(*) into v_invalid_count from jsonb_array_elements_text(v_selector->'class_ids') x(id)
    where not exists (select 1 from public.classes c where c.id::text=x.id and c.institution_id=v_profile.institution_id and c.is_active=true);
    if v_invalid_count > 0 then raise exception 'INVALID_TARGET_CLASS'; end if;
  elsif p_target_type = 'GRADE_LEVELS' then
    if jsonb_typeof(v_selector->'grade_ids') <> 'array' or jsonb_array_length(v_selector->'grade_ids') = 0 then raise exception 'TARGET_GRADES_REQUIRED'; end if;
    select count(*) into v_invalid_count from jsonb_array_elements_text(v_selector->'grade_ids') x(id)
    where not exists (select 1 from public.grade_levels g where g.id::text=x.id and g.institution_id=v_profile.institution_id);
    if v_invalid_count > 0 then raise exception 'INVALID_TARGET_GRADE'; end if;
  elsif p_target_type = 'DEPARTMENTS' then
    if jsonb_typeof(v_selector->'department_ids') <> 'array' or jsonb_array_length(v_selector->'department_ids') = 0 then raise exception 'TARGET_DEPARTMENTS_REQUIRED'; end if;
    select count(*) into v_invalid_count from jsonb_array_elements_text(v_selector->'department_ids') x(id)
    where not exists (select 1 from public.departments d where d.id::text=x.id and d.institution_id=v_profile.institution_id);
    if v_invalid_count > 0 then raise exception 'INVALID_TARGET_DEPARTMENT'; end if;
  elsif p_target_type = 'SELECTED_STUDENTS' then
    if jsonb_typeof(v_selector->'student_ids') <> 'array' or jsonb_array_length(v_selector->'student_ids') = 0 then raise exception 'TARGET_STUDENTS_REQUIRED'; end if;
    select count(*) into v_invalid_count from jsonb_array_elements_text(v_selector->'student_ids') x(id)
    where not exists (select 1 from public.students s where s.id::text=x.id and s.institution_id=v_profile.institution_id and s.is_active=true);
    if v_invalid_count > 0 then raise exception 'INVALID_TARGET_STUDENT'; end if;
  end if;

  insert into public.attendance_schedule_rules (
    institution_id, session_template_id, name, recurrence_rule, starts_on, ends_on,
    opens_at, late_after_at, closes_at, target_type, target_selector,
    schedule_relationship, is_active, created_by
  ) values (
    v_profile.institution_id, p_session_template_id, btrim(p_name), nullif(upper(btrim(p_recurrence_rule)), ''),
    p_starts_on, p_ends_on, p_opens_at, p_late_after_at, p_closes_at,
    p_target_type, v_selector, p_schedule_relationship, true, p_actor_user_id
  ) returning id into v_rule_id;

  insert into public.audit_logs (
    institution_id, actor_user_id, action, entity_type, entity_id, after_data, reason
  ) values (
    v_profile.institution_id, p_actor_user_id, 'SCHEDULE_RULE_CREATED', 'attendance_schedule_rule', v_rule_id,
    jsonb_build_object(
      'templateId', p_session_template_id, 'name', btrim(p_name),
      'recurrenceRule', nullif(upper(btrim(p_recurrence_rule)), ''),
      'startsOn', p_starts_on, 'endsOn', p_ends_on, 'opensAt', p_opens_at,
      'lateAfterAt', p_late_after_at, 'closesAt', p_closes_at,
      'targetType', p_target_type, 'targetSelector', v_selector,
      'scheduleRelationship', p_schedule_relationship
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object('ruleId', v_rule_id, 'created', true);
end;
$$;

create or replace function public.retire_attendance_schedule_rule(
  p_actor_user_id uuid,
  p_rule_id uuid,
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
  v_rule public.attendance_schedule_rules%rowtype;
  v_cancelled integer := 0;
  v_participants integer := 0;
begin
  select p.* into v_profile from public.profiles p where p.user_id=p_actor_user_id and p.is_active=true;
  if not found then raise exception 'AUTH_PROFILE_NOT_FOUND'; end if;
  if v_profile.role <> 'SYSTEM_ADMIN' then raise exception 'FORBIDDEN_ADMIN_ONLY'; end if;

  select r.* into v_rule from public.attendance_schedule_rules r
  where r.id=p_rule_id and r.institution_id=v_profile.institution_id for update;
  if not found then raise exception 'SCHEDULE_RULE_NOT_FOUND'; end if;
  if p_effective_on is null or p_effective_on <= v_rule.starts_on then raise exception 'INVALID_RETIREMENT_DATE'; end if;

  if v_rule.ends_on is not null and v_rule.ends_on < p_effective_on then
    return jsonb_build_object('ruleId',p_rule_id,'endsOn',v_rule.ends_on,'unchanged',true,'cancelledOccurrences',0);
  end if;

  if exists (
    select 1 from public.attendance_session_occurrences o
    join public.attendance_records a on a.occurrence_id=o.id
    where o.source_schedule_rule_id=p_rule_id and o.school_date>=p_effective_on
  ) then raise exception 'SCHEDULE_RETIREMENT_CONFLICT_WITH_ATTENDANCE'; end if;

  with cancelled as (
    update public.attendance_session_occurrences o
    set status='CANCELLED', updated_at=now()
    where o.source_schedule_rule_id=p_rule_id and o.school_date>=p_effective_on and o.status<>'CANCELLED'
    returning o.id
  )
  update public.session_participants sp
  set eligibility='CANCELLED', required=false, resolved_at=now()
  where sp.occurrence_id in (select id from cancelled);
  get diagnostics v_participants = row_count;

  select count(*)::int into v_cancelled from public.attendance_session_occurrences o
  where o.source_schedule_rule_id=p_rule_id and o.school_date>=p_effective_on and o.status='CANCELLED';

  update public.attendance_schedule_rules set ends_on=p_effective_on-1, updated_at=now() where id=p_rule_id;

  insert into public.audit_logs (
    institution_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, reason
  ) values (
    v_profile.institution_id, p_actor_user_id, 'SCHEDULE_RULE_RETIRED', 'attendance_schedule_rule', p_rule_id,
    jsonb_build_object('endsOn',v_rule.ends_on),
    jsonb_build_object('endsOn',p_effective_on-1,'effectiveOn',p_effective_on,'cancelledOccurrences',v_cancelled,'cancelledParticipantRows',v_participants),
    nullif(btrim(p_note),'')
  );

  return jsonb_build_object('ruleId',p_rule_id,'endsOn',p_effective_on-1,'unchanged',false,'cancelledOccurrences',v_cancelled);
end;
$$;

revoke all on function public.get_admin_schedule_configuration(uuid) from public;
revoke all on function public.get_admin_schedule_configuration(uuid) from anon;
revoke all on function public.get_admin_schedule_configuration(uuid) from authenticated;
grant execute on function public.get_admin_schedule_configuration(uuid) to service_role;

revoke all on function public.create_attendance_schedule_rule(uuid,uuid,text,text,date,date,time,time,time,text,jsonb,text,text) from public;
revoke all on function public.create_attendance_schedule_rule(uuid,uuid,text,text,date,date,time,time,time,text,jsonb,text,text) from anon;
revoke all on function public.create_attendance_schedule_rule(uuid,uuid,text,text,date,date,time,time,time,text,jsonb,text,text) from authenticated;
grant execute on function public.create_attendance_schedule_rule(uuid,uuid,text,text,date,date,time,time,time,text,jsonb,text,text) to service_role;

revoke all on function public.retire_attendance_schedule_rule(uuid,uuid,date,text) from public;
revoke all on function public.retire_attendance_schedule_rule(uuid,uuid,date,text) from anon;
revoke all on function public.retire_attendance_schedule_rule(uuid,uuid,date,text) from authenticated;
grant execute on function public.retire_attendance_schedule_rule(uuid,uuid,date,text) to service_role;
