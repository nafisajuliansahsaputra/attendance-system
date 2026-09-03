import Link from "next/link";
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
  ["MO", "Sen"],
  ["TU", "Sel"],
  ["WE", "Rab"],
  ["TH", "Kam"],
  ["FR", "Jum"],
  ["SA", "Sab"],
  ["SU", "Min"],
] as const;

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "created") {
    return {
      tone: "success" as const,
      text: "Rule jadwal baru berhasil dibuat. Rule ini akan menghasilkan occurrence baru secara prospektif tanpa menulis ulang snapshot lama.",
    };
  }

  if (saved === "retired") {
    return {
      tone: "success" as const,
      text: "Rule jadwal berhasil diakhiri. Occurrence setelah tanggal efektif yang belum memiliki attendance dibatalkan.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data jadwal belum valid. Periksa tanggal, jam, template, dan target.",
    "weekly-days": "Jadwal mingguan membutuhkan minimal satu hari.",
    target: "Target jadwal belum dipilih atau tidak sesuai tipe target.",
    recurrence: "Pola pengulangan belum didukung oleh schedule engine.",
    "late-template": "Template sesi ini tidak mendukung status terlambat. Kosongkan batas terlambat.",
    "late-window": "Batas terlambat harus berada di antara jam buka dan jam tutup sesi.",
    "time-window": "Jam tutup tidak boleh lebih awal dari jam buka.",
    "date-window": "Tanggal akhir tidak boleh sebelum tanggal mulai.",
    template: "Template sesi tidak ditemukan atau tidak aktif.",
    "invalid-retire": "Data pengakhiran rule tidak valid.",
    "retire-attendance": "Rule tidak dapat diakhiri pada tanggal itu karena sudah ada attendance canonical pada occurrence yang terdampak.",
    "retire-date": "Tanggal efektif pengakhiran harus setelah tanggal mulai rule.",
    "rule-not-found": "Rule jadwal tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "save-failed": "Perubahan jadwal belum dapat disimpan karena terjadi kesalahan server.",
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
  if (!value) return "Sekali";
  if (value === "FREQ=DAILY") return "Setiap hari";
  return value.replace("FREQ=WEEKLY;BYDAY=", "Mingguan: ");
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
          ← Kembali ke dashboard
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          System Admin · Versioned schedules
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Jadwal absensi</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Jadwal dikelola sebagai rule prospektif. Jangan mengedit histori occurrence: akhiri rule lama pada tanggal efektif lalu buat rule baru untuk kebijakan berikutnya.
        </p>
      </header>

      {feedback ? (
        <section
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]"
              : "border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] text-[var(--danger)]"
          }`}
        >
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
            Rule baru
          </p>
          <h2 className="mt-2 text-xl font-semibold">Tambah konfigurasi jadwal</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Template Dzuhur, Ashar, Pulang, Dhuha, Masuk, dan Upacara tersedia. Batas terlambat hanya boleh diisi untuk template yang memang mendukung late status.
          </p>
        </div>

        <form action={createScheduleRuleAction} className="mt-6 grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Nama rule
              </span>
              <input
                name="name"
                required
                maxLength={150}
                placeholder="Contoh: Dzuhur semua siswa"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Template sesi
              </span>
              <select
                name="templateId"
                required
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                <option value="" disabled>
                  Pilih template
                </option>
                {configuration.templates
                  .filter((template) => template.active)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.code}
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
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                <option value="ONCE">Sekali</option>
                <option value="DAILY">Setiap hari</option>
                <option value="WEEKLY">Mingguan</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Mulai
              </span>
              <input
                name="startsOn"
                type="date"
                required
                defaultValue={context.schoolDate}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Berakhir (opsional)
              </span>
              <input
                name="endsOn"
                type="date"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Hari untuk pola mingguan
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
                Buka
              </span>
              <input
                name="opensAt"
                type="time"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Terlambat setelah (opsional)
              </span>
              <input
                name="lateAfterAt"
                type="time"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Tutup
              </span>
              <input
                name="closesAt"
                type="time"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Target
              </span>
              <select
                name="targetType"
                defaultValue="ALL_STUDENTS"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                <option value="ALL_STUDENTS">Semua siswa</option>
                <option value="CLASSES">Satu kelas</option>
                <option value="GRADE_LEVELS">Satu tingkat</option>
                <option value="DEPARTMENTS">Satu jurusan</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Jika target = kelas
              </span>
              <select
                name="targetClassId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
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
                Jika target = tingkat
              </span>
              <select
                name="targetGradeId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
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
                Jika target = jurusan
              </span>
              <select
                name="targetDepartmentId"
                defaultValue=""
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
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
                Hubungan jadwal
              </span>
              <select
                name="scheduleRelationship"
                defaultValue="NORMAL"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="ADDITIVE">Tambahan</option>
                <option value="REPLACE_NORMAL">Ganti jadwal normal</option>
                <option value="CANCEL_NORMAL">Batalkan jadwal normal</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Catatan audit (opsional)
              </span>
              <input
                name="note"
                maxLength={300}
                placeholder="Contoh: jadwal semester ganjil"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="justify-self-start rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]"
          >
            Buat rule jadwal
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Rule tersimpan</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {configuration.rules.length} rule ditemukan. UUID target ditampilkan sebagai snapshot teknis sampai label-resolution UI ditambahkan.
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
                      {template?.code ?? "UNKNOWN"}
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {rule.scheduleRelationship}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        ended
                          ? "border-[var(--border)] text-[var(--muted)]"
                          : "border-[color:rgba(74,222,128,0.25)] text-[var(--success)]"
                      }`}
                    >
                      {ended ? "ENDED" : "ACTIVE RANGE"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{rule.name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2 xl:grid-cols-4">
                    <p>{recurrenceSummary(rule.recurrenceRule)}</p>
                    <p>
                      {rule.startsOn} → {rule.endsOn ?? "tanpa akhir"}
                    </p>
                    <p>
                      {rule.opensAt.slice(0, 5)} — {rule.closesAt.slice(0, 5)}
                      {rule.lateAfterAt
                        ? ` · late ${rule.lateAfterAt.slice(0, 5)}`
                        : ""}
                    </p>
                    <p>{targetSummary(rule.targetType, rule.targetSelector)}</p>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Materialized: {rule.materializedOccurrences} occurrence
                    {rule.lastMaterializedDate
                      ? ` · terakhir ${rule.lastMaterializedDate}`
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <input
                      name="note"
                      maxLength={300}
                      placeholder="Alasan perubahan (opsional)"
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      Akhiri rule
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
