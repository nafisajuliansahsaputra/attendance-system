"use client";

import { useEffect, useRef, useState } from "react";

export function ProtectedPortalButton() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Portal petugas
        <span aria-hidden="true" className="text-xs text-[var(--muted)]">🔒</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0c261d]/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="protected-portal-title"
            aria-describedby="protected-portal-description"
            className="w-full max-w-[520px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(5,35,25,0.28)]"
          >
            <div className="border-b border-[var(--border)] bg-[var(--surface-soft)]/70 px-6 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--success-soft)] text-lg" aria-hidden="true">
                    🔒
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--success)]">
                      Akses terbatas
                    </p>
                    <h2 id="protected-portal-title" className="mt-1 text-xl font-bold tracking-[-0.025em] text-[var(--text)] sm:text-2xl">
                      Portal operasional dilindungi
                    </h2>
                  </div>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-white text-lg leading-none text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-7">
              <p id="protected-portal-description" className="text-sm leading-6 text-[var(--muted)]">
                Portal ini digunakan oleh administrator dan petugas sekolah untuk mengelola data identitas siswa, UID RFID,
                profil wajah, jadwal, riwayat kehadiran, serta hak akses pengguna.
              </p>

              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--success-soft)]/55 p-4">
                <p className="text-sm font-semibold text-[var(--text)]">Mengapa tidak dibuka dari demo publik?</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                  Demi keamanan dan privasi data, lingkungan demonstrasi tidak memberikan jalur masuk ke portal operasional.
                  Akses hanya diberikan kepada pengguna sekolah yang telah terdaftar dan berwenang.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--success-strong)]"
                >
                  Mengerti
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-soft)]"
                >
                  Kembali ke demo
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
