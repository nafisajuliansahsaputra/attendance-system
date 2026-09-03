import Link from "next/link";
import { SCHOOL } from "@/config/school";
import { getAdminDeviceDirectory } from "../../../infrastructure/admin/supabase-devices";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import { createDeviceAction, setDeviceStatusAction } from "./actions";

export const dynamic = "force-dynamic";

interface DevicePageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "created") {
    return {
      tone: "success" as const,
      text: "Terminal berhasil ditambahkan. Pasang kunci akses perangkat dari komputer petugas sebelum terminal digunakan untuk absensi.",
    };
  }
  if (saved === "status") {
    return {
      tone: "success" as const,
      text: "Status terminal berhasil diperbarui. Transaksi verifikasi yang masih menunggu akan dibatalkan otomatis jika terminal dinonaktifkan atau aksesnya dicabut.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data terminal tidak valid.",
    "code-in-use": "Kode terminal sudah digunakan oleh perangkat lain.",
    "invalid-code": "Kode terminal hanya boleh berisi huruf, angka, garis bawah, atau tanda hubung.",
    "invalid-name": "Nama terminal tidak valid.",
    "invalid-type": "Jenis perangkat tidak didukung.",
    "invalid-protocol": "Versi protokol harus berbentuk seperti v1 atau v1.1.",
    revoked: "Akses terminal yang sudah dicabut tidak dapat diaktifkan kembali. Tambahkan terminal baru jika perangkat keras diganti.",
    "not-found": "Terminal tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "save-failed": "Perubahan terminal belum dapat disimpan karena terjadi kesalahan pada server.",
  };

  return error && errors[error]
    ? { tone: "error" as const, text: errors[error] }
    : null;
}

function lastSeenLabel(value?: string) {
  if (!value) return "Belum pernah terhubung";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function deviceStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "DISABLED":
      return "Dinonaktifkan";
    case "REVOKED":
      return "Akses dicabut";
    default:
      return status;
  }
}

function deviceTypeLabel(type: string) {
  switch (type) {
    case "ARDUINO_BRIDGE":
      return "Penghubung Arduino";
    case "ESP32":
      return "ESP32";
    case "SIMULATOR":
      return "Simulasi";
    case "OTHER":
      return "Perangkat lainnya";
    default:
      return type;
  }
}

export default async function DeviceManagementPage({ searchParams }: DevicePageProps) {
  const { context, userId } = await requireAuthorizedUser([
    "SYSTEM_ADMIN",
    "OPERATOR",
  ]);
  const params = await searchParams;
  const devices = await getAdminDeviceDirectory(userId);
  const feedback = feedbackMessage(params.saved, params.error);
  const isAdmin = context.role === "SYSTEM_ADMIN";

  const active = devices.filter((item) => item.status === "ACTIVE").length;
  const configured = devices.filter((item) => item.secretConfigured).length;
  const recentErrors = devices.reduce((sum, item) => sum + item.recentErrors24h, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-[var(--border)] pb-7">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]">
          ← Kembali ke pusat pengelolaan
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          {SCHOOL.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Perangkat & Terminal Absensi</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Pantau kondisi terminal, waktu terakhir terhubung, versi komunikasi, gangguan perangkat, dan kesiapan kunci akses. Kunci akses asli tidak pernah ditampilkan kembali oleh sistem.
        </p>
      </header>

      {feedback ? (
        <section className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Terminal aktif</p>
          <p className="mt-2 text-3xl font-semibold">{active}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Kunci akses terpasang</p>
          <p className="mt-2 text-3xl font-semibold">{configured}/{devices.length}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Gangguan 24 jam terakhir</p>
          <p className="mt-2 text-3xl font-semibold">{recentErrors}</p>
        </article>
      </section>

      {isAdmin ? (
        <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Tambahkan terminal absensi</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Data di bawah mendaftarkan identitas perangkat ke sistem. Setelah terminal dibuat, petugas teknis memasang <code>DEVICE_ID</code> pada komputer perangkat lalu menjalankan <code>npm run device:rotate-secret:env</code> untuk membuat kunci akses satu kali.
          </p>
          <form action={createDeviceAction} className="mt-5 grid gap-4 lg:grid-cols-5 lg:items-end">
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Kode terminal</span>
              <input name="code" required maxLength={50} placeholder="GERBANG_A_01" className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Nama terminal</span>
              <input name="name" required maxLength={100} placeholder="Terminal Gerbang Utama" className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Jenis perangkat</span>
              <select name="deviceType" defaultValue="ARDUINO_BRIDGE" className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">
                <option value="ARDUINO_BRIDGE">Penghubung Arduino</option>
                <option value="ESP32">ESP32</option>
                <option value="SIMULATOR">Simulasi</option>
                <option value="OTHER">Perangkat lainnya</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Versi protokol</span>
              <input name="protocolVersion" required defaultValue="v1" className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
            </label>
            <label className="lg:col-span-4">
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Catatan (opsional)</span>
              <input name="note" maxLength={300} placeholder="Contoh: dipasang di gerbang utama sekolah" className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
            </label>
            <button type="submit" className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white">
              Tambahkan terminal
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold">Daftar terminal sekolah</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Petugas operator dapat memantau kondisi terminal. Perubahan konfigurasi dan status hanya dapat dilakukan oleh Administrator Sistem.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Terminal</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Kunci akses</th>
                <th className="px-5 py-4 font-medium">Terakhir terhubung</th>
                <th className="px-5 py-4 font-medium">Menunggu / Gangguan</th>
                <th className="px-5 py-4 font-medium">Pengaturan</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-5 py-5">
                    <p className="font-medium">{device.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">{device.code}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{deviceTypeLabel(device.deviceType)} · protokol {device.protocolVersion}</p>
                    <p className="mt-2 break-all text-[11px] text-[var(--muted)]">ID {device.id}</p>
                  </td>
                  <td className="px-5 py-5 font-medium">{deviceStatusLabel(device.status)}</td>
                  <td className="px-5 py-5">
                    <span className={device.secretConfigured ? "text-emerald-700" : "text-amber-700"}>
                      {device.secretConfigured ? "Sudah terpasang" : "Belum terpasang"}
                    </span>
                  </td>
                  <td className="px-5 py-5">{lastSeenLabel(device.lastSeenAt)}</td>
                  <td className="px-5 py-5">
                    <p>{device.pendingTransactions} transaksi menunggu</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{device.recentErrors24h} gangguan / 24 jam</p>
                  </td>
                  <td className="px-5 py-5">
                    {isAdmin && device.status !== "REVOKED" ? (
                      <form action={setDeviceStatusAction} className="grid min-w-[240px] gap-2">
                        <input type="hidden" name="deviceId" value={device.id} />
                        <select name="status" defaultValue={device.status} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none">
                          <option value="ACTIVE">Aktif</option>
                          <option value="DISABLED">Dinonaktifkan</option>
                          <option value="REVOKED">Cabut akses permanen</option>
                        </select>
                        <input name="note" maxLength={300} placeholder="Alasan perubahan status" className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none" />
                        <button type="submit" className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">
                          Simpan status
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Hanya dapat dipantau</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
