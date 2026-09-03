create unique index if not exists rfid_one_active_per_student_idx
  on public.rfid_credentials(student_id)
  where status = 'ACTIVE';

create or replace function public.get_admin_student_directory(
  p_actor_user_id uuid,
  p_search text default null,
  p_class_id uuid default null
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
  v_rows jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'actor user id is required';
  end if;

  select p.*
    into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then
    raise exception 'AUTH_PROFILE_NOT_FOUND';
  end if;

  if v_profile.role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  select i.timezone
    into v_timezone
  from public.institutions i
  where i.id = v_profile.institution_id;

  if v_timezone is null then
    raise exception 'INSTITUTION_NOT_FOUND';
  end if;

  v_school_date := (now() at time zone v_timezone)::date;

  if p_class_id is not null and not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.institution_id = v_profile.institution_id
  ) then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  with directory as (
    select
      s.id as student_id,
      s.nis,
      s.full_name,
      s.is_active,
      e.id as enrollment_id,
      c.id as class_id,
      c.code as class_code,
      c.name as class_name,
      r.id as rfid_credential_id,
      r.uid as rfid_uid,
      r.registered_at as rfid_registered_at,
      f.id as face_profile_id,
      f.status as face_status,
      f.model_name as face_model_name,
      f.model_version as face_model_version,
      f.enrolled_at as face_enrolled_at
    from public.students s
    left join lateral (
      select e0.*
      from public.student_enrollments e0
      where e0.institution_id = v_profile.institution_id
        and e0.student_id = s.id
        and e0.status = 'ACTIVE'
        and e0.enrolled_on <= v_school_date
        and (e0.exited_on is null or e0.exited_on >= v_school_date)
      order by e0.enrolled_on desc
      limit 1
    ) e on true
    left join public.classes c on c.id = e.class_id
    left join lateral (
      select r0.*
      from public.rfid_credentials r0
      where r0.institution_id = v_profile.institution_id
        and r0.student_id = s.id
        and r0.status = 'ACTIVE'
      order by r0.registered_at desc
      limit 1
    ) r on true
    left join lateral (
      select f0.*
      from public.face_profiles f0
      where f0.institution_id = v_profile.institution_id
        and f0.student_id = s.id
        and f0.status = 'ACTIVE'
      order by f0.enrolled_at desc
      limit 1
    ) f on true
    where s.institution_id = v_profile.institution_id
      and (
        p_class_id is null
        or c.id = p_class_id
      )
      and (
        p_search is null
        or btrim(p_search) = ''
        or s.nis ilike '%' || btrim(p_search) || '%'
        or s.full_name ilike '%' || btrim(p_search) || '%'
        or r.uid ilike '%' || btrim(p_search) || '%'
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'studentId', student_id,
          'nis', nis,
          'fullName', full_name,
          'active', is_active,
          'enrollmentId', enrollment_id,
          'classId', class_id,
          'classCode', class_code,
          'className', class_name,
          'rfidCredentialId', rfid_credential_id,
          'rfidUid', rfid_uid,
          'rfidRegisteredAt', rfid_registered_at,
          'faceProfileId', face_profile_id,
          'faceStatus', face_status,
          'faceModelName', face_model_name,
          'faceModelVersion', face_model_version,
          'faceEnrolledAt', face_enrolled_at
        )
      )
      order by class_name nulls last, full_name, nis
    ),
    '[]'::jsonb
  )
  into v_rows
  from directory;

  return v_rows;
end;
$$;

create or replace function public.assign_student_rfid(
  p_actor_user_id uuid,
  p_student_id uuid,
  p_uid text,
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
  v_uid text;
  v_existing public.rfid_credentials%rowtype;
  v_new_id uuid;
  v_replaced_count int := 0;
  v_before jsonb;
begin
  if p_actor_user_id is null or p_student_id is null then
    raise exception 'actor and student are required';
  end if;

  v_uid := upper(btrim(coalesce(p_uid, '')));
  if v_uid = '' then
    raise exception 'RFID_UID_REQUIRED';
  end if;

  if length(v_uid) > 100 then
    raise exception 'RFID_UID_TOO_LONG';
  end if;

  select p.*
    into v_profile
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if not found then
    raise exception 'AUTH_PROFILE_NOT_FOUND';
  end if;

  if v_profile.role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  select s.*
    into v_student
  from public.students s
  where s.id = p_student_id
    and s.institution_id = v_profile.institution_id;

  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select r.*
    into v_existing
  from public.rfid_credentials r
  where r.institution_id = v_profile.institution_id
    and r.uid = v_uid
    and r.status = 'ACTIVE'
  limit 1;

  if found then
    if v_existing.student_id = p_student_id then
      return jsonb_build_object(
        'credentialId', v_existing.id,
        'studentId', p_student_id,
        'uid', v_existing.uid,
        'replacedCount', 0,
        'unchanged', true
      );
    end if;

    raise exception 'RFID_UID_IN_USE';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'uid', r.uid,
        'status', r.status,
        'registeredAt', r.registered_at
      )
      order by r.registered_at desc
    ),
    '[]'::jsonb
  )
  into v_before
  from public.rfid_credentials r
  where r.institution_id = v_profile.institution_id
    and r.student_id = p_student_id
    and r.status = 'ACTIVE';

  update public.rfid_credentials r
  set
    status = 'REPLACED',
    revoked_at = now(),
    revoked_by = p_actor_user_id,
    revoke_reason = coalesce(nullif(btrim(p_note), ''), 'Replaced by administrator')
  where r.institution_id = v_profile.institution_id
    and r.student_id = p_student_id
    and r.status = 'ACTIVE';

  get diagnostics v_replaced_count = row_count;

  insert into public.rfid_credentials (
    institution_id,
    student_id,
    uid,
    status,
    registered_by,
    registered_at
  )
  values (
    v_profile.institution_id,
    p_student_id,
    v_uid,
    'ACTIVE',
    p_actor_user_id,
    now()
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
  )
  values (
    v_profile.institution_id,
    p_actor_user_id,
    'RFID_ASSIGNED',
    'rfid_credential',
    v_new_id,
    v_before,
    jsonb_build_object(
      'studentId', p_student_id,
      'uid', v_uid,
      'status', 'ACTIVE'
    ),
    nullif(btrim(p_note), '')
  );

  return jsonb_build_object(
    'credentialId', v_new_id,
    'studentId', p_student_id,
    'uid', v_uid,
    'replacedCount', v_replaced_count,
    'unchanged', false
  );
end;
$$;

revoke all on function public.get_admin_student_directory(uuid, text, uuid) from public;
revoke all on function public.get_admin_student_directory(uuid, text, uuid) from anon;
revoke all on function public.get_admin_student_directory(uuid, text, uuid) from authenticated;
grant execute on function public.get_admin_student_directory(uuid, text, uuid) to service_role;

revoke all on function public.assign_student_rfid(uuid, uuid, text, text) from public;
revoke all on function public.assign_student_rfid(uuid, uuid, text, text) from anon;
revoke all on function public.assign_student_rfid(uuid, uuid, text, text) from authenticated;
grant execute on function public.assign_student_rfid(uuid, uuid, text, text) to service_role;
