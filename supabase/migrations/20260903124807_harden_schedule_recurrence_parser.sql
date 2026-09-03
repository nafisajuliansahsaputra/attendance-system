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
  v_rule text;
  v_match text[];
  v_freq text;
  v_byday text;
  v_interval integer := 1;
  v_day_code text;
  v_days integer;
  v_weeks integer;
  v_start_week date;
  v_date_week date;
begin
  if p_starts_on is null or p_date is null or p_date < p_starts_on then
    return false;
  end if;

  if p_recurrence_rule is null or btrim(p_recurrence_rule) = '' then
    return p_date = p_starts_on;
  end if;

  v_rule := upper(btrim(p_recurrence_rule));

  if exists (
    select 1
    from unnest(string_to_array(v_rule, ';')) token
    where split_part(token, '=', 1) not in ('FREQ', 'BYDAY', 'INTERVAL')
       or position('=' in token) = 0
       or split_part(token, '=', 2) = ''
  ) then
    raise exception 'UNSUPPORTED_RECURRENCE_RULE: unsupported or malformed property';
  end if;

  v_match := regexp_match(v_rule, '(^|;)FREQ=([^;]+)');
  if v_match is null then
    raise exception 'UNSUPPORTED_RECURRENCE_RULE: missing FREQ';
  end if;
  v_freq := v_match[2];

  v_match := regexp_match(v_rule, '(^|;)BYDAY=([^;]+)');
  if v_match is not null then
    v_byday := v_match[2];

    if exists (
      select 1
      from unnest(string_to_array(v_byday, ',')) day_code
      where day_code not in ('MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU')
    ) then
      raise exception 'UNSUPPORTED_RECURRENCE_RULE: invalid BYDAY value';
    end if;
  end if;

  v_match := regexp_match(v_rule, '(^|;)INTERVAL=([0-9]+)');
  if v_match is not null then
    v_interval := v_match[2]::integer;
    if v_interval < 1 then
      raise exception 'UNSUPPORTED_RECURRENCE_RULE: INTERVAL must be >= 1';
    end if;
  elsif v_rule ~ '(^|;)INTERVAL=' then
    raise exception 'UNSUPPORTED_RECURRENCE_RULE: invalid INTERVAL value';
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
    if v_byday is not null then
      raise exception 'UNSUPPORTED_RECURRENCE_RULE: BYDAY with DAILY is not supported yet';
    end if;

    return mod(v_days, v_interval) = 0;
  elsif v_freq = 'WEEKLY' then
    v_start_week := p_starts_on - (extract(isodow from p_starts_on)::integer - 1);
    v_date_week := p_date - (extract(isodow from p_date)::integer - 1);
    v_weeks := (v_date_week - v_start_week) / 7;

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

revoke all on function public.schedule_rule_matches_date(text, date, date) from public;
revoke all on function public.schedule_rule_matches_date(text, date, date) from anon;
revoke all on function public.schedule_rule_matches_date(text, date, date) from authenticated;
grant execute on function public.schedule_rule_matches_date(text, date, date) to service_role;
