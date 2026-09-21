import Link from "next/link";
import type {
  AdminDeviceConnectionStatus,
  AdminDevicePairingStatus,
  AdminDeviceStatus,
} from "@/application/admin/device-types";
import { SCHOOL } from "@/config/school";
import { getAdminDeviceDirectory } from "../../../infrastructure/admin/supabase-devices";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import { createDeviceAction, setDeviceStatusAction } from "./actions";
import { DevicePairingWizard } from "./DevicePairingWizard";

export const dynamic = "force-dynamic";

interface DevicePageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "created") {
    return {
      tone: "success" as const,
      text: "Terminal berhasil didaftarkan. Lanjutkan dengan pairing agar perangkat menerima kredensial akses.",
    };
  }
  if (saved === "status") {
    return {
      tone: "success" as const,
      text: "Status terminal berhasil diperbarui.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data terminal tidak valid.",
    "code-in-use": "Kode terminal sudah digunakan oleh perangkat lain.",
    "invalid-code": "Kode terminal hanya boleh berisi huruf, angka, garis bawah, atau tanda hubung.",
    "invalid-name": "Nama terminal tidak valid.",
    "invalid-location": "Lokasi terminal tidak valid.",
    "invalid-type": "Jenis perangkat tidak didukung.",
    "invalid-protocol": "Versi protokol harus berbentuk seperti v1 atau v1.1.",
    revoked: "Akses terminal yang sudah dicabut tidak dapat diaktifkan kembali.",
    "not-found": "Terminal tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "save-failed": "Perubahan terminal belum dapat disimpan karena terjadi kesalahan pada server.",
  };

  return error && errors[error]
    ? { tone: "error" as const, text: errors[error] }
    : null;
}

function dateTimeLabel(value?: string) {
  if (!value) return "Belum ada";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function deviceStatusLabel(status: AdminDeviceStatus) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "DISABLED") return "Dinonaktifkan";
  return "Akses dicabut";
}

function deviceTypeLabel(type: string) {
  if (type === "ARDUINO_BRIDGE") return "Penghubung Arduino";
  if (type === "ESP32") return "ESP32";
  if (type === "SIMULATOR") return "Simulasi";
  return "Perangkat lainnya";
}

function pairingLabel(status: AdminDevicePairingStatus) {
  if (status === "PAIRED") return "Sudah dipasangkan";
  if (status === "WAITING") return "Menunggu pairing";
  if (status === "REVOKED") return "Akses dicabut";
  return "Belum dipasangkan";
}

function pairingClass(status: AdminDevicePairingStatus) {
  if (status === "PAIRED") return "bg-emerald-50 text-emerald-700";
  if (status === "WAITING") return "bg-amber-50 text-amber-700";
  if (status === "REVOKED") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function connectionLabel(status: AdminDeviceConnectionStatus) {
  if (status === "ONLINE") return "Online";
  if (status === "OFFLINE") return "Offline";
  if (status === "INACTIVE") return "Tidak aktif";
  return "Belum pernah online";
}

function connectionClass(status: AdminDeviceConnectionStatus) {
  if (status === "ONLINE") return "bg-emerald-50 text-emerald-700";
  if (status === "OFFLINE") return "bg-amber-50 text-amber-700";
  if (status === "INACTIVE") return "bg-slate-100 text-slate-500";
  return "bg-slate-100 text-slate-600";
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,43,32,0.02)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#17352a]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
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
  const online = devices.filter((item) => item.connectionStatus === "ONLINE").length;
  const configured = devices.filter((item) => item.secretConfigured).length;
  const waiting = devices.filter((item) => item.pairingStatus === "WAITING").length;
  const recentErrors = devices.reduce((sum, item) => sum + item.recentErrors24h, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1480px] px-5 py-8 sm:px-8 sm:py-10">
      <header className="rounded-[24px] border border-[#163e30] bg-[#12382b] px-6 py-7 text-white shadow-[0_16px_42px_rgba(15,43,32,0.12)] sm:px-8">
        <Link href="/dashboard" className="text-xs font-semibold text-emerald-100/65 transition hover:text-white">
          ← Kembali ke pusat pengelolaan
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/60">
              {SCHOOL.name}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              Perangkat & Terminal Absensi
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/65">
              Daftarkan terminal, lakukan pairing satu kali, pantau heartbeat, rotasi kredensial,
              dan cabut akses perangkat dari satu tempat.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/7 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100/50">Status sistem perangkat</p>
            <p className="mt-2 text-sm font-semibold">{online}/{devices.length} terminal online</p>
            <p className="mt-1 text-xs text-emerald-100/55">{waiting} pairing sedang menunggu</p>
          </div>
        </div>
      </header>

      {feedback ? (
        <section className={`mt-5 rounded-2xl border px-5 py-4 text-sm ${
          feedback.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Terminal terdaftar" value={devices.length} detail="Seluruh terminal pada institusi" />
        <Metric label="Status aktif" value={active} detail="Diizinkan mengirim transaksi" />
        <Metric label="Online sekarang" value={online} detail="Aktivitas diterima dalam 90 detik terakhir" />
        <Metric label="Kredensial aktif" value={`${configured}/${devices.length}`} detail="Terminal sudah menyelesaikan pairing" />
        <Metric label="Gangguan 24 jam" value={recentErrors} detail="Error perangkat yang tercatat" />
      </section>

      {isAdmin ? (
        <section className="mt-6 rounded-[22px] border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,43,32,0.02)] sm:p-6">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">Registrasi terminal</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#17352a]">Tambahkan perangkat baru</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Registrasi hanya membuat identitas terminal. Setelah tersimpan, gunakan tombol
              <strong className="font-semibold text-[#355548]"> Pasangkan perangkat</strong> untuk membuat kode sekali pakai.
            </p>
          </div>

          <form action={createDeviceAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
            <label>
              <span className="mb-2 block text-xs font-bold text-[#355548]">Kode terminal</span>
              <input name="code" required maxLength={50} placeholder="GERBANG_A_01" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none focus:border-[#6f9f88]" />
            </label>
            <label className="xl:col-span-2">
              <span className="mb-2 block text-xs font-bold text-[#355548]">Nama terminal</span>
              <input name="name" required maxLength={100} placeholder="Terminal Gerbang Utama" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none focus:border-[#6f9f88]" />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-[#355548]">Jenis perangkat</span>
              <select name="deviceType" defaultValue="ARDUINO_BRIDGE" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 text-sm outline-none">
                <option value="ARDUINO_BRIDGE">Penghubung Arduino</option>
                <option value="ESP32">ESP32</option>
                <option value="SIMULATOR">Simulasi</option>
                <option value="OTHER">Perangkat lainnya</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-[#355548]">Protokol</span>
              <input name="protocolVersion" required defaultValue="v1" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none" />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-[#355548]">Lokasi</span>
              <input name="location" maxLength={120} placeholder="Gerbang utama" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none" />
            </label>
            <label className="md:col-span-2 xl:col-span-5">
              <span className="mb-2 block text-xs font-bold text-[#355548]">Catatan (opsional)</span>
              <input name="note" maxLength={300} placeholder="Contoh: perangkat utama sisi timur gerbang sekolah" className="h-12 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none" />
            </label>
            <button type="submit" className="h-12 rounded-xl bg-[#176b48] px-5 text-sm font-bold text-white transition hover:bg-[#115b3d]">
              Daftarkan terminal
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">Terminal sekolah</p>
            <h2 className="mt-1.5 text-xl font-bold text-[#17352a]">Kondisi perangkat operasional</h2>
          </div>
          <p className="text-xs text-slate-500">Online = aktivitas terautentikasi ≤ 90 detik</p>
        </div>

        {devices.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#cfded6] bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#355548]">Belum ada terminal terdaftar.</p>
            <p className="mt-1 text-xs text-slate-500">Administrator dapat mendaftarkan terminal dari formulir di atas.</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {devices.map((device) => (
              <article key={device.id} className="rounded-[22px] border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,43,32,0.02)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${connectionClass(device.connectionStatus)}`}>
                        {connectionLabel(device.connectionStatus)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${pairingClass(device.pairingStatus)}`}>
                        {pairingLabel(device.pairingStatus)}
                      </span>
                      <span className="rounded-full bg-[#f1f5f3] px-2.5 py-1 text-[10px] font-bold text-[#567165]">
                        {deviceStatusLabel(device.status)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-[#17352a]">{device.name}</h3>
                    <p className="mt-1 font-mono text-xs text-slate-500">{device.code}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {deviceTypeLabel(device.deviceType)} · protokol {device.protocolVersion}
                      {device.location ? ` · ${device.location}` : ""}
                    </p>
                  </div>
                  {isAdmin ? (
                    <DevicePairingWizard
                      deviceId={device.id}
                      deviceName={device.name}
                      deviceCode={device.code}
                      protocolVersion={device.protocolVersion}
                      status={device.status}
                      secretConfigured={device.secretConfigured}
                      pairingStatus={device.pairingStatus}
                      pairingExpiresAt={device.pairingExpiresAt}
                    />
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                  {[
                    ["Heartbeat terakhir", dateTimeLabel(device.lastHeartbeatAt)],
                    ["Aktivitas terakhir", dateTimeLabel(device.lastEventAt ?? device.lastSeenAt)],
                    ["Absensi terakhir", dateTimeLabel(device.lastAttendanceAt)],
                    ["Kredensial", device.secretConfigured ? "Terpasang" : "Belum terpasang"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#f7f9f8] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
                      <p className="mt-1 text-xs font-semibold text-[#355548]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#e5ece8] pt-4 text-xs text-slate-500">
                  <span><strong className="text-[#355548]">{device.pendingTransactions}</strong> transaksi menunggu</span>
                  <span><strong className={device.recentErrors24h > 0 ? "text-amber-700" : "text-[#355548]"}>{device.recentErrors24h}</strong> gangguan / 24 jam</span>
                  {device.pairedAt ? <span>Dipasangkan {dateTimeLabel(device.pairedAt)}</span> : null}
                  {device.credentialRotatedAt ? <span>Rotasi terakhir {dateTimeLabel(device.credentialRotatedAt)}</span> : null}
                </div>

                {isAdmin && device.status !== "REVOKED" ? (
                  <form action={setDeviceStatusAction} className="mt-4 grid gap-2 border-t border-[#e5ece8] pt-4 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
                    <input type="hidden" name="deviceId" value={device.id} />
                    <select name="status" defaultValue={device.status} className="h-10 rounded-xl border border-[#d7e2dc] bg-white px-3 text-xs outline-none">
                      <option value="ACTIVE">Aktif</option>
                      <option value="DISABLED">Dinonaktifkan</option>
                      <option value="REVOKED">Cabut akses permanen</option>
                    </select>
                    <input name="note" maxLength={300} placeholder="Alasan perubahan status" className="h-10 min-w-0 rounded-xl border border-[#d7e2dc] bg-white px-3 text-xs outline-none" />
                    <button type="submit" className="h-10 rounded-xl border border-[#cfded6] px-4 text-xs font-bold text-[#355548] transition hover:bg-[#f5f8f6]">
                      Simpan
                    </button>
                  </form>
                ) : null}

                <p className="mt-4 break-all text-[10px] text-slate-400">Device ID: {device.id}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[22px] border border-[#dbe5df] bg-[#f6f9f7] p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">Siklus keamanan perangkat</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["01 · Registrasi", "Admin membuat identitas terminal dan menentukan lokasi."],
            ["02 · Pairing", "Kode acak sekali pakai berlaku 10 menit dan tidak disimpan dalam bentuk plaintext."],
            ["03 · Operasional", "Device ID + secret digunakan untuk heartbeat dan transaksi absensi."],
            ["04 · Rotasi / revoke", "Kredensial dapat dirotasi lewat pairing ulang atau dicabut permanen oleh admin."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-[#dbe5df] bg-white p-4">
              <p className="text-xs font-bold text-[#24483a]">{title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
