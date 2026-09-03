create or replace function public.get_reporting_period_presets(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_year public.academic_years%rowtype;
  v_terms jsonb := '[]'::jsonb;
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

  select ay.*
    into v_year
  from public.academic_years ay
  where ay.institution_id = v_profile.institution_id
    and ay.is_active = true
  order by ay.starts_on desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'academicYear', null,
      'terms', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'sequence', t.sequence,
        'startsOn', t.starts_on,
        'endsOn', t.ends_on
      )
      order by t.sequence, t.starts_on
    ),
    '[]'::jsonb
  )
  into v_terms
  from public.terms t
  where t.academic_year_id = v_year.id;

  return jsonb_build_object(
    'academicYear', jsonb_build_object(
      'id', v_year.id,
      'label', v_year.label,
      'startsOn', v_year.starts_on,
      'endsOn', v_year.ends_on
    ),
    'terms', v_terms
  );
end;
$$;

revoke all on function public.get_reporting_period_presets(uuid) from public;
revoke all on function public.get_reporting_period_presets(uuid) from anon;
revoke all on function public.get_reporting_period_presets(uuid) from authenticated;
grant execute on function public.get_reporting_period_presets(uuid) to service_role;
