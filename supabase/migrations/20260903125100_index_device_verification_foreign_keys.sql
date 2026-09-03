create index if not exists device_verification_transactions_institution_idx
  on public.device_verification_transactions(institution_id);

create index if not exists device_verification_transactions_student_idx
  on public.device_verification_transactions(student_id);

create index if not exists device_verification_transactions_occurrence_idx
  on public.device_verification_transactions(occurrence_id);

create index if not exists device_verification_transactions_face_profile_idx
  on public.device_verification_transactions(face_profile_id);
