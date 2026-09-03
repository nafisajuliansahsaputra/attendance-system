import Link from "next/link";
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
      text: "Device berhasil diregister. Provision secret sekali lewat CLI sebelum terminal boleh memakai Device API.",
    };
  }
  if (saved === "status") {
    return {
      tone: "success" as const,
      text: "Status device berhasil diperbarui. Pending verification transaction dibatalkan otomatis saat device dinonaktifkan atau direvoke.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data device tidak valid.",
    "code-in-use": "Kode device sudah dipakai terminal lain.",
    "invalid-code": "Kode device hanya boleh berisi huruf, angka, underscore, atau dash.",
    "invalid-name": "Nama device tidak valid.",
    "invalid-type": "Tipe device tidak didukung.",
    "invalid-protocol": "Protocol version harus berbentuk seperti v1 atau v1.1.",
    revoked: "Device yang sudah REVOKED tidak dapat diaktifkan kembali. Register device baru jika hardware diganti.",
    "not-found": "Device tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "save-failed": "Perubahan device belum dapat disimpan karena terjadi kesalahan server.",
  };

  return error && errors[error]
    ? { tone: "error" as const, text: errors[error] }
    : null;
}

function lastSeenLabel(value?: string) {
  if (!value) return "Belum pernah heartbeat";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
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
          ← Kembali ke dashboard
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          Device operations
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Terminal & device</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Pantau terminal, heartbeat, protocol, error, dan kesiapan secret. Plaintext device secret tidak pernah disimpan atau ditampilkan ulang oleh dashboard.
        </p>
      </header>

      {feedback ? (
        <section className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${feedback.tone === "success" ? "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]" : "border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] text-[var(--danger)]"}`}>
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Device aktif</p>
          <p className="mt-2 text-3xl font-semibold">{active}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Secret terpasang</p>
          <p className="mt-2 text-3xl font-semibold">{configured}/{devices.length}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Device error 24 jam</p>
          <p className="mt-2 text-3xl font-semibold">{recentErrors}</p>
        </article>
      </section>

      {isAdmin ? (
        <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Register terminal</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Registration hanya membuat identitas device. Setelah itu set <code>DEVICE_ID</code> di environment lokal lalu jalankan <code>npm run device:rotate-secret:env</code>; plaintext secret hanya muncul sekali di terminal lokal.
          </p>
          <form action={createDeviceAction} className="mt-5 grid gap-4 lg:grid-cols-5 lg:items-end">
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Kode</span>
              <input name="code" required maxLength={50} placeholder="GATE_A_01" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Nama</span>
              <input name="name" required maxLength={100} placeholder="Terminal Gerbang Utama" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Tipe</span>
              <select name="deviceType" defaultValue="ARDUINO_BRIDGE" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none">
                <option value="ARDUINO_BRIDGE">Arduino bridge</option>
                <option value="ESP32">ESP32</option>
                <option value="SIMULATOR">Simulator</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Protocol</span>
              <input name="protocolVersion" required defaultValue="v1" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
            </label>
            <label className="lg:col-span-4">
              <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Catatan audit (opsional)</span>
              <input name="note" maxLength={300} placeholder="Lokasi / alasan registrasi" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
            </label>
            <button type="submit" className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]">
              Register device
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold">Device directory</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Operator bersifat monitoring-only; perubahan status hanya tersedia untuk System Admin.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Device</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Secret</th>
                <th className="px-5 py-4 font-medium">Heartbeat</th>
                <th className="px-5 py-4 font-medium">Pending / Error</th>
                <th className="px-5 py-4 font-medium">Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-5 py-5">
                    <p className="font-medium">{device.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">{device.code}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{device.deviceType} · {device.protocolVersion}</p>
                    <p className="mt-2 break-all text-[11px] text-[var(--muted)]">ID {device.id}</p>
                  </td>
                  <td className="px-5 py-5 font-medium">{device.status}</td>
                  <td className="px-5 py-5">
                    <span className={device.secretConfigured ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                      {device.secretConfigured ? "Configured" : "Belum diprovision"}
                    </span>
                  </td>
                  <td className="px-5 py-5">{lastSeenLabel(device.lastSeenAt)}</td>
                  <td className="px-5 py-5">
                    <p>{device.pendingTransactions} pending</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{device.recentErrors24h} error / 24 jam</p>
                  </td>
                  <td className="px-5 py-5">
                    {isAdmin && device.status !== "REVOKED" ? (
                      <form action={setDeviceStatusAction} className="grid min-w-[240px] gap-2">
                        <input type="hidden" name="deviceId" value={device.id} />
                        <select name="status" defaultValue={device.status} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="DISABLED">DISABLED</option>
                          <option value="REVOKED">REVOKED</option>
                        </select>
                        <input name="note" maxLength={300} placeholder="Alasan perubahan" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none" />
                        <button type="submit" className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">
                          Simpan status
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Monitoring only</span>
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
