create index if not exists device_pairing_sessions_institution_idx
  on public.device_pairing_sessions(institution_id);

create index if not exists device_pairing_sessions_created_by_idx
  on public.device_pairing_sessions(created_by);
