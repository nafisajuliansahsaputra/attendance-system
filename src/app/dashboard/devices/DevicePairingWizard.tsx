"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  AdminDevicePairingStatus,
  AdminDeviceStatus,
} from "@/application/admin/device-types";
import {
  cancelDevicePairingAction,
  createDevicePairingAction,
  type PairingActionResult,
} from "./actions";

interface DevicePairingWizardProps {
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  protocolVersion: string;
  status: AdminDeviceStatus;
  secretConfigured: boolean;
  pairingStatus: AdminDevicePairingStatus;
  pairingExpiresAt?: string;
}

function remainingLabel(expiresAt?: string) {
  if (!expiresAt) return null;
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "Kedaluwarsa";
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DevicePairingWizard({
  deviceId,
  deviceName,
  deviceCode,
  protocolVersion,
  status,
  secretConfigured,
  pairingStatus,
  pairingExpiresAt,
}: DevicePairingWizardProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PairingActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setClock] = useState(0);
  const [pending, startTransition] = useTransition();

  const currentExpiry =
    result && result.ok ? result.expiresAt : pairingExpiresAt;
  const countdown = remainingLabel(currentExpiry);

  useEffect(() => {
    if (!open || !currentExpiry) return;
    const timer = window.setInterval(() => setClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [currentExpiry, open]);

  function closeModal() {
    setCopied(false);
    setResult(null);
    setOpen(false);
  }

  function generate() {
    setCopied(false);
    startTransition(async () => {
      const next = await createDevicePairingAction(deviceId);
      setResult(next);
    });
  }

  function cancelPairing() {
    startTransition(async () => {
      await cancelDevicePairingAction(deviceId);
      setResult(null);
      closeModal();
    });
  }

  async function copyCode() {
    if (!result?.ok) return;
    await navigator.clipboard.writeText(result.pairingCode);
    setCopied(true);
  }

  const disabled = status === "REVOKED";
  const buttonLabel = secretConfigured
    ? "Pair ulang / rotasi kunci"
    : pairingStatus === "WAITING"
      ? "Lihat pairing"
      : "Pasangkan perangkat";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setCopied(false);
          setOpen(true);
        }}
        className="rounded-xl bg-[#176b48] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#115b3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {disabled ? "Akses dicabut" : buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#0b231a]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Pasangkan terminal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#d7e3dc] bg-white shadow-[0_30px_90px_rgba(7,31,22,0.28)]">
            <div className="flex items-start justify-between gap-5 border-b border-[#e1e9e4] px-6 py-5 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#56806d]">
                  Pairing terminal aman
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#17352a]">
                  {deviceName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {deviceCode} · protokol {protocolVersion}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#dce6e0] text-lg text-slate-500 transition hover:bg-[#f5f8f6]"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6 sm:px-7">
              {!result?.ok ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["01", "Buat kode", "Kode sekali pakai berlaku 10 menit."],
                      ["02", "Masukkan di perangkat", "Bridge atau firmware mengklaim kode melalui API."],
                      ["03", "Kredensial aktif", "Secret baru diterbitkan langsung ke perangkat."],
                    ].map(([number, title, description]) => (
                      <div key={number} className="rounded-2xl border border-[#dce6e0] bg-[#f8faf9] p-4">
                        <span className="text-[10px] font-bold text-[#1b7a52]">{number}</span>
                        <p className="mt-2 text-sm font-bold text-[#17352a]">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                      </div>
                    ))}
                  </div>

                  {pairingStatus === "WAITING" ? (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      Terminal sedang menunggu pairing{countdown ? ` · tersisa ${countdown}` : ""}.
                      Kode lama tidak dapat ditampilkan kembali. Membuat kode baru akan membatalkan kode sebelumnya.
                    </div>
                  ) : null}

                  {result && !result.ok ? (
                    <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {result.error}
                    </div>
                  ) : null}

                  <div className="mt-6 rounded-2xl border border-[#dce6e0] p-5">
                    <p className="text-sm font-bold text-[#17352a]">
                      {secretConfigured ? "Rotasi kredensial perangkat" : "Siapkan perangkat untuk pairing"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Secret perangkat tidak dikirim ke browser administrator. Setelah kode diklaim,
                      server menerbitkan secret baru hanya satu kali langsung ke perangkat.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    {pairingStatus === "WAITING" ? (
                      <button
                        type="button"
                        onClick={cancelPairing}
                        disabled={pending}
                        className="rounded-xl border border-[#d6e1db] px-4 py-2.5 text-sm font-semibold text-[#355548] transition hover:bg-[#f5f8f6] disabled:opacity-50"
                      >
                        Batalkan pairing
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={generate}
                      disabled={pending}
                      className="rounded-xl bg-[#176b48] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#115b3d] disabled:opacity-50"
                    >
                      {pending ? "Membuat kode..." : secretConfigured ? "Buat kode rotasi" : "Buat kode pairing"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-5 text-center sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                      {result.mode === "ROTATE" ? "Kode rotasi kredensial" : "Kode pairing sekali pakai"}
                    </p>
                    <p className="mt-4 break-all font-mono text-3xl font-bold tracking-[0.1em] text-[#12382b] sm:text-4xl">
                      {result.pairingCode}
                    </p>
                    <p className="mt-3 text-xs text-emerald-800/70">
                      Berlaku {countdown ?? "10:00"} · hanya dapat digunakan satu kali
                    </p>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-800"
                    >
                      {copied ? "Kode disalin ✓" : "Salin kode"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#dce6e0] p-5">
                    <p className="text-sm font-bold text-[#17352a]">Hubungkan perangkat</p>
                    <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                      <li><strong className="text-[#24483a]">1.</strong> Buka aplikasi bridge/terminal pada komputer perangkat.</li>
                      <li><strong className="text-[#24483a]">2.</strong> Masukkan kode di atas dan gunakan protokol <code>{protocolVersion}</code>.</li>
                      <li><strong className="text-[#24483a]">3.</strong> Perangkat mengirim kode ke <code>/api/device/v1/pair</code>.</li>
                      <li><strong className="text-[#24483a]">4.</strong> Setelah berhasil, secret disimpan lokal pada perangkat dan heartbeat dimulai.</li>
                    </ol>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#f5f8f6] p-4 text-xs leading-5 text-slate-500">
                    Untuk bridge Node bawaan repo, jalankan <code>npm run device:pair:env</code> setelah mengisi
                    <code> PAIRING_CODE</code> dan <code>ATTENDANCE_API_URL</code> pada file env lokal perangkat.
                  </div>

                  <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      onClick={cancelPairing}
                      disabled={pending}
                      className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      Batalkan kode
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl bg-[#176b48] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#115b3d]"
                    >
                      Selesai
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
