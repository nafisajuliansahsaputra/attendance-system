create unique index if not exists attendance_occurrence_source_rule_date_unique_idx
  on public.attendance_session_occurrences(source_schedule_rule_id, school_date)
  where source_schedule_rule_id is not null;

create or replace function public.schedule_rule_matches_date(
  p_recurrence_rule text,
  p_starts_on date,
  p_date date
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_match text[];
  v_freq text;
  v_byday text;
  v_interval integer := 1;
  v_day_code text;
  v_days integer;
  v_weeks integer;
begin
  if p_starts_on is null or p_date is null or p_date < p_starts_on then
    return false;
  end if;

  if p_recurrence_rule is null or btrim(p_recurrence_rule) = '' then
    return p_date = p_starts_on;
  end if;

  v_match := regexp_match(upper(btrim(p_recurrence_rule)), '(^|;)FREQ=([^;]+)');
  if v_match is null then
    raise exception 'UNSUPPORTED_RECURRENCE_RULE: missing FREQ';
  end if;
  v_freq := v_match[2];

  v_match := regexp_match(upper(btrim(p_recurrence_rule)), '(^|;)BYDAY=([^;]+)');
  if v_match is not null then
    v_byday := v_match[2];
  end if;

  v_match := regexp_match(upper(btrim(p_recurrence_rule)), '(^|;)INTERVAL=([0-9]+)');
  if v_match is not null then
    v_interval := v_match[2]::integer;
    if v_interval < 1 then
      raise exception 'UNSUPPORTED_RECURRENCE_RULE: INTERVAL must be >= 1';
    end if;
  end if;

  v_days := p_date - p_starts_on;
  v_day_code := case extract(isodow from p_date)::integer
    when 1 then 'MO'
    when 2 then 'TU'
    when 3 then 'WE'
    when 4 then 'TH'
    when 5 then 'FR'
    when 6 then 'SA'
    when 7 then 'SU'
  end;

  if v_freq = 'DAILY' then
    return mod(v_days, v_interval) = 0;
  elsif v_freq = 'WEEKLY' then
    v_weeks := floor(v_days / 7.0)::integer;
    if mod(v_weeks, v_interval) <> 0 then
      return false;
    end if;

    if v_byday is null then
      return extract(isodow from p_date)::integer = extract(isodow from p_starts_on)::integer;
    end if;

    return v_day_code = any(string_to_array(v_byday, ','));
  end if;

  raise exception 'UNSUPPORTED_RECURRENCE_RULE: FREQ=% is not supported yet', v_freq;
end;
$$;

create or replace function public.materialize_attendance_schedule_range(
  p_institution_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_rule record;
  v_date date;
  v_occurrence_id uuid;
  v_opens_at timestamptz;
  v_late_after_at timestamptz;
  v_closes_at timestamptz;
  v_status text;
  v_created integer := 0;
  v_existing integer := 0;
  v_participants integer := 0;
  v_cancelled_normal integer := 0;
  v_row_count integer := 0;
begin
  if p_institution_id is null then
    raise exception 'INSTITUTION_REQUIRED';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  if (p_end_date - p_start_date) > 370 then
    raise exception 'DATE_RANGE_TOO_LARGE';
  end if;

  select i.timezone into v_timezone
  from public.institutions i
  where i.id = p_institution_id;

  if v_timezone is null then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;

  for v_rule in
    select
      r.*,
      t.name as template_name,
      t.session_type,
      t.attendance_mode,
      t.face_verification_required
    from public.attendance_schedule_rules r
    join public.attendance_session_templates t
      on t.id = r.session_template_id
     and t.institution_id = r.institution_id
    where r.institution_id = p_institution_id
      and r.is_active = true
      and t.is_active = true
      and r.starts_on <= p_end_date
      and (r.ends_on is null or r.ends_on >= p_start_date)
    order by r.starts_on, r.id
  loop
    if v_rule.target_type = 'GRADE_LEVELS'
       and not (v_rule.target_selector ? 'grade_ids' or v_rule.target_selector ? 'grade_codes') then
      raise exception 'INVALID_TARGET_SELECTOR: GRADE_LEVELS requires grade_ids or grade_codes';
    elsif v_rule.target_type = 'CLASSES'
       and not (v_rule.target_selector ? 'class_ids' or v_rule.target_selector ? 'class_codes') then
      raise exception 'INVALID_TARGET_SELECTOR: CLASSES requires class_ids or class_codes';
    elsif v_rule.target_type = 'DEPARTMENTS'
       and not (v_rule.target_selector ? 'department_ids' or v_rule.target_selector ? 'department_codes') then
      raise exception 'INVALID_TARGET_SELECTOR: DEPARTMENTS requires department_ids or department_codes';
    elsif v_rule.target_type = 'SELECTED_STUDENTS'
       and not (v_rule.target_selector ? 'student_ids') then
      raise exception 'INVALID_TARGET_SELECTOR: SELECTED_STUDENTS requires student_ids';
    end if;

    for v_date in
      select gs::date
      from generate_series(
        greatest(p_start_date, v_rule.starts_on)::timestamp,
        least(p_end_date, coalesce(v_rule.ends_on, p_end_date))::timestamp,
        interval '1 day'
      ) gs
    loop
      if not public.schedule_rule_matches_date(v_rule.recurrence_rule, v_rule.starts_on, v_date) then
        continue;
      end if;

      v_opens_at := (v_date + v_rule.opens_at) at time zone v_timezone;
      v_closes_at := (v_date + v_rule.closes_at) at time zone v_timezone;
      v_late_after_at := case
        when v_rule.late_after_at is null then null
        else (v_date + v_rule.late_after_at) at time zone v_timezone
      end;

      v_status := case
        when v_rule.schedule_relationship = 'CANCEL_NORMAL' then 'CANCELLED'
        when v_closes_at < now() then 'CLOSED'
        when v_opens_at <= now() and v_closes_at >= now() then 'ACTIVE'
        else 'SCHEDULED'
      end;

      v_occurrence_id := null;

      insert into public.attendance_session_occurrences (
        institution_id,
        session_template_id,
        source_schedule_rule_id,
        name_snapshot,
        session_type_snapshot,
        attendance_mode_snapshot,
        school_date,
        opens_at,
        late_after_at,
        closes_at,
        schedule_relationship,
        status,
        target_snapshot,
        face_verification_required
      ) values (
        p_institution_id,
        v_rule.session_template_id,
        v_rule.id,
        v_rule.name,
        v_rule.session_type,
        v_rule.attendance_mode,
        v_date,
        v_opens_at,
        v_late_after_at,
        v_closes_at,
        v_rule.schedule_relationship,
        v_status,
        jsonb_build_object(
          'targetType', v_rule.target_type,
          'selector', v_rule.target_selector,
          'sourceRuleId', v_rule.id,
          'materialized', true
        ),
        v_rule.face_verification_required
      )
      on conflict (source_schedule_rule_id, school_date)
        where source_schedule_rule_id is not null
      do nothing
      returning id into v_occurrence_id;

      if v_occurrence_id is null then
        v_existing := v_existing + 1;
        continue;
      end if;

      v_created := v_created + 1;

      if v_rule.schedule_relationship <> 'CANCEL_NORMAL' then
        insert into public.session_participants (
          occurrence_id,
          student_id,
          enrollment_id,
          eligibility,
          required
        )
        select
          v_occurrence_id,
          e.student_id,
          e.id,
          'ELIGIBLE',
          true
        from public.student_enrollments e
        join public.academic_years ay
          on ay.id = e.academic_year_id
         and ay.institution_id = e.institution_id
        join public.classes c
          on c.id = e.class_id
         and c.institution_id = e.institution_id
        join public.grade_levels g
          on g.id = c.grade_level_id
         and g.institution_id = e.institution_id
        left join public.departments d
          on d.id = c.department_id
         and d.institution_id = e.institution_id
        where e.institution_id = p_institution_id
          and e.enrolled_on <= v_date
          and (e.exited_on is null or e.exited_on >= v_date)
          and ay.starts_on <= v_date
          and ay.ends_on >= v_date
          and (
            v_rule.target_type = 'ALL_STUDENTS'
            or (
              v_rule.target_type = 'GRADE_LEVELS'
              and (
                coalesce(v_rule.target_selector->'grade_ids', '[]'::jsonb) ? c.grade_level_id::text
                or coalesce(v_rule.target_selector->'grade_codes', '[]'::jsonb) ? g.code
              )
            )
            or (
              v_rule.target_type = 'CLASSES'
              and (
                coalesce(v_rule.target_selector->'class_ids', '[]'::jsonb) ? c.id::text
                or coalesce(v_rule.target_selector->'class_codes', '[]'::jsonb) ? c.code
              )
            )
            or (
              v_rule.target_type = 'DEPARTMENTS'
              and c.department_id is not null
              and (
                coalesce(v_rule.target_selector->'department_ids', '[]'::jsonb) ? c.department_id::text
                or coalesce(v_rule.target_selector->'department_codes', '[]'::jsonb) ? d.code
              )
            )
            or (
              v_rule.target_type = 'SELECTED_STUDENTS'
              and coalesce(v_rule.target_selector->'student_ids', '[]'::jsonb) ? e.student_id::text
            )
          )
        on conflict (occurrence_id, student_id) do nothing;

        get diagnostics v_row_count = row_count;
        v_participants := v_participants + v_row_count;
      end if;
    end loop;
  end loop;

  if exists (
    select 1
    from public.attendance_session_occurrences override_o
    join public.attendance_session_occurrences normal_o
      on normal_o.institution_id = override_o.institution_id
     and normal_o.school_date = override_o.school_date
     and normal_o.schedule_relationship = 'NORMAL'
     and normal_o.status <> 'CANCELLED'
    join public.attendance_records ar
      on ar.occurrence_id = normal_o.id
    where override_o.institution_id = p_institution_id
      and override_o.school_date between p_start_date and p_end_date
      and override_o.schedule_relationship in ('REPLACE_NORMAL', 'CANCEL_NORMAL')
  ) then
    raise exception 'SCHEDULE_OVERRIDE_CONFLICT_WITH_ATTENDANCE';
  end if;

  with cancelled as (
    update public.attendance_session_occurrences normal_o
    set status = 'CANCELLED', updated_at = now()
    where normal_o.institution_id = p_institution_id
      and normal_o.school_date between p_start_date and p_end_date
      and normal_o.schedule_relationship = 'NORMAL'
      and normal_o.status <> 'CANCELLED'
      and exists (
        select 1
        from public.attendance_session_occurrences override_o
        where override_o.institution_id = normal_o.institution_id
          and override_o.school_date = normal_o.school_date
          and override_o.schedule_relationship in ('REPLACE_NORMAL', 'CANCEL_NORMAL')
      )
    returning normal_o.id
  )
  update public.session_participants sp
  set eligibility = 'CANCELLED', required = false, resolved_at = now()
  where sp.occurrence_id in (select id from cancelled);

  get diagnostics v_cancelled_normal = row_count;

  return jsonb_build_object(
    'institutionId', p_institution_id,
    'startDate', p_start_date,
    'endDate', p_end_date,
    'createdOccurrences', v_created,
    'existingOccurrences', v_existing,
    'createdParticipants', v_participants,
    'cancelledNormalParticipantRows', v_cancelled_normal
  );
end;
$$;

revoke all on function public.schedule_rule_matches_date(text, date, date) from public;
revoke all on function public.schedule_rule_matches_date(text, date, date) from anon;
revoke all on function public.schedule_rule_matches_date(text, date, date) from authenticated;
grant execute on function public.schedule_rule_matches_date(text, date, date) to service_role;

revoke all on function public.materialize_attendance_schedule_range(uuid, date, date) from public;
revoke all on function public.materialize_attendance_schedule_range(uuid, date, date) from anon;
revoke all on function public.materialize_attendance_schedule_range(uuid, date, date) from authenticated;
grant execute on function public.materialize_attendance_schedule_range(uuid, date, date) to service_role;