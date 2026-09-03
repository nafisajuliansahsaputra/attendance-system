create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_year_dates_valid check (ends_on >= starts_on),
  unique (institution_id, label)
);

create unique index academic_year_one_active_per_institution_idx on public.academic_years(institution_id) where is_active;

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  sequence smallint not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_sequence_valid check (sequence > 0),
  constraint term_dates_valid check (ends_on >= starts_on),
  unique (academic_year_id, sequence)
);

create table public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code text not null,
  name text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  grade_level_id uuid not null references public.grade_levels(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  full_name text not null,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_role_valid check (role in ('SYSTEM_ADMIN', 'HOMEROOM_TEACHER', 'OPERATOR'))
);

create table public.homeroom_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_user_id uuid not null references public.profiles(user_id) on delete cascade,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  constraint homeroom_assignment_dates_valid check (ends_on is null or starts_on is null or ends_on >= starts_on),
  unique (academic_year_id, class_id, teacher_user_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  nis text not null,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, nis)
);

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  enrolled_on date not null,
  exited_on date,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_status_valid check (status in ('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN')),
  constraint enrollment_dates_valid check (exited_on is null or exited_on >= enrolled_on),
  unique (academic_year_id, student_id)
);

create table public.rfid_credentials (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  uid text not null,
  status text not null default 'ACTIVE',
  registered_by uuid references public.profiles(user_id) on delete set null,
  registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(user_id) on delete set null,
  revoke_reason text,
  created_at timestamptz not null default now(),
  constraint rfid_status_valid check (status in ('ACTIVE', 'REVOKED', 'LOST', 'REPLACED'))
);

create unique index rfid_active_uid_unique_idx on public.rfid_credentials(institution_id, uid) where status = 'ACTIVE';

create table public.face_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'ACTIVE',
  model_name text not null,
  model_version text not null,
  template_reference text,
  template_fingerprint text,
  enrolled_by uuid references public.profiles(user_id) on delete set null,
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint face_profile_status_valid check (status in ('ACTIVE', 'REVOKED', 'PENDING_REENROLLMENT'))
);

create unique index face_profile_one_active_per_student_idx on public.face_profiles(student_id) where status = 'ACTIVE';

create table public.attendance_session_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code text not null,
  name text not null,
  session_type text not null,
  attendance_mode text not null,
  face_verification_required boolean not null default true,
  late_enabled boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_type_valid check (session_type in ('SCHOOL_ARRIVAL', 'SCHOOL_DEPARTURE', 'DHUHA', 'DZUHUR', 'ASHAR', 'CEREMONY', 'SCHOOL_ACTIVITY', 'CUSTOM')),
  constraint attendance_mode_valid check (attendance_mode in ('SINGLE_PRESENCE', 'CHECK_IN', 'CHECK_OUT', 'PAIRED_CHECK_IN_OUT')),
  unique (institution_id, code)
);

create table public.attendance_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  session_template_id uuid not null references public.attendance_session_templates(id) on delete cascade,
  name text not null,
  recurrence_rule text,
  starts_on date not null,
  ends_on date,
  opens_at time not null,
  late_after_at time,
  closes_at time not null,
  target_type text not null,
  target_selector jsonb not null default '{}'::jsonb,
  schedule_relationship text not null default 'NORMAL',
  is_active boolean not null default true,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rule_dates_valid check (ends_on is null or ends_on >= starts_on),
  constraint schedule_rule_times_valid check (closes_at >= opens_at),
  constraint schedule_rule_late_valid check (late_after_at is null or (late_after_at >= opens_at and late_after_at <= closes_at)),
  constraint target_type_valid check (target_type in ('ALL_STUDENTS', 'GRADE_LEVELS', 'CLASSES', 'DEPARTMENTS', 'SELECTED_STUDENTS')),
  constraint schedule_relationship_valid check (schedule_relationship in ('NORMAL', 'ADDITIVE', 'REPLACE_NORMAL', 'CANCEL_NORMAL'))
);

create table public.attendance_session_occurrences (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  session_template_id uuid not null references public.attendance_session_templates(id) on delete restrict,
  source_schedule_rule_id uuid references public.attendance_schedule_rules(id) on delete set null,
  name_snapshot text not null,
  session_type_snapshot text not null,
  attendance_mode_snapshot text not null,
  school_date date not null,
  opens_at timestamptz not null,
  late_after_at timestamptz,
  closes_at timestamptz not null,
  schedule_relationship text not null default 'NORMAL',
  status text not null default 'SCHEDULED',
  target_snapshot jsonb not null default '{}'::jsonb,
  face_verification_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occurrence_times_valid check (closes_at >= opens_at),
  constraint occurrence_late_valid check (late_after_at is null or (late_after_at >= opens_at and late_after_at <= closes_at)),
  constraint occurrence_status_valid check (status in ('SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED')),
  constraint occurrence_relationship_valid check (schedule_relationship in ('NORMAL', 'ADDITIVE', 'REPLACE_NORMAL', 'CANCEL_NORMAL'))
);

create index attendance_occurrence_date_idx on public.attendance_session_occurrences(institution_id, school_date);
create index attendance_occurrence_window_idx on public.attendance_session_occurrences(institution_id, opens_at, closes_at);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.attendance_session_occurrences(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.student_enrollments(id) on delete set null,
  eligibility text not null default 'ELIGIBLE',
  required boolean not null default true,
  resolved_at timestamptz not null default now(),
  constraint session_participant_eligibility_valid check (eligibility in ('ELIGIBLE', 'NOT_ELIGIBLE', 'CANCELLED')),
  unique (occurrence_id, student_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  code text not null,
  name text not null,
  device_type text not null,
  status text not null default 'ACTIVE',
  protocol_version text not null default 'v1',
  secret_hash text,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_type_valid check (device_type in ('SIMULATOR', 'ARDUINO_BRIDGE', 'ESP32', 'OTHER')),
  constraint device_status_valid check (status in ('ACTIVE', 'DISABLED', 'REVOKED')),
  unique (institution_id, code)
);

create table public.device_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  request_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  student_id uuid references public.students(id) on delete set null,
  occurrence_id uuid references public.attendance_session_occurrences(id) on delete set null,
  rfid_credential_id uuid references public.rfid_credentials(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint device_event_type_valid check (event_type in ('RFID_SCANNED', 'UNKNOWN_CARD', 'FACE_CAPTURED', 'FACE_VERIFIED', 'FACE_REJECTED', 'ATTENDANCE_ACCEPTED', 'ATTENDANCE_DUPLICATE', 'NOT_ELIGIBLE', 'OUTSIDE_SESSION', 'DEVICE_HEARTBEAT', 'DEVICE_ERROR'))
);

create unique index device_event_request_unique_idx on public.device_events(device_id, request_id, event_type) where request_id is not null;
create index device_events_received_idx on public.device_events(institution_id, received_at desc);
create index device_events_student_idx on public.device_events(student_id, occurred_at desc);

create table public.verification_attempts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  request_id text not null,
  device_id uuid references public.devices(id) on delete set null,
  device_event_id uuid references public.device_events(id) on delete set null,
  occurrence_id uuid references public.attendance_session_occurrences(id) on delete set null,
  expected_student_id uuid not null references public.students(id) on delete restrict,
  face_profile_id uuid references public.face_profiles(id) on delete set null,
  result text not null,
  score numeric(8,6),
  threshold numeric(8,6),
  model_name text,
  model_version text,
  failure_code text,
  attempted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint verification_result_valid check (result in ('MATCH', 'MISMATCH', 'NO_FACE', 'LOW_QUALITY', 'SERVICE_ERROR', 'NOT_REQUIRED')),
  unique (institution_id, request_id)
);

create index verification_attempts_student_idx on public.verification_attempts(expected_student_id, attempted_at desc);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  occurrence_id uuid not null references public.attendance_session_occurrences(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.student_enrollments(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  verification_attempt_id uuid references public.verification_attempts(id) on delete set null,
  attendance_status text not null,
  accepted_at timestamptz not null,
  source text not null default 'DEVICE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_record_status_valid check (attendance_status in ('ON_TIME', 'LATE', 'COMPLETED')),
  constraint attendance_record_source_valid check (source in ('DEVICE', 'AUTHORIZED_CORRECTION')),
  unique (occurrence_id, student_id)
);

create index attendance_records_student_idx on public.attendance_records(student_id, accepted_at desc);
create index attendance_records_occurrence_idx on public.attendance_records(occurrence_id, attendance_status);

create table public.school_day_attendance (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.student_enrollments(id) on delete set null,
  school_date date not null,
  arrival_attendance_record_id uuid references public.attendance_records(id) on delete set null,
  departure_attendance_record_id uuid references public.attendance_records(id) on delete set null,
  system_state text not null,
  final_status text,
  finalized_by uuid references public.profiles(user_id) on delete set null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_day_system_state_valid check (system_state in ('PRESENT_ON_TIME', 'PRESENT_LATE', 'NO_VALID_ARRIVAL', 'PENDING_CONFIRMATION')),
  constraint school_day_final_status_valid check (final_status is null or final_status in ('PRESENT', 'LATE', 'SAKIT', 'IZIN', 'ALPA')),
  unique (institution_id, student_id, school_date)
);

create index school_day_attendance_date_idx on public.school_day_attendance(institution_id, school_date);

create table public.attendance_confirmations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  school_day_attendance_id uuid not null references public.school_day_attendance(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(user_id) on delete restrict,
  previous_status text,
  new_status text not null,
  note text,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint attendance_confirmation_previous_valid check (previous_status is null or previous_status in ('PRESENT', 'LATE', 'SAKIT', 'IZIN', 'ALPA')),
  constraint attendance_confirmation_new_valid check (new_status in ('SAKIT', 'IZIN', 'ALPA'))
);

create index attendance_confirmations_day_idx on public.attendance_confirmations(school_day_attendance_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null,
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger institutions_set_updated_at before update on public.institutions for each row execute function public.set_updated_at();
create trigger academic_years_set_updated_at before update on public.academic_years for each row execute function public.set_updated_at();
create trigger terms_set_updated_at before update on public.terms for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger student_enrollments_set_updated_at before update on public.student_enrollments for each row execute function public.set_updated_at();
create trigger face_profiles_set_updated_at before update on public.face_profiles for each row execute function public.set_updated_at();
create trigger attendance_session_templates_set_updated_at before update on public.attendance_session_templates for each row execute function public.set_updated_at();
create trigger attendance_schedule_rules_set_updated_at before update on public.attendance_schedule_rules for each row execute function public.set_updated_at();
create trigger attendance_session_occurrences_set_updated_at before update on public.attendance_session_occurrences for each row execute function public.set_updated_at();
create trigger devices_set_updated_at before update on public.devices for each row execute function public.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
create trigger school_day_attendance_set_updated_at before update on public.school_day_attendance for each row execute function public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.academic_years enable row level security;
alter table public.terms enable row level security;
alter table public.grade_levels enable row level security;
alter table public.departments enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.homeroom_assignments enable row level security;
alter table public.students enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.rfid_credentials enable row level security;
alter table public.face_profiles enable row level security;
alter table public.attendance_session_templates enable row level security;
alter table public.attendance_schedule_rules enable row level security;
alter table public.attendance_session_occurrences enable row level security;
alter table public.session_participants enable row level security;
alter table public.devices enable row level security;
alter table public.device_events enable row level security;
alter table public.verification_attempts enable row level security;
alter table public.attendance_records enable row level security;
alter table public.school_day_attendance enable row level security;
alter table public.attendance_confirmations enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on function public.set_updated_at() from public;
