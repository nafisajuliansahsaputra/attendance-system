create or replace function public.get_device_verification_transaction_state(
  p_device_id uuid,
  p_transaction_id uuid,
  p_request_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tx public.device_verification_transactions%rowtype;
  v_event public.device_events%rowtype;
  v_verification public.verification_attempts%rowtype;
  v_attendance public.attendance_records%rowtype;
begin
  update public.device_verification_transactions
  set status = 'EXPIRED'
  where id = p_transaction_id
    and status = 'PENDING'
    and expires_at <= now();

  select t.* into v_tx
  from public.device_verification_transactions t
  where t.id = p_transaction_id
    and t.device_id = p_device_id
    and t.request_id = p_request_id;

  if not found then
    raise exception 'VERIFICATION_TRANSACTION_NOT_FOUND';
  end if;

  if v_tx.status = 'CONSUMED' then
    select de.* into v_event
    from public.device_events de
    where de.device_id = v_tx.device_id
      and de.request_id = v_tx.request_id
      and de.event_type in ('ATTENDANCE_ACCEPTED', 'FACE_REJECTED', 'DEVICE_ERROR')
    order by de.created_at desc
    limit 1;

    select va.* into v_verification
    from public.verification_attempts va
    where va.institution_id = v_tx.institution_id
      and va.request_id = v_tx.request_id
    limit 1;

    if v_verification.id is not null then
      select ar.* into v_attendance
      from public.attendance_records ar
      where ar.verification_attempt_id = v_verification.id
      limit 1;
    end if;

    return jsonb_build_object(
      'transactionId', v_tx.id,
      'status', v_tx.status,
      'expiresAt', v_tx.expires_at,
      'consumedAt', v_tx.consumed_at,
      'outcomeCode', v_event.payload->>'outcome_code',
      'accepted', coalesce((v_event.payload->>'accepted')::boolean, v_attendance.id is not null),
      'verificationResult', v_verification.result,
      'verificationScore', v_verification.score,
      'attendanceRecordId', v_attendance.id
    );
  end if;

  return jsonb_build_object(
    'transactionId', v_tx.id,
    'status', v_tx.status,
    'expiresAt', v_tx.expires_at,
    'consumedAt', v_tx.consumed_at
  );
end;
$$;

revoke all on function public.get_device_verification_transaction_state(uuid, uuid, text) from public;
revoke all on function public.get_device_verification_transaction_state(uuid, uuid, text) from anon;
revoke all on function public.get_device_verification_transaction_state(uuid, uuid, text) from authenticated;
grant execute on function public.get_device_verification_transaction_state(uuid, uuid, text) to service_role;
