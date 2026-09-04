import Link from "next/link";
import { roleLabel } from "@/config/school";
import { getAdminDeviceDirectory } from "../../infrastructure/admin/supabase-devices";
import { getAdminScheduleConfiguration } from "../../infrastructure/admin/supabase-schedules";
import { getAdminStaffDirectory } from "../../infrastructure/admin/supabase-staff";
import { getAdminStudentDirectory } from "../../infrastructure/admin/supabase-students";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

type GlyphName = "students" | "rfid" | "face" | "calendar" | "devices" | "staff" | "alert" | "arrow";

function Glyph({ name, className = "h-5 w-5" }: { name: GlyphName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "students":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "rfid":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 8a4 4 0 0 1 0 8M12 6a7 7 0 0 1 0 12"/></svg>;
    case "face":
      return <svg {...common}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M9 10h.01M15 10h.01M9 15c1 .8 2 1 3 1s2-.2 3-1"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></svg>;
    case "devices":
      return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3M8 9h8M8 12h5"/></svg>;
    case "staff":
      return <svg {...common}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M19 8v6M16 11h6"/></svg>;
    case "alert":
      return <svg {...common}><path d="M10.3 3.6 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  }
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formattedDate(value: string) {
  const parsed = new Date(`${value}T12:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(parsed);
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "green",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: GlyphName;
  tone?: "green" | "blue" | "amber" | "slate";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <article className="rounded-2xl border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,43,32,0.02)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17352a]">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
          <Glyph name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function ProgressItem({ label, value, total, detail }: { label: string; value: number; total: number; detail: string }) {
  const percent = percentage(value, total);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#24483a]">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-[#176b48]">{percent}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2ef]">
        <div className="h-full rounded-full bg-[#1b7a52]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{value} dari {total}</p>
    </div>
  );
}

function ActionCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: GlyphName }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-2xl border border-[#dbe5df] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#b9cfc3] hover:shadow-[0_10px_28px_rgba(15,43,32,0.07)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8f3ed] text-[#176b48]">
        <Glyph name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#17352a]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <Glyph name="arrow" className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#176b48]" />
    </Link>
  );
}

export default async function DashboardPage() {
  const { context, userId } = await requireAuthorizedUser([
    "SYSTEM_ADMIN",
    "OPERATOR",
  ]);
  const isAdmin = context.role === "SYSTEM_ADMIN";

  const devices = await getAdminDeviceDirectory(userId);
  let students: Awaited<ReturnType<typeof getAdminStudentDirectory>> = [];
  let schedules: Awaited<ReturnType<typeof getAdminScheduleConfiguration>> | null = null;
  let staff: Awaited<ReturnType<typeof getAdminStaffDirectory>> = [];

  if (isAdmin) {
    [students, schedules, staff] = await Promise.all([
      getAdminStudentDirectory({ actorUserId: userId }),
      getAdminScheduleConfiguration(userId),
      getAdminStaffDirectory(userId),
    ]);
  }

  const activeStudents = students.filter((item) => item.active);
  const rfidReady = activeStudents.filter((item) => Boolean(item.rfidUid)).length;
  const faceReady = activeStudents.filter((item) => item.faceStatus === "ACTIVE").length;
  const activeRules = schedules?.rules.filter((item) => item.active).length ?? 0;
  const activeDevices = devices.filter((item) => item.status === "ACTIVE").length;
  const configuredDevices = devices.filter((item) => item.secretConfigured).length;
  const recentErrors = devices.reduce((sum, item) => sum + item.recentErrors24h, 0);
  const pendingTransactions = devices.reduce((sum, item) => sum + item.pendingTransactions, 0);
  const activeStaff = staff.filter((item) => item.active).length;
  const firstName = context.fullName.trim().split(/\s+/)[0] ?? context.fullName;

  return (
    <div>
      <section className="overflow-hidden rounded-[22px] border border-[#163e30] bg-[#12382b] text-white shadow-[0_14px_40px_rgba(15,43,32,0.12)]">
        <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-9 lg:py-9">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">Ringkasan Sistem Sekolah</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.035em] sm:text-3xl">Selamat datang, {firstName}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/65">
              Pantau kesiapan identitas siswa, jadwal absensi, perangkat, dan akses petugas dari satu pusat pengelolaan.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/7 px-5 py-4 lg:min-w-[240px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100/50">Tanggal Sekolah</p>
            <p className="mt-2 text-sm font-semibold text-white">{formattedDate(context.schoolDate)}</p>
            <p className="mt-2 text-xs text-emerald-100/55">{roleLabel(context.role)} · {context.classes.length} kelas terdaftar</p>
          </div>
        </div>
      </section>

      <section className={`mt-6 grid gap-4 sm:grid-cols-2 ${isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {isAdmin ? (
          <>
            <MetricCard label="Siswa Aktif" value={activeStudents.length} detail={`${context.classes.length} kelas dalam tahun ajaran aktif`} icon="students" />
            <MetricCard label="RFID Terpasang" value={`${rfidReady}/${activeStudents.length}`} detail={`${percentage(rfidReady, activeStudents.length)}% siswa aktif siap menggunakan kartu`} icon="rfid" tone="blue" />
            <MetricCard label="Profil Wajah Aktif" value={`${faceReady}/${activeStudents.length}`} detail={`${percentage(faceReady, activeStudents.length)}% siswa aktif siap verifikasi wajah`} icon="face" tone="green" />
            <MetricCard label="Jadwal Aktif" value={activeRules} detail="Aturan absensi yang masih berlaku" icon="calendar" tone="slate" />
          </>
        ) : null}
        <MetricCard label="Terminal Aktif" value={`${activeDevices}/${devices.length}`} detail={`${configuredDevices} terminal memiliki kunci akses`} icon="devices" tone="green" />
        {isAdmin ? <MetricCard label="Petugas Aktif" value={activeStaff} detail={`${staff.length} akun petugas terdaftar`} icon="staff" tone="blue" /> : null}
        <MetricCard label="Transaksi Menunggu" value={pendingTransactions} detail="Verifikasi perangkat yang belum selesai" icon="devices" tone={pendingTransactions > 0 ? "amber" : "slate"} />
        <MetricCard label="Gangguan 24 Jam" value={recentErrors} detail="Jumlah error terminal yang tercatat" icon="alert" tone={recentErrors > 0 ? "amber" : "slate"} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {isAdmin ? (
          <article className="rounded-[20px] border border-[#dbe5df] bg-white p-6 shadow-[0_1px_2px_rgba(15,43,32,0.02)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#56806d]">Kesiapan Identitas Siswa</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17352a]">Kelengkapan data untuk absensi otomatis</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">RFID dan profil wajah diperlukan agar alur identifikasi siswa dapat berjalan penuh pada terminal yang mewajibkan verifikasi wajah.</p>
              </div>
              <span className="hidden rounded-full bg-[#e8f3ed] px-3 py-1.5 text-xs font-bold text-[#176b48] sm:block">{activeStudents.length} siswa</span>
            </div>
            <div className="mt-7 space-y-7">
              <ProgressItem label="Kartu RFID aktif" value={rfidReady} total={activeStudents.length} detail="Siswa memiliki UID kartu yang dapat dipindai terminal" />
              <ProgressItem label="Profil wajah aktif" value={faceReady} total={activeStudents.length} detail="Siswa memiliki template wajah yang siap dibandingkan" />
            </div>
            <Link href="/dashboard/students" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#176b48] transition hover:text-[#115b3d]">
              Buka data siswa <Glyph name="arrow" className="h-4 w-4" />
            </Link>
          </article>
        ) : null}

        <article className={`rounded-[20px] border border-[#dbe5df] bg-white p-6 shadow-[0_1px_2px_rgba(15,43,32,0.02)] sm:p-7 ${!isAdmin ? "xl:col-span-2" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#56806d]">Kondisi Perangkat</p>
              <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17352a]">Kesiapan terminal absensi</h3>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${recentErrors > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {recentErrors > 0 ? `${recentErrors} gangguan` : "Tidak ada gangguan"}
            </span>
          </div>
          <div className="mt-6 divide-y divide-[#e5ece8]">
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div><p className="text-sm font-semibold text-[#24483a]">Terminal terdaftar</p><p className="mt-1 text-xs text-slate-500">Seluruh perangkat pada institusi</p></div>
              <p className="text-lg font-bold text-[#17352a]">{devices.length}</p>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><p className="text-sm font-semibold text-[#24483a]">Status aktif</p><p className="mt-1 text-xs text-slate-500">Perangkat yang diizinkan menerima transaksi</p></div>
              <p className="text-lg font-bold text-[#17352a]">{activeDevices}</p>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div><p className="text-sm font-semibold text-[#24483a]">Kunci akses tersedia</p><p className="mt-1 text-xs text-slate-500">Terminal dengan kredensial perangkat terpasang</p></div>
              <p className="text-lg font-bold text-[#17352a]">{configuredDevices}/{devices.length}</p>
            </div>
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div><p className="text-sm font-semibold text-[#24483a]">Transaksi tertunda</p><p className="mt-1 text-xs text-slate-500">Proses verifikasi yang masih menunggu penyelesaian</p></div>
              <p className={`text-lg font-bold ${pendingTransactions > 0 ? "text-amber-700" : "text-[#17352a]"}`}>{pendingTransactions}</p>
            </div>
          </div>
          <Link href="/dashboard/devices" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#176b48] transition hover:text-[#115b3d]">
            Pantau terminal <Glyph name="arrow" className="h-4 w-4" />
          </Link>
        </article>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#56806d]">Akses Cepat</p>
            <h3 className="mt-1.5 text-lg font-bold text-[#17352a]">Pengelolaan rutin sekolah</h3>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isAdmin ? (
            <>
              <ActionCard href="/dashboard/students" title="Kelola data siswa" description="Periksa kelas, RFID, dan status profil wajah siswa." icon="students" />
              <ActionCard href="/dashboard/schedules" title="Kelola jadwal absensi" description="Atur sesi masuk, pulang, ibadah, upacara, dan kegiatan." icon="calendar" />
              <ActionCard href="/dashboard/staff" title="Kelola petugas sekolah" description="Atur administrator, operator, wali kelas, dan hak akses." icon="staff" />
              <ActionCard href="/teacher" title="Pemeriksaan wali kelas" description="Tinjau kehadiran harian dan konfirmasi Sakit, Izin, atau Alpa." icon="students" />
            </>
          ) : null}
          <ActionCard href="/dashboard/devices" title="Pantau perangkat absensi" description="Lihat status terminal, koneksi, antrean, dan gangguan perangkat." icon="devices" />
          <ActionCard href="/terminal/lab" title="Buka terminal simulasi" description="Uji alur RFID, verifikasi, LED, dan buzzer tanpa mengubah data sekolah." icon="rfid" />
        </div>
      </section>
    </div>
  );
}
