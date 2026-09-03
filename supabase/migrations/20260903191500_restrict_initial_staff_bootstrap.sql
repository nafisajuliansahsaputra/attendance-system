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

    if p_role <> 'SYSTEM_ADMIN' then
      raise exception 'INITIAL_BOOTSTRAP_MUST_BE_SYSTEM_ADMIN';
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

revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from public;
revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from anon;
revoke all on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) from authenticated;
grant execute on function public.provision_staff_profile(uuid, uuid, text, text, uuid, uuid, uuid) to service_role;
