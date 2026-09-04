import Link from "next/link";
import { SCHOOL } from "@/config/school";
import { getAdminStudentDirectory } from "../../../infrastructure/admin/supabase-students";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import {
  assignStudentRfidAction,
  transferStudentEnrollmentAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

interface StudentAdminPageProps {
  searchParams: Promise<{
    q?: string;
    class?: string;
    page?: string;
    saved?: string;
    error?: string;
  }>;
}

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "rfid") {
    return {
      tone: "success" as const,
      text: "Kartu RFID berhasil disimpan. Kartu lama, jika ada, tetap disimpan sebagai riwayat penggantian.",
    };
  }

  if (saved === "class") {
    return {
      tone: "success" as const,
      text: "Data kelas siswa berhasil disimpan. Riwayat kelas sebelumnya tetap dipertahankan untuk kebutuhan laporan.",
    };
  }

  const errors: Record<string, string> = {
    "rfid-in-use": "UID RFID tersebut masih aktif dan digunakan oleh siswa lain.",
    "student-not-found": "Data siswa tidak ditemukan di sekolah ini.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "invalid-rfid": "UID RFID tidak valid.",
    "invalid-input": "Data kartu RFID tidak valid. Periksa kembali UID lalu coba lagi.",
    "save-failed": "Kartu RFID belum dapat disimpan karena terjadi kesalahan pada server.",
    "invalid-transfer": "Data perpindahan kelas tidak valid.",
    "transfer-date": "Tanggal efektif harus setelah tanggal mulai kelas siswa yang sedang aktif.",
    "academic-year-date": "Tanggal efektif tidak berada di dalam tahun ajaran yang terdaftar.",
    "class-not-found": "Kelas tujuan tidak tersedia atau sudah tidak aktif.",
    "enrollment-overlap": "Rentang tanggal kelas bertumpang tindih dengan riwayat kelas siswa yang lain.",
    "transfer-failed": "Perpindahan kelas belum dapat disimpan karena terjadi kesalahan pada server.",
  };

  if (error && errors[error]) {
    return { tone: "error" as const, text: errors[error] };
  }

  return null;
}

function profileStatusLabel(status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "REVOKED":
      return "Dicabut";
    case "REPLACED":
      return "Diganti";
    case "PENDING_REENROLLMENT":
      return "Perlu daftar ulang";
    default:
      return status ?? "Aktif";
  }
}

function directoryPageHref(input: {
  search?: string;
  classId?: string;
  page: number;
}) {
  const query = new URLSearchParams();
  if (input.search) query.set("q", input.search);
  if (input.classId) query.set("class", input.classId);
  if (input.page > 1) query.set("page", String(input.page));
  const suffix = query.toString();
  return suffix ? `/dashboard/students?${suffix}` : "/dashboard/students";
}

export default async function StudentAdminPage({
  searchParams,
}: StudentAdminPageProps) {
  const { context, userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) || "";
  const selectedClass = context.classes.find((item) => item.id === params.class);
  const rows = await getAdminStudentDirectory({
    actorUserId: userId,
    search: search || undefined,
    classId: selectedClass?.id,
  });
  const feedback = feedbackMessage(params.saved, params.error);

  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(
    Math.max(Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1, 1),
    totalPages,
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, rows.length);
  const visibleRows = rows.slice(pageStart, pageEnd);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            ← Kembali ke pusat pengelolaan
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            {SCHOOL.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Data Siswa & Identitas Absensi
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Kelola kelas aktif, kartu RFID, dan profil wajah siswa tanpa menghapus riwayat sebelumnya. Perpindahan kelas dicatat berdasarkan tanggal efektif agar laporan lama tetap sesuai dengan kondisi pada saat itu.
          </p>
        </div>
      </header>

      {feedback ? (
        <section
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <form method="get" className="grid gap-4 lg:grid-cols-[1fr_18rem_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Cari nama / NIS / RFID
            </span>
            <input
              name="q"
              defaultValue={search}
              maxLength={100}
              placeholder="Contoh: Alya, DEMO1001, DE:MO:10:01"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Kelas aktif
            </span>
            <select
              name="class"
              defaultValue={selectedClass?.id ?? ""}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Semua kelas</option>
              {context.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white"
          >
            Tampilkan data
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold">Daftar siswa</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {rows.length.toLocaleString("id-ID")} siswa sesuai dengan pencarian saat ini.
            </p>
          </div>
          <p className="max-w-xl text-xs leading-5 text-[var(--muted)] sm:text-right">
            Pendaftaran wajah menggunakan SFace. Pemeriksaan anti-spoof/liveness belum tersedia pada versi saat ini.
          </p>
        </div>

        {rows.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1560px] border-collapse text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Siswa</th>
                    <th className="px-5 py-4 font-medium">Kelas aktif</th>
                    <th className="px-5 py-4 font-medium">Perpindahan kelas</th>
                    <th className="px-5 py-4 font-medium">Kartu RFID aktif</th>
                    <th className="px-5 py-4 font-medium">Profil wajah</th>
                    <th className="px-5 py-4 font-medium">Daftar / ganti kartu RFID</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((student) => (
                    <tr key={student.studentId} className="border-t border-[var(--border)] align-top">
                      <td className="px-5 py-5">
                        <p className="font-medium">{student.fullName}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">NIS {student.nis}</p>
                        {!student.active ? (
                          <p className="mt-2 text-xs text-[var(--danger)]">Siswa tidak aktif</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5">
                        <p>{student.className ?? "Belum memiliki kelas aktif"}</p>
                        {student.classCode ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">{student.classCode}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5">
                        <form action={transferStudentEnrollmentAction} className="grid min-w-[330px] gap-2">
                          <input type="hidden" name="studentId" value={student.studentId} />
                          <input type="hidden" name="search" value={search} />
                          <input type="hidden" name="classId" value={selectedClass?.id ?? ""} />
                          <input type="hidden" name="page" value={String(currentPage)} />
                          <select
                            name="targetClassId"
                            required
                            defaultValue={student.classId ?? ""}
                            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                          >
                            <option value="" disabled>
                              Pilih kelas tujuan
                            </option>
                            {context.classes.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <input
                            name="effectiveOn"
                            type="date"
                            required
                            defaultValue={context.schoolDate}
                            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                          />
                          <input
                            name="note"
                            maxLength={300}
                            placeholder="Alasan / catatan perpindahan (opsional)"
                            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                          >
                            {student.classId ? "Simpan perpindahan" : "Masukkan ke kelas"}
                          </button>
                        </form>
                      </td>
                      <td className="px-5 py-5">
                        {student.rfidUid ? (
                          <>
                            <p className="font-mono font-medium">{student.rfidUid}</p>
                            <p className="mt-1 text-xs text-emerald-700">Aktif</p>
                          </>
                        ) : (
                          <p className="text-amber-700">Belum terdaftar</p>
                        )}
                      </td>
                      <td className="px-5 py-5">
                        {student.faceProfileId ? (
                          <>
                            <p className="font-medium">{profileStatusLabel(student.faceStatus)}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {[student.faceModelName, student.faceModelVersion]
                                .filter(Boolean)
                                .join(" · ") || "Profil wajah tersedia"}
                            </p>
                          </>
                        ) : (
                          <p className="text-amber-700">Belum didaftarkan</p>
                        )}
                        <Link
                          href={`/dashboard/students/${student.studentId}/face`}
                          className="mt-3 inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                        >
                          {student.faceProfileId ? "Daftarkan ulang wajah" : "Daftarkan wajah"}
                        </Link>
                      </td>
                      <td className="px-5 py-5">
                        <form action={assignStudentRfidAction} className="grid min-w-[330px] gap-2">
                          <input type="hidden" name="studentId" value={student.studentId} />
                          <input type="hidden" name="search" value={search} />
                          <input type="hidden" name="classId" value={selectedClass?.id ?? ""} />
                          <input type="hidden" name="page" value={String(currentPage)} />
                          <input
                            name="uid"
                            required
                            maxLength={100}
                            defaultValue={student.rfidUid ?? ""}
                            placeholder="UID kartu RFID"
                            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 font-mono text-sm outline-none"
                          />
                          <input
                            name="note"
                            maxLength={300}
                            placeholder="Catatan penggantian (opsional)"
                            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                          >
                            {student.rfidUid ? "Simpan / ganti kartu" : "Daftarkan kartu"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-[var(--muted)]">
                Menampilkan {pageStart + 1}–{pageEnd} dari {rows.length.toLocaleString("id-ID")} siswa
                {selectedClass ? ` di ${selectedClass.name}` : ""}.
              </p>

              {totalPages > 1 ? (
                <nav className="flex flex-wrap items-center gap-2" aria-label="Navigasi halaman siswa">
                  {currentPage > 1 ? (
                    <Link
                      href={directoryPageHref({
                        search: search || undefined,
                        classId: selectedClass?.id,
                        page: 1,
                      })}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      Pertama
                    </Link>
                  ) : null}

                  {currentPage > 1 ? (
                    <Link
                      href={directoryPageHref({
                        search: search || undefined,
                        classId: selectedClass?.id,
                        page: currentPage - 1,
                      })}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      ← Sebelumnya
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] opacity-50">
                      ← Sebelumnya
                    </span>
                  )}

                  <span className="min-w-[110px] text-center text-xs font-semibold text-[var(--text)]">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={directoryPageHref({
                        search: search || undefined,
                        classId: selectedClass?.id,
                        page: currentPage + 1,
                      })}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      Berikutnya →
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] opacity-50">
                      Berikutnya →
                    </span>
                  )}

                  {currentPage < totalPages ? (
                    <Link
                      href={directoryPageHref({
                        search: search || undefined,
                        classId: selectedClass?.id,
                        page: totalPages,
                      })}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                    >
                      Terakhir
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">
            Tidak ada siswa yang sesuai dengan pencarian.
          </div>
        )}
      </section>
    </main>
  );
}
