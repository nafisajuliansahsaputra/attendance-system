import Link from "next/link";

interface UnauthorizedPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const { reason } = await searchParams;
  const message =
    reason === "profile"
      ? "Akun Anda berhasil diautentikasi, tetapi belum memiliki profil akses aktif di sistem."
      : "Akun Anda tidak memiliki role yang diizinkan untuk membuka halaman tersebut.";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--danger)]">
          Access denied
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Akses tidak tersedia</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">{message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-[#07100d]"
          >
            Kembali ke login
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm"
          >
            Project overview
          </Link>
        </div>
      </section>
    </main>
  );
}
