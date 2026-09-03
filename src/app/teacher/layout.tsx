import Link from "next/link";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-5 py-3 sm:px-8">
          <Link
            href="/teacher"
            className="rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface-soft)]"
          >
            Absensi harian
          </Link>
          <Link
            href="/teacher/reports"
            className="rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface-soft)]"
          >
            Rekap
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
