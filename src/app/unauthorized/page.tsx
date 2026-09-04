import Link from "next/link";
import { SCHOOL } from "@/config/school";

interface UnauthorizedPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const { reason } = await searchParams;
  const message =
    reason === "profile"
      ? "Akun Anda berhasil masuk, tetapi belum memiliki profil hak akses aktif di sistem absensi sekolah."
      : "Akun Anda tidak memiliki hak akses untuk membuka halaman tersebut.";

  return (
    <main className="mx-auto flex min-h-screen w-full items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--danger)]">
          Akses ditolak
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Halaman tidak dapat dibuka</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">{message}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">{SCHOOL.name}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke halaman masuk
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm"
          >
            Halaman utama
          </Link>
        </div>
      </section>
    </main>
  );
}
