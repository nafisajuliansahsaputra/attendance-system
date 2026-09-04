import Link from "next/link";
import { SCHOOL } from "@/config/school";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border border-[var(--border)] bg-white p-7 text-center shadow-xl shadow-black/5 sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--success)] text-sm font-bold text-white">
          A12
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
          {SCHOOL.name}
        </p>
        <p className="mt-6 text-sm font-semibold text-[var(--muted)]">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
          Alamat yang dibuka tidak tersedia atau sudah dipindahkan.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--success-strong)]"
          >
            Halaman utama
          </Link>
          <Link
            href="/terminal/lab"
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
          >
            Coba simulasi absensi
          </Link>
        </div>
      </section>
    </main>
  );
}
