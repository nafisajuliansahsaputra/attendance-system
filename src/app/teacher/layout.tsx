import Link from "next/link";
import { SCHOOL } from "@/config/school";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--success)] text-[10px] font-bold text-white">
              A12
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">{SCHOOL.shortName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/teacher"
              className="rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface-soft)]"
            >
              Kehadiran harian
            </Link>
            <Link
              href="/teacher/reports"
              className="rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface-soft)]"
            >
              Rekap kehadiran
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
