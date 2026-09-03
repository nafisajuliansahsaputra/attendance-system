-- Attendance System fictional portfolio seed
-- All people, identifiers, schedules, RFID UIDs, and biometric references
-- below are synthetic demo data. They must never be presented as real student data.

begin;

insert into public.institutions (id, name, timezone)
values ('11111111-1111-4111-8111-111111111111', 'SMK Amaliah 1 & 2 Ciawi', 'Asia/Jakarta')
on conflict (id) do update set
  name = excluded.name,
  timezone = excluded.timezone;

insert into public.academic_years (id, institution_id, label, starts_on, ends_on, is_active)
values (
  '11111111-1111-4111-8111-111111111201',
  '11111111-1111-4111-8111-111111111111',
  '2026/2027',
  '2026-07-01',
  '2027-06-30',
  true
)
on conflict (id) do update set
  label = excluded.label,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active;

insert into public.terms (id, academic_year_id, name, sequence, starts_on, ends_on)
values
  ('11111111-1111-4111-8111-111111111211', '11111111-1111-4111-8111-111111111201', 'Semester Ganjil', 1, '2026-07-01', '2026-12-31'),
  ('11111111-1111-4111-8111-111111111212', '11111111-1111-4111-8111-111111111201', 'Semester Genap', 2, '2027-01-01', '2027-06-30')
on conflict (id) do update set
  name = excluded.name,
  sequence = excluded.sequence,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on;

insert into public.grade_levels (id, institution_id, code, name, sort_order)
values
  ('11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111111', 'X', 'Kelas X', 10),
  ('11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111111', 'XI', 'Kelas XI', 11)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.departments (id, institution_id, code, name)
values ('11111111-1111-4111-8111-111111111401', '11111111-1111-4111-8111-111111111111', 'RPL', 'Rekayasa Perangkat Lunak')
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name;

insert into public.classes (id, institution_id, grade_level_id, department_id, code, name, is_active)
values
  ('11111111-1111-4111-8111-111111111501', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111401', 'X-RPL-1', 'X RPL 1', true),
  ('11111111-1111-4111-8111-111111111502', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111401', 'XI-RPL-1', 'XI RPL 1', true)
on conflict (id) do update set
  grade_level_id = excluded.grade_level_id,
  department_id = excluded.department_id,
  code = excluded.code,
  name = excluded.name,
  is_active = excluded.is_active;

insert into public.students (id, institution_id, nis, full_name, is_active)
values
  ('22222222-2222-4222-8222-222222222001', '11111111-1111-4111-8111-111111111111', 'DEMO1001', 'Alya Pratama', true),
  ('22222222-2222-4222-8222-222222222002', '11111111-1111-4111-8111-111111111111', 'DEMO1002', 'Bima Mahendra', true),
  ('22222222-2222-4222-8222-222222222003', '11111111-1111-4111-8111-111111111111', 'DEMO1101', 'Citra Lestari', true),
  ('22222222-2222-4222-8222-222222222004', '11111111-1111-4111-8111-111111111111', 'DEMO1102', 'Damar Wijaya', true)
on conflict (id) do update set
  nis = excluded.nis,
  full_name = excluded.full_name,
  is_active = excluded.is_active;

insert into public.student_enrollments (
  id, institution_id, academic_year_id, student_id, class_id, enrolled_on, status
)
values
  ('33333333-3333-4333-8333-333333333001', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111201', '22222222-2222-4222-8222-222222222001', '11111111-1111-4111-8111-111111111501', '2026-07-01', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333002', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111201', '22222222-2222-4222-8222-222222222002', '11111111-1111-4111-8111-111111111501', '2026-07-01', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333003', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111201', '22222222-2222-4222-8222-222222222003', '11111111-1111-4111-8111-111111111502', '2026-07-01', 'ACTIVE'),
  ('33333333-3333-4333-8333-333333333004', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111201', '22222222-2222-4222-8222-222222222004', '11111111-1111-4111-8111-111111111502', '2026-07-01', 'ACTIVE')
on conflict (id) do update set
  class_id = excluded.class_id,
  enrolled_on = excluded.enrolled_on,
  status = excluded.status;

insert into public.rfid_credentials (id, institution_id, student_id, uid, status)
values
  ('44444444-4444-4444-8444-444444444001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222001', 'DE:MO:10:01', 'ACTIVE'),
  ('44444444-4444-4444-8444-444444444002', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222002', 'DE:MO:10:02', 'ACTIVE'),
  ('44444444-4444-4444-8444-444444444003', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222003', 'DE:MO:11:01', 'ACTIVE'),
  ('44444444-4444-4444-8444-444444444004', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222004', 'DE:MO:11:02', 'ACTIVE')
on conflict (id) do update set
  student_id = excluded.student_id,
  uid = excluded.uid,
  status = excluded.status;

insert into public.face_profiles (
  id, institution_id, student_id, status, model_name, model_version,
  template_reference, template_fingerprint
)
values
  ('55555555-5555-4555-8555-555555555001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222001', 'ACTIVE', 'demo-face-adapter', 'v1', 'demo://face/alya-pratama', 'demo-fp-alya-v1'),
  ('55555555-5555-4555-8555-555555555002', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222002', 'ACTIVE', 'demo-face-adapter', 'v1', 'demo://face/bima-mahendra', 'demo-fp-bima-v1'),
  ('55555555-5555-4555-8555-555555555003', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222003', 'ACTIVE', 'demo-face-adapter', 'v1', 'demo://face/citra-lestari', 'demo-fp-citra-v1'),
  ('55555555-5555-4555-8555-555555555004', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222004', 'ACTIVE', 'demo-face-adapter', 'v1', 'demo://face/damar-wijaya', 'demo-fp-damar-v1')
on conflict (id) do update set
  status = excluded.status,
  model_name = excluded.model_name,
  model_version = excluded.model_version,
  template_reference = excluded.template_reference,
  template_fingerprint = excluded.template_fingerprint;

insert into public.attendance_session_templates (
  id, institution_id, code, name, session_type, attendance_mode,
  face_verification_required, late_enabled, is_active
)
values
  ('66666666-6666-4666-8666-666666666001', '11111111-1111-4111-8111-111111111111', 'ARRIVAL', 'Masuk Sekolah', 'SCHOOL_ARRIVAL', 'CHECK_IN', true, true, true),
  ('66666666-6666-4666-8666-666666666002', '11111111-1111-4111-8111-111111111111', 'DHUHA', 'Absensi Dhuha', 'DHUHA', 'SINGLE_PRESENCE', true, false, true),
  ('66666666-6666-4666-8666-666666666003', '11111111-1111-4111-8111-111111111111', 'CEREMONY', 'Upacara Sekolah', 'CEREMONY', 'SINGLE_PRESENCE', true, false, true)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  session_type = excluded.session_type,
  attendance_mode = excluded.attendance_mode,
  face_verification_required = excluded.face_verification_required,
  late_enabled = excluded.late_enabled,
  is_active = excluded.is_active;

-- These schedule values are synthetic fixtures for testing, not claims about the real school schedule.
insert into public.attendance_schedule_rules (
  id, institution_id, session_template_id, name, recurrence_rule,
  starts_on, opens_at, late_after_at, closes_at,
  target_type, target_selector, schedule_relationship, is_active
)
values
  ('77777777-7777-4777-8777-777777777001', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666001', 'Demo Hari Sekolah', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-07-01', '06:00', '07:00', '07:30', 'ALL_STUDENTS', '{}'::jsonb, 'NORMAL', true),
  ('77777777-7777-4777-8777-777777777002', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666002', 'Demo Dhuha Kelas X Hari Kamis', 'FREQ=WEEKLY;BYDAY=TH', '2026-07-01', '07:45', null, '08:30', 'GRADE_LEVELS', '{"grade_codes":["X"]}'::jsonb, 'ADDITIVE', true),
  ('77777777-7777-4777-8777-777777777003', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666003', 'Demo Upacara 17 Agustus', null, '2026-08-17', '06:30', null, '08:00', 'ALL_STUDENTS', '{}'::jsonb, 'ADDITIVE', true)
on conflict (id) do update set
  name = excluded.name,
  recurrence_rule = excluded.recurrence_rule,
  opens_at = excluded.opens_at,
  late_after_at = excluded.late_after_at,
  closes_at = excluded.closes_at,
  target_type = excluded.target_type,
  target_selector = excluded.target_selector,
  schedule_relationship = excluded.schedule_relationship,
  is_active = excluded.is_active;

insert into public.attendance_session_occurrences (
  id, institution_id, session_template_id, source_schedule_rule_id,
  name_snapshot, session_type_snapshot, attendance_mode_snapshot,
  school_date, opens_at, late_after_at, closes_at,
  schedule_relationship, status, target_snapshot, face_verification_required
)
values
  ('88888888-8888-4888-8888-888888888001', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666001', '77777777-7777-4777-8777-777777777001', 'Masuk Sekolah', 'SCHOOL_ARRIVAL', 'CHECK_IN', '2026-09-03', '2026-09-03 06:00:00+07', '2026-09-03 07:00:00+07', '2026-09-03 07:30:00+07', 'NORMAL', 'CLOSED', '{"target":"ALL_STUDENTS","fixture":true}'::jsonb, true),
  ('88888888-8888-4888-8888-888888888002', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666002', '77777777-7777-4777-8777-777777777002', 'Dhuha Kelas X', 'DHUHA', 'SINGLE_PRESENCE', '2026-09-03', '2026-09-03 07:45:00+07', null, '2026-09-03 08:30:00+07', 'ADDITIVE', 'CLOSED', '{"grade_codes":["X"],"fixture":true}'::jsonb, true),
  ('88888888-8888-4888-8888-888888888003', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666003', '77777777-7777-4777-8777-777777777003', 'Upacara 17 Agustus', 'CEREMONY', 'SINGLE_PRESENCE', '2026-08-17', '2026-08-17 06:30:00+07', null, '2026-08-17 08:00:00+07', 'ADDITIVE', 'CLOSED', '{"target":"ALL_STUDENTS","fixture":true}'::jsonb, true)
on conflict (id) do update set
  name_snapshot = excluded.name_snapshot,
  opens_at = excluded.opens_at,
  late_after_at = excluded.late_after_at,
  closes_at = excluded.closes_at,
  status = excluded.status,
  target_snapshot = excluded.target_snapshot;

insert into public.session_participants (id, occurrence_id, student_id, enrollment_id, eligibility, required)
values
  ('99999999-9999-4999-8999-999999999001', '88888888-8888-4888-8888-888888888001', '22222222-2222-4222-8222-222222222001', '33333333-3333-4333-8333-333333333001', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999002', '88888888-8888-4888-8888-888888888001', '22222222-2222-4222-8222-222222222002', '33333333-3333-4333-8333-333333333002', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999003', '88888888-8888-4888-8888-888888888001', '22222222-2222-4222-8222-222222222003', '33333333-3333-4333-8333-333333333003', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999004', '88888888-8888-4888-8888-888888888001', '22222222-2222-4222-8222-222222222004', '33333333-3333-4333-8333-333333333004', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999011', '88888888-8888-4888-8888-888888888002', '22222222-2222-4222-8222-222222222001', '33333333-3333-4333-8333-333333333001', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999012', '88888888-8888-4888-8888-888888888002', '22222222-2222-4222-8222-222222222002', '33333333-3333-4333-8333-333333333002', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999021', '88888888-8888-4888-8888-888888888003', '22222222-2222-4222-8222-222222222001', '33333333-3333-4333-8333-333333333001', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999022', '88888888-8888-4888-8888-888888888003', '22222222-2222-4222-8222-222222222002', '33333333-3333-4333-8333-333333333002', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999023', '88888888-8888-4888-8888-888888888003', '22222222-2222-4222-8222-222222222003', '33333333-3333-4333-8333-333333333003', 'ELIGIBLE', true),
  ('99999999-9999-4999-8999-999999999024', '88888888-8888-4888-8888-888888888003', '22222222-2222-4222-8222-222222222004', '33333333-3333-4333-8333-333333333004', 'ELIGIBLE', true)
on conflict (occurrence_id, student_id) do update set
  enrollment_id = excluded.enrollment_id,
  eligibility = excluded.eligibility,
  required = excluded.required;

insert into public.devices (id, institution_id, code, name, device_type, status, protocol_version, metadata)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
  '11111111-1111-4111-8111-111111111111',
  'SIM-PORTFOLIO-01',
  'Terminal Absensi Simulasi',
  'SIMULATOR',
  'ACTIVE',
  'v1',
  '{"fixture":true,"description":"Perangkat simulasi untuk pengujian sistem absensi"}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  protocol_version = excluded.protocol_version,
  metadata = excluded.metadata;

commit;
