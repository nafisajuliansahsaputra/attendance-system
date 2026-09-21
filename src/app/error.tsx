"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SchoolLogo } from "@/components/school/SchoolLogo";
import { SCHOOL } from "@/config/school";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Attendance System runtime error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border border-[var(--border)] bg-white p-7 text-center shadow-xl shadow-black/5 sm:p-10">
        <SchoolLogo size={56} className="mx-auto rounded-2xl" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
          {SCHOOL.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
          Sistem sedang mengalami kendala
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
          Halaman ini belum dapat diproses. Silakan coba kembali atau kembali ke halaman utama.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--success-strong)]"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
          >
            Kembali ke halaman utama
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-[10px] text-[var(--muted)]">Kode kejadian: {error.digest}</p>
        ) : null}
      </section>
    </main>
  );
}
