import Link from "next/link";
import { getAdminStudentDirectory } from "../../../infrastructure/admin/supabase-students";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import {
  assignStudentRfidAction,
  transferStudentEnrollmentAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface StudentAdminPageProps {
  searchParams: Promise<{
    q?: string;
    class?: string;
    saved?: string;
    error?: string;
  }>;
}

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "rfid") {
    return {
      tone: "success" as const,
      text: "Kartu RFID berhasil disimpan. Kartu aktif sebelumnya, jika ada, disimpan sebagai riwayat REPLACED.",
    };
  }

  if (saved === "class") {
    return {
      tone: "success" as const,
      text: "Enrollment kelas berhasil disimpan. Perpindahan kelas mempertahankan rentang enrollment lama untuk laporan historis.",
    };
  }

  const errors: Record<string, string> = {
    "rfid-in-use": "UID RFID tersebut masih aktif untuk siswa lain.",
    "student-not-found": "Data siswa tidak ditemukan di institusi ini.",
    forbidden: "Akun ini tidak memiliki izin administrator.",
    "invalid-rfid": "UID RFID tidak valid.",
    "invalid-input": "Data form RFID tidak valid. Periksa UID dan coba lagi.",
    "save-failed": "RFID belum dapat disimpan karena terjadi kesalahan server.",
    "invalid-transfer": "Data perpindahan kelas tidak valid.",
    "transfer-date": "Tanggal efektif harus setelah tanggal mulai enrollment kelas yang sedang aktif.",
    "academic-year-date": "Tanggal efektif tidak berada di dalam tahun ajaran yang terdaftar.",
    "class-not-found": "Kelas tujuan tidak tersedia atau sudah tidak aktif.",
    "enrollment-overlap": "Rentang enrollment akan tumpang tindih dengan riwayat kelas lain.",
    "transfer-failed": "Perpindahan kelas belum dapat disimpan karena terjadi kesalahan server.",
  };

  if (error && errors[error]) {
    return { tone: "error" as const, text: errors[error] };
  }

  return null;
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            ← Kembali ke dashboard
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            System Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Siswa & identitas terminal
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Kelola kelas aktif, RFID, dan face profile tanpa menghapus histori. Perpindahan kelas membuat enrollment baru dengan tanggal efektif, sementara credential dan biometric profile lama tetap auditable.
          </p>
        </div>
      </header>

      {feedback ? (
        <section
          className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
            feedback.tone === "success"
              ? "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]"
              : "border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] text-[var(--danger)]"
          }`}
        >
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <form method="get" className="grid gap-4 lg:grid-cols-[1fr_18rem_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Cari siswa / NIS / RFID
            </span>
            <input
              name="q"
              defaultValue={search}
              maxLength={100}
              placeholder="Contoh: Alya, 1001, DE:MO:10:01"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Kelas aktif
            </span>
            <select
              name="class"
              defaultValue={selectedClass?.id ?? ""}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
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
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]"
          >
            Terapkan filter
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-semibold">Direktori siswa</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {rows.length} siswa cocok dengan filter saat ini.
            </p>
          </div>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Face enrollment aktif dengan local SFace inference; liveness/anti-spoof belum diimplementasikan.
          </p>
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1560px] border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Siswa</th>
                  <th className="px-5 py-4 font-medium">Kelas aktif</th>
                  <th className="px-5 py-4 font-medium">Pindah / enroll kelas</th>
                  <th className="px-5 py-4 font-medium">RFID aktif</th>
                  <th className="px-5 py-4 font-medium">Face profile</th>
                  <th className="px-5 py-4 font-medium">Assign / replace RFID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => (
                  <tr key={student.studentId} className="border-t border-[var(--border)] align-top">
                    <td className="px-5 py-5">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">NIS {student.nis}</p>
                      {!student.active ? (
                        <p className="mt-2 text-xs text-[var(--danger)]">Siswa nonaktif</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-5">
                      <p>{student.className ?? "Tanpa kelas aktif"}</p>
                      {student.classCode ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">{student.classCode}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-5">
                      <form action={transferStudentEnrollmentAction} className="grid min-w-[330px] gap-2">
                        <input type="hidden" name="studentId" value={student.studentId} />
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="classId" value={selectedClass?.id ?? ""} />
                        <select
                          name="targetClassId"
                          required
                          defaultValue={student.classId ?? ""}
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
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
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                        />
                        <input
                          name="note"
                          maxLength={300}
                          placeholder="Alasan / catatan mutasi (opsional)"
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                        >
                          {student.classId ? "Simpan perpindahan" : "Enroll ke kelas"}
                        </button>
                      </form>
                    </td>
                    <td className="px-5 py-5">
                      {student.rfidUid ? (
                        <>
                          <p className="font-mono font-medium">{student.rfidUid}</p>
                          <p className="mt-1 text-xs text-[var(--success)]">ACTIVE</p>
                        </>
                      ) : (
                        <p className="text-[var(--warning)]">Belum terdaftar</p>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      {student.faceProfileId ? (
                        <>
                          <p className="font-medium">{student.faceStatus ?? "ACTIVE"}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {[student.faceModelName, student.faceModelVersion]
                              .filter(Boolean)
                              .join(" · ") || "Face profile tersedia"}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--warning)]">Belum enroll</p>
                      )}
                      <Link
                        href={`/dashboard/students/${student.studentId}/face`}
                        className="mt-3 inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
                      >
                        {student.faceProfileId ? "Enroll ulang wajah" : "Enroll wajah"}
                      </Link>
                    </td>
                    <td className="px-5 py-5">
                      <form action={assignStudentRfidAction} className="grid min-w-[330px] gap-2">
                        <input type="hidden" name="studentId" value={student.studentId} />
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="classId" value={selectedClass?.id ?? ""} />
                        <input
                          name="uid"
                          required
                          maxLength={100}
                          defaultValue={student.rfidUid ?? ""}
                          placeholder="UID RFID"
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-sm outline-none"
                        />
                        <input
                          name="note"
                          maxLength={300}
                          placeholder="Catatan penggantian (opsional)"
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
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
        ) : (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">
            Tidak ada siswa yang cocok dengan filter.
          </div>
        )}
      </section>
    </main>
  );
}
