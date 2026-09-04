-- Attendance System fictional portfolio seed
-- All people, identifiers, schedules, RFID UIDs, and biometric references
-- below are synthetic demo data. They must never be presented as real student data.
--
-- School structure is modeled from public aggregate information for SMK Amaliah 1 & 2:
-- 9 official concentrations, three grade levels, and historical school-scale rombel counts.
-- Per-class student distribution, names, NIS values, RFID values, and biometric vectors are synthetic.

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
  ('11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111111', 'XI', 'Kelas XI', 11),
  ('11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111111', 'XII', 'Kelas XII', 12)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.departments (id, institution_id, code, name)
values
  ('11111111-1111-4111-8111-111111111401', '11111111-1111-4111-8111-111111111111', 'RPL', 'Rekayasa Perangkat Lunak'),
  ('11111111-1111-4111-8111-111111111402', '11111111-1111-4111-8111-111111111111', 'TKJ', 'Teknik Komputer dan Jaringan'),
  ('11111111-1111-4111-8111-111111111403', '11111111-1111-4111-8111-111111111111', 'AN', 'Animasi'),
  ('11111111-1111-4111-8111-111111111404', '11111111-1111-4111-8111-111111111111', 'DKV', 'Desain Komunikasi Visual'),
  ('11111111-1111-4111-8111-111111111405', '11111111-1111-4111-8111-111111111111', 'MP', 'Manajemen Perkantoran'),
  ('11111111-1111-4111-8111-111111111406', '11111111-1111-4111-8111-111111111111', 'AK', 'Akuntansi'),
  ('11111111-1111-4111-8111-111111111407', '11111111-1111-4111-8111-111111111111', 'LPS', 'Layanan Perbankan Syariah'),
  ('11111111-1111-4111-8111-111111111408', '11111111-1111-4111-8111-111111111111', 'BR', 'Bisnis Ritel'),
  ('11111111-1111-4111-8111-111111111409', '11111111-1111-4111-8111-111111111111', 'DPB', 'Desain dan Produksi Busana')
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name;

-- Historical aggregate references used only to size the fictional demo dataset:
-- SMK Amaliah 1: 20 rombel / about 597 students.
-- SMK Amaliah 2: 22 rombel / about 549 students.
-- The class-by-major breakdown below is intentionally synthetic but preserves that scale.
create temporary table demo_class_plan (
  id uuid primary key,
  grade_level_id uuid not null,
  department_id uuid not null,
  code text not null,
  name text not null,
  target_students integer not null
) on commit drop;

insert into demo_class_plan (id, grade_level_id, department_id, code, name, target_students)
values
  -- SMK Amaliah 1: IT & Kreatif — 20 rombel, 597 synthetic students.
  ('11111111-1111-4111-8111-111111111501', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111401', 'X-RPL-1', 'X RPL 1', 31),
  ('11111111-1111-4111-8111-111111111503', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111401', 'X-RPL-2', 'X RPL 2', 30),
  ('11111111-1111-4111-8111-111111111502', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111401', 'XI-RPL-1', 'XI RPL 1', 30),
  ('11111111-1111-4111-8111-111111111504', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111401', 'XI-RPL-2', 'XI RPL 2', 30),
  ('11111111-1111-4111-8111-111111111505', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111401', 'XII-RPL-1', 'XII RPL 1', 32),
  ('11111111-1111-4111-8111-111111111506', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111401', 'XII-RPL-2', 'XII RPL 2', 31),
  ('11111111-1111-4111-8111-111111111507', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111402', 'X-TKJ-1', 'X TKJ 1', 31),
  ('11111111-1111-4111-8111-111111111508', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111402', 'X-TKJ-2', 'X TKJ 2', 30),
  ('11111111-1111-4111-8111-111111111509', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111402', 'XI-TKJ-1', 'XI TKJ 1', 30),
  ('11111111-1111-4111-8111-111111111510', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111402', 'XI-TKJ-2', 'XI TKJ 2', 29),
  ('11111111-1111-4111-8111-111111111511', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111402', 'XII-TKJ-1', 'XII TKJ 1', 31),
  ('11111111-1111-4111-8111-111111111512', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111402', 'XII-TKJ-2', 'XII TKJ 2', 31),
  ('11111111-1111-4111-8111-111111111513', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111403', 'X-AN-1', 'X Animasi 1', 28),
  ('11111111-1111-4111-8111-111111111514', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111403', 'XI-AN-1', 'XI Animasi 1', 27),
  ('11111111-1111-4111-8111-111111111515', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111403', 'XII-AN-1', 'XII Animasi 1', 29),
  ('11111111-1111-4111-8111-111111111516', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111404', 'X-DKV-1', 'X DKV 1', 30),
  ('11111111-1111-4111-8111-111111111517', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111404', 'X-DKV-2', 'X DKV 2', 30),
  ('11111111-1111-4111-8111-111111111518', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111404', 'XI-DKV-1', 'XI DKV 1', 28),
  ('11111111-1111-4111-8111-111111111519', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111404', 'XI-DKV-2', 'XI DKV 2', 28),
  ('11111111-1111-4111-8111-111111111520', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111404', 'XII-DKV-1', 'XII DKV 1', 31),

  -- SMK Amaliah 2: Bisnis & Pariwisata — 22 rombel, 549 synthetic students.
  ('11111111-1111-4111-8111-111111111521', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111405', 'X-MP-1', 'X MP 1', 28),
  ('11111111-1111-4111-8111-111111111522', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111405', 'X-MP-2', 'X MP 2', 27),
  ('11111111-1111-4111-8111-111111111523', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111405', 'XI-MP-1', 'XI MP 1', 28),
  ('11111111-1111-4111-8111-111111111524', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111405', 'XI-MP-2', 'XI MP 2', 27),
  ('11111111-1111-4111-8111-111111111525', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111405', 'XII-MP-1', 'XII MP 1', 24),
  ('11111111-1111-4111-8111-111111111526', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111405', 'XII-MP-2', 'XII MP 2', 23),
  ('11111111-1111-4111-8111-111111111527', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111406', 'X-AK-1', 'X AK 1', 27),
  ('11111111-1111-4111-8111-111111111528', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111406', 'X-AK-2', 'X AK 2', 27),
  ('11111111-1111-4111-8111-111111111529', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111406', 'XI-AK-1', 'XI AK 1', 27),
  ('11111111-1111-4111-8111-111111111530', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111406', 'XI-AK-2', 'XI AK 2', 26),
  ('11111111-1111-4111-8111-111111111531', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111406', 'XII-AK-1', 'XII AK 1', 23),
  ('11111111-1111-4111-8111-111111111532', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111406', 'XII-AK-2', 'XII AK 2', 22),
  ('11111111-1111-4111-8111-111111111533', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111407', 'X-LPS-1', 'X LPS 1', 26),
  ('11111111-1111-4111-8111-111111111534', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111407', 'XI-LPS-1', 'XI LPS 1', 26),
  ('11111111-1111-4111-8111-111111111535', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111407', 'XII-LPS-1', 'XII LPS 1', 22),
  ('11111111-1111-4111-8111-111111111536', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111408', 'X-BR-1', 'X BR 1', 26),
  ('11111111-1111-4111-8111-111111111537', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111408', 'XI-BR-1', 'XI BR 1', 26),
  ('11111111-1111-4111-8111-111111111538', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111408', 'XII-BR-1', 'XII BR 1', 22),
  ('11111111-1111-4111-8111-111111111539', '11111111-1111-4111-8111-111111111301', '11111111-1111-4111-8111-111111111409', 'X-DPB-1', 'X DPB 1', 25),
  ('11111111-1111-4111-8111-111111111540', '11111111-1111-4111-8111-111111111302', '11111111-1111-4111-8111-111111111409', 'XI-DPB-1', 'XI DPB 1', 26),
  ('11111111-1111-4111-8111-111111111541', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111409', 'XII-DPB-1', 'XII DPB 1', 21),
  ('11111111-1111-4111-8111-111111111542', '11111111-1111-4111-8111-111111111303', '11111111-1111-4111-8111-111111111409', 'XII-DPB-2', 'XII DPB 2', 20);

insert into public.classes (id, institution_id, grade_level_id, department_id, code, name, is_active)
select
  id,
  '11111111-1111-4111-8111-111111111111',
  grade_level_id,
  department_id,
  code,
  name,
  true
from demo_class_plan
on conflict (id) do update set
  grade_level_id = excluded.grade_level_id,
  department_id = excluded.department_id,
  code = excluded.code,
  name = excluded.name,
  is_active = excluded.is_active;

-- Build all 1,146 synthetic active students deterministically so repeated db resets
-- produce the same IDs, NIS values, names, class membership, and credential coverage.
create temporary table demo_student_plan on commit drop as
with seats as (
  select
    c.id as class_id,
    c.code as class_code,
    c.target_students,
    seat_no
  from demo_class_plan c
  cross join lateral generate_series(1, c.target_students) as seat_no
),
numbered as (
  select
    class_id,
    class_code,
    seat_no,
    row_number() over (order by class_code, seat_no)::integer as sequence_no
  from seats
),
name_bank as (
  select
    array[
      'Aditya','Aisyah','Akmal','Amanda','Andika','Anisa','Ardi','Aulia',
      'Bagas','Bella','Cahya','Cantika','Daffa','Dinda','Ega','Fadli',
      'Farah','Fikri','Fitri','Galang','Gita','Hafiz','Hana','Ilham',
      'Intan','Kevin','Keyla','Lutfi','Maharani','Maulana','Nabila','Naufal',
      'Nadia','Putra','Putri','Rafi','Rahma','Reza','Rizky','Salsa',
      'Satria','Siti','Syifa','Tegar','Tiara','Vina','Wahyu','Zahra'
    ]::text[] as first_names,
    array[
      'Pratama','Saputra','Ramadhan','Nugraha','Hidayat','Permana',
      'Kurniawan','Firmansyah','Setiawan','Wijaya','Lestari','Oktaviani',
      'Puspitasari','Rahman','Hakim','Fauzan','Akbar','Wulandari',
      'Kusuma','Salsabila','Fadillah','Ananda','Mahendra','Hermawan'
    ]::text[] as last_names
)
select
  n.class_id,
  n.class_code,
  n.seat_no,
  n.sequence_no,
  case
    when n.class_code = 'X-RPL-1' and n.seat_no = 1 then '22222222-2222-4222-8222-222222222001'::uuid
    when n.class_code = 'X-RPL-1' and n.seat_no = 2 then '22222222-2222-4222-8222-222222222002'::uuid
    when n.class_code = 'XI-RPL-1' and n.seat_no = 1 then '22222222-2222-4222-8222-222222222003'::uuid
    when n.class_code = 'XI-RPL-1' and n.seat_no = 2 then '22222222-2222-4222-8222-222222222004'::uuid
    else md5('amaliah-demo-student:' || n.class_code || ':' || n.seat_no)::uuid
  end as student_id,
  case
    when n.class_code = 'X-RPL-1' and n.seat_no = 1 then '33333333-3333-4333-8333-333333333001'::uuid
    when n.class_code = 'X-RPL-1' and n.seat_no = 2 then '33333333-3333-4333-8333-333333333002'::uuid
    when n.class_code = 'XI-RPL-1' and n.seat_no = 1 then '33333333-3333-4333-8333-333333333003'::uuid
    when n.class_code = 'XI-RPL-1' and n.seat_no = 2 then '33333333-3333-4333-8333-333333333004'::uuid
    else md5('amaliah-demo-enrollment:' || n.class_code || ':' || n.seat_no)::uuid
  end as enrollment_id,
  case
    when n.class_code = 'X-RPL-1' and n.seat_no = 1 then 'DEMO1001'
    when n.class_code = 'X-RPL-1' and n.seat_no = 2 then 'DEMO1002'
    when n.class_code = 'XI-RPL-1' and n.seat_no = 1 then 'DEMO1101'
    when n.class_code = 'XI-RPL-1' and n.seat_no = 2 then 'DEMO1102'
    else 'D26' || lpad(n.sequence_no::text, 5, '0')
  end as nis,
  case
    when n.class_code = 'X-RPL-1' and n.seat_no = 1 then 'Alya Pratama'
    when n.class_code = 'X-RPL-1' and n.seat_no = 2 then 'Bima Mahendra'
    when n.class_code = 'XI-RPL-1' and n.seat_no = 1 then 'Citra Lestari'
    when n.class_code = 'XI-RPL-1' and n.seat_no = 2 then 'Damar Wijaya'
    else
      b.first_names[((n.sequence_no - 1) % array_length(b.first_names, 1)) + 1]
      || ' ' ||
      b.last_names[(((n.sequence_no - 1) / array_length(b.first_names, 1)) % array_length(b.last_names, 1)) + 1]
  end as full_name
from numbered n
cross join name_bank b;

insert into public.students (id, institution_id, nis, full_name, is_active)
select
  student_id,
  '11111111-1111-4111-8111-111111111111',
  nis,
  full_name,
  true
from demo_student_plan
on conflict (id) do update set
  institution_id = excluded.institution_id,
  nis = excluded.nis,
  full_name = excluded.full_name,
  is_active = excluded.is_active;

insert into public.student_enrollments (
  id, institution_id, academic_year_id, student_id, class_id, enrolled_on, status
)
select
  enrollment_id,
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111201',
  student_id,
  class_id,
  '2026-07-01'::date,
  'ACTIVE'
from demo_student_plan
on conflict (id) do update set
  class_id = excluded.class_id,
  enrolled_on = excluded.enrolled_on,
  exited_on = null,
  status = excluded.status;

-- Four canonical demo cards remain stable because terminal fixtures rely on them.
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

-- Most students receive a synthetic RFID so readiness dashboards look realistic;
-- roughly one in eight intentionally remains unregistered for negative-path UI testing.
insert into public.rfid_credentials (id, institution_id, student_id, uid, status)
select
  md5('amaliah-demo-rfid:' || student_id::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_id,
  upper(
    'D6:26:'
    || lpad(to_hex(sequence_no / 256), 2, '0')
    || ':'
    || lpad(to_hex(sequence_no % 256), 2, '0')
  ),
  'ACTIVE'
from demo_student_plan
where nis not like 'DEMO%'
  and sequence_no % 8 <> 0
on conflict (id) do update set
  student_id = excluded.student_id,
  uid = excluded.uid,
  status = excluded.status;

-- Canonical face fixtures stay compatible with the recruiter/demo paths.
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

-- About 75% of the synthetic directory gets a valid-shaped, explicitly synthetic
-- 128-dimensional template. It is only for data-volume/UI testing, never a real biometric.
insert into public.face_profiles (
  id, institution_id, student_id, status, model_name, model_version,
  template_reference, template_fingerprint, embedding, embedding_dimensions, quality_score
)
select
  md5('amaliah-demo-face:' || student_id::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_id,
  'ACTIVE',
  'demo-sface-seed',
  'synthetic-v1',
  null,
  md5('fp-a:' || student_id::text) || md5('fp-b:' || student_id::text),
  array(
    select case
      when dimension_no = ((p.sequence_no - 1) % 128) + 1 then 1.0::real
      else 0.0::real
    end
    from generate_series(1, 128) as dimension_no
  ),
  128,
  (0.82 + ((p.sequence_no % 12)::numeric / 100))::numeric(8,6)
from demo_student_plan p
where p.nis not like 'DEMO%'
  and p.sequence_no % 4 <> 0
on conflict (id) do update set
  status = excluded.status,
  model_name = excluded.model_name,
  model_version = excluded.model_version,
  template_reference = excluded.template_reference,
  template_fingerprint = excluded.template_fingerprint,
  embedding = excluded.embedding,
  embedding_dimensions = excluded.embedding_dimensions,
  quality_score = excluded.quality_score;

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