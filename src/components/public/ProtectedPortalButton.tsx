"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ProtectedPortalButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerButtonRef.current?.focus();
    };
  }, [open]);

  const modal =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0c261d]/50 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-8"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="protected-portal-title"
              aria-describedby="protected-portal-description"
              className="my-auto w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(5,35,25,0.28)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-soft)]/70 px-5 py-5 sm:px-6">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--success)]">
                      Akses terbatas
                    </p>
                    <h2
                      id="protected-portal-title"
                      className="mt-1 text-xl font-bold tracking-[-0.025em] text-[var(--text)] sm:text-[22px]"
                    >
                      Portal operasional dilindungi
                    </h2>
                  </div>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-white text-lg leading-none text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)]"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <p id="protected-portal-description" className="text-sm leading-6 text-[var(--muted)]">
                  Portal ini digunakan oleh administrator dan petugas sekolah untuk mengelola identitas siswa, UID RFID,
                  profil wajah, jadwal, riwayat kehadiran, dan hak akses pengguna.
                </p>

                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--success-soft)]/55 p-4">
                  <p className="text-sm font-semibold text-[var(--text)]">Mengapa tidak dibuka dari demo publik?</p>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                    Lingkungan demonstrasi sengaja dipisahkan dari portal operasional untuk menjaga keamanan dan privasi
                    data. Akses hanya diberikan kepada pengguna sekolah yang terdaftar dan berwenang.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--success-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)]"
                >
                  Kembali ke demo
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Portal petugas
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </button>

      {modal}
    </>
  );
}
