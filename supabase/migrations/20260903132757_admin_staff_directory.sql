create or replace function public.get_admin_staff_directory(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_role text;
begin
  select p.institution_id, p.role
    into v_institution_id, v_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'userId', p.user_id,
        'fullName', p.full_name,
        'role', p.role,
        'active', p.is_active,
        'createdAt', p.created_at,
        'homeroomAssignments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ha.id,
              'classId', c.id,
              'classCode', c.code,
              'className', c.name,
              'academicYearId', ay.id,
              'academicYearLabel', ay.label,
              'startsOn', ha.starts_on,
              'endsOn', ha.ends_on
            ) order by ay.starts_on desc, c.name
          )
          from public.homeroom_assignments ha
          join public.classes c on c.id = ha.class_id
          join public.academic_years ay on ay.id = ha.academic_year_id
          where ha.teacher_user_id = p.user_id
            and ha.institution_id = p.institution_id
        ), '[]'::jsonb)
      )
      order by p.full_name, p.user_id
    )
    from public.profiles p
    where p.institution_id = v_institution_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.set_admin_staff_active_status(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_active boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
  v_actor_role text;
  v_target public.profiles%rowtype;
  v_active_admin_count integer;
begin
  select p.institution_id, p.role
    into v_institution_id, v_actor_role
  from public.profiles p
  where p.user_id = p_actor_user_id
    and p.is_active = true;

  if v_institution_id is null or v_actor_role <> 'SYSTEM_ADMIN' then
    raise exception 'FORBIDDEN_ADMIN_ONLY';
  end if;

  if p_target_user_id = p_actor_user_id and p_active = false then
    raise exception 'CANNOT_DEACTIVATE_SELF';
  end if;

  select p.* into v_target
  from public.profiles p
  where p.user_id = p_target_user_id
    and p.institution_id = v_institution_id
  for update;

  if not found then
    raise exception 'STAFF_PROFILE_NOT_FOUND';
  end if;

  if v_target.role = 'SYSTEM_ADMIN' and p_active = false and v_target.is_active = true then
    select count(*) into v_active_admin_count
    from public.profiles p
    where p.institution_id = v_institution_id
      and p.role = 'SYSTEM_ADMIN'
      and p.is_active = true;

    if v_active_admin_count <= 1 then
      raise exception 'CANNOT_DEACTIVATE_LAST_ADMIN';
    end if;
  end if;

  if v_target.is_active is distinct from p_active then
    update public.profiles
    set is_active = p_active,
        updated_at = now()
    where user_id = p_target_user_id;

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
      v_institution_id,
      p_actor_user_id,
      'STAFF_ACTIVE_STATUS_CHANGED',
      'profile',
      p_target_user_id,
      jsonb_build_object('active', v_target.is_active, 'role', v_target.role),
      jsonb_build_object('active', p_active, 'role', v_target.role),
      nullif(btrim(p_note), '')
    );
  end if;

  return jsonb_build_object(
    'userId', p_target_user_id,
    'active', p_active,
    'role', v_target.role
  );
end;
$$;

revoke all on function public.get_admin_staff_directory(uuid) from public;
revoke all on function public.get_admin_staff_directory(uuid) from anon;
revoke all on function public.get_admin_staff_directory(uuid) from authenticated;
grant execute on function public.get_admin_staff_directory(uuid) to service_role;

revoke all on function public.set_admin_staff_active_status(uuid, uuid, boolean, text) from public;
revoke all on function public.set_admin_staff_active_status(uuid, uuid, boolean, text) from anon;
revoke all on function public.set_admin_staff_active_status(uuid, uuid, boolean, text) from authenticated;
grant execute on function public.set_admin_staff_active_status(uuid, uuid, boolean, text) to service_role;
