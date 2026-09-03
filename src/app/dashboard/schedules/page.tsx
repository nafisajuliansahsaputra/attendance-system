import Link from "next/link";
import { SCHOOL } from "@/config/school";
import { getAdminScheduleConfiguration } from "../../../infrastructure/admin/supabase-schedules";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import {
  createScheduleRuleAction,
  retireScheduleRuleAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface ScheduleAdminPageProps {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}

const dayOptions = [
  ["MO", "Senin"],
  ["TU", "Selasa"],
  ["WE", "Rabu"],
  ["TH", "Kamis"],
  ["FR", "Jumat"],
  ["SA", "Sabtu"],
  ["SU", "Minggu"],
] as const;

const shortDayNames: Record<string, string> = {
  MO: "Sen",
  TU: "Sel",
  WE: "Rab",
  TH: "Kam",
  FR: "Jum",
  SA: "Sab",
  SU: "Min",
};

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "created") {
    return {
      tone: "success" as const,
      text: "Jadwal baru berhasil dibuat. Jadwal ini akan berlaku untuk tanggal berikutnya tanpa mengubah riwayat absensi yang sudah ada.",
    };
  }

  if (saved === "retired") {
    return {
      tone: "success" as const,
      text: "Jadwal berhasil diakhiri. Sesi setelah tanggal efektif yang belum memiliki data absensi akan dibatalkan secara otomatis.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data jadwal belum valid. Periksa tanggal, jam, jenis absensi, dan sasaran siswa.",
    "weekly-days": "Jadwal mingguan harus memiliki minimal satu hari.",
    target: "Sasaran jadwal belum dipilih atau tidak sesuai dengan jenis sasaran.",
    recurrence: "Pola pengulangan jadwal tersebut belum didukung.",
    "late-template": "Jenis absensi ini tidak menggunakan status terlambat. Kosongkan batas waktu terlambat.",
    "late-window": "Batas terlambat harus berada di antara jam mulai dan jam selesai absensi.",
    "time-window": "Jam selesai tidak boleh lebih awal dari jam mulai.",
    "date-window": "Tanggal akhir tidak boleh lebih awal dari tanggal mulai.",
    template: "Jenis sesi absensi tidak ditemukan atau sedang tidak aktif.",
    "invalid-retire": "Data pengakhiran jadwal tidak valid.",
    "retire-attendance": "Jadwal tidak dapat diakhiri pada tanggal tersebut karena sudah terdapat data absensi yang terdampak.",
    "retire-date": "Tanggal pengakhiran harus setelah tanggal mulai jadwal.",
    "rule-not-found": "Jadwal tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "save-failed": "Perubahan jadwal belum dapat disimpan karena terjadi kesalahan pada server.",
  };

  if (error && errors[error]) {
    return { tone: "error" as const, text: errors[error] };
  }

  return null;
}

function targetSummary(type: string, selector: Record<string, unknown>) {
  if (type === "ALL_STUDENTS") return "Semua siswa";

  const values = Object.values(selector).flatMap((value) =>
    Array.isArray(value) ? value.map(String) : [],
  );

  const label = {
    CLASSES: "Kelas",
    GRADE_LEVELS: "Tingkat",
    DEPARTMENTS: "Jurusan",
    SELECTED_STUDENTS: "Siswa terpilih",
  }[type] ?? type;

  return `${label}: ${values.length ? values.join(", ") : "—"}`;
}

function recurrenceSummary(value?: string) {
  if (!value) return "Sekali saja";
  if (value === "FREQ=DAILY") return "Setiap hari";

  const weeklyPrefix = "FREQ=WEEKLY;BYDAY=";
  if (value.startsWith(weeklyPrefix)) {
    const days = value
      .slice(weeklyPrefix.length)
      .split(",")
      .map((day) => shortDayNames[day] ?? day)
      .join(", ");
    return `Setiap minggu: ${days}`;
  }

  return value;
}

function relationshipLabel(value: string) {
  switch (value) {
    case "NORMAL":
      return "Jadwal utama";
    case "ADDITIVE":
      return "Jadwal tambahan";
    case "REPLACE_NORMAL":
      return "Mengganti jadwal utama";
    case "CANCEL_NORMAL":
      return "Membatalkan jadwal utama";
    default:
      return value;
  }
}

export default async function ScheduleAdminPage({
  searchParams,
}: ScheduleAdminPageProps) {
  const { context, userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const params = await searchParams;
  const configuration = await getAdminScheduleConfiguration(userId);
  const feedback = feedbackMessage(params.saved, params.error);
  const templateById = new Map(
    configuration.templates.map((template) => [template.id, template]),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-[var(--border)] pb-7">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          ← Kembali ke pusat pengelolaan
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          {SCHOOL.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Jadwal Absensi Sekolah</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Atur waktu absensi Masuk, Pulang, Dhuha, Dzuhur, Ashar, upacara, dan kegiatan sekolah. Jika kebijakan waktu berubah, akhiri jadwal lama pada tanggal efektif lalu buat jadwal baru agar riwayat sebelumnya tetap utuh.
        </p>
      </header>

      {feedback ? (
        <section
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
            Jadwal baru
          </p>
          <h2 className="mt-2 text-xl font-semibold">Tambah jadwal absensi</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Pilih jenis absensi, waktu pelaksanaan, pola hari, dan siswa yang menjadi sasaran. Batas terlambat hanya diisi untuk absensi yang memang menggunakan status terlambat.
          </p>
        </div>

        <form action={createScheduleRuleAction} className="mt-6 grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Nama jadwal
              </span>
              <input
                name="name"
                required
                maxLength={150}
                placeholder="Contoh: Dzuhur semua siswa"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Jenis absensi
              </span>
              <select
                name="templateId"
                required
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="" disabled>
                  Pilih jenis absensi
                </option>
                {configuration.templates
                  .filter((template) => template.active)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Pengulangan
              </span>
              <select
                name="recurrenceType"
                defaultValue="WEEKLY"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="ONCE">Sekali saja</option>
                <option value="DAILY">Setiap hari</option>
                <option value="WEEKLY">Setiap minggu</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Berlaku mulai
              </span>
              <input
                name="startsOn"
                type="date"
                required
                defaultValue={context.schoolDate}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Berlaku sampai (opsional)
              </span>
              <input
                name="endsOn"
                type="date"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Hari pelaksanaan untuk jadwal mingguan
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {dayOptions.map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="days"
                    value={value}
                    defaultChecked={["MO", "TU", "WE", "TH", "FR"].includes(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Mulai absensi
              </span>
              <input
                name="opensAt"
                type="time"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Dianggap terlambat setelah (opsional)
              </span>
              <input
                name="lateAfterAt"
                type="time"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Selesai absensi
              </span>
              <input
                name="closesAt"
                type="time"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Sasaran siswa
              </span>
              <select
                name="targetType"
                defaultValue="ALL_STUDENTS"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="ALL_STUDENTS">Semua siswa</option>
                <option value="CLASSES">Satu kelas</option>
                <option value="GRADE_LEVELS">Satu tingkat</option>
                <option value="DEPARTMENTS">Satu jurusan</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Jika sasaran = kelas
              </span>
              <select
                name="targetClassId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">—</option>
                {configuration.classes
                  .filter((item) => item.active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Jika sasaran = tingkat
              </span>
              <select
                name="targetGradeId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">—</option>
                {configuration.gradeLevels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Jika sasaran = jurusan
              </span>
              <select
                name="targetDepartmentId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">—</option>
                {configuration.departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Hubungan dengan jadwal utama
              </span>
              <select
                name="scheduleRelationship"
                defaultValue="NORMAL"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="NORMAL">Jadwal utama</option>
                <option value="ADDITIVE">Jadwal tambahan</option>
                <option value="REPLACE_NORMAL">Mengganti jadwal utama</option>
                <option value="CANCEL_NORMAL">Membatalkan jadwal utama</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Catatan (opsional)
              </span>
              <input
                name="note"
                maxLength={300}
                placeholder="Contoh: jadwal semester ganjil"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="justify-self-start rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white"
          >
            Simpan jadwal
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Jadwal yang tersimpan</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {configuration.rules.length} jadwal ditemukan. Riwayat sesi yang sudah terbentuk tetap dipertahankan untuk laporan kehadiran.
          </p>
        </div>

        {configuration.rules.map((rule) => {
          const template = templateById.get(rule.templateId);
          const ended = Boolean(rule.endsOn && rule.endsOn < context.schoolDate);

          return (
            <article
              key={rule.id}
              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {template?.name ?? "Jenis absensi tidak diketahui"}
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {relationshipLabel(rule.scheduleRelationship)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        ended
                          ? "border-[var(--border)] text-[var(--muted)]"
                          : "border-emerald-200 text-emerald-700"
                      }`}
                    >
                      {ended ? "Sudah berakhir" : "Sedang berlaku"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{rule.name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2 xl:grid-cols-4">
                    <p>{recurrenceSummary(rule.recurrenceRule)}</p>
                    <p>
                      {rule.startsOn} → {rule.endsOn ?? "tanpa tanggal akhir"}
                    </p>
                    <p>
                      {rule.opensAt.slice(0, 5)} — {rule.closesAt.slice(0, 5)}
                      {rule.lateAfterAt
                        ? ` · terlambat setelah ${rule.lateAfterAt.slice(0, 5)}`
                        : ""}
                    </p>
                    <p>{targetSummary(rule.targetType, rule.targetSelector)}</p>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Sudah menghasilkan {rule.materializedOccurrences} sesi absensi
                    {rule.lastMaterializedDate
                      ? ` · terakhir dibuat ${rule.lastMaterializedDate}`
                      : ""}
                  </p>
                </div>

                {!ended ? (
                  <form
                    action={retireScheduleRuleAction}
                    className="grid min-w-[280px] gap-2 self-start"
                  >
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <label>
                      <span className="mb-1 block text-xs text-[var(--muted)]">
                        Akhiri mulai tanggal
                      </span>
                      <input
                        name="effectiveOn"
                        type="date"
                        required
                        defaultValue={context.schoolDate}
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <input
                      name="note"
                      maxLength={300}
                      placeholder="Alasan perubahan (opsional)"
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      Akhiri jadwal
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
