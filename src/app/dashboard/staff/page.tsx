import Link from "next/link";
import { getAdminStaffDirectory } from "../../../infrastructure/admin/supabase-staff";
import { getReportingPeriodPresets } from "../../../infrastructure/reports/supabase-report-periods";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";
import { provisionStaffAction, setStaffActiveAction } from "./actions";

export const dynamic = "force-dynamic";

interface StaffPageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

function feedbackMessage(saved?: string, error?: string) {
  if (saved === "created") {
    return {
      tone: "success" as const,
      text: "Akun staf berhasil dibuat dan ditautkan ke profile aplikasi. Password tidak disimpan oleh Attendance System.",
    };
  }
  if (saved === "status") {
    return {
      tone: "success" as const,
      text: "Status akses staf berhasil diperbarui.",
    };
  }

  const errors: Record<string, string> = {
    "invalid-input": "Data staf tidak valid. Password sementara minimal 12 karakter.",
    "auth-create": "Akun Auth tidak dapat dibuat. Periksa email atau apakah akun sudah terdaftar.",
    assignment: "Assignment wali kelas tidak valid untuk kelas/tahun ajaran yang dipilih.",
    "self-deactivate": "Admin tidak boleh menonaktifkan akun dirinya sendiri.",
    "last-admin": "System Admin aktif terakhir tidak boleh dinonaktifkan.",
    "not-found": "Profile staf tidak ditemukan.",
    forbidden: "Akun ini tidak memiliki izin System Admin.",
    "cleanup-failed": "Provisioning gagal dan cleanup Auth membutuhkan pemeriksaan administrator.",
    "save-failed": "Perubahan staf belum dapat disimpan karena terjadi kesalahan server.",
  };

  return error && errors[error]
    ? { tone: "error" as const, text: errors[error] }
    : null;
}

export default async function StaffManagementPage({ searchParams }: StaffPageProps) {
  const { context, userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const params = await searchParams;
  const [staff, periods] = await Promise.all([
    getAdminStaffDirectory(userId),
    getReportingPeriodPresets(userId),
  ]);
  const feedback = feedbackMessage(params.saved, params.error);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-[var(--border)] pb-7">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]">
          ← Kembali ke dashboard
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          Identity & RBAC
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Staf & akses</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Supabase Auth membuktikan identitas login; role dan scope tetap berasal dari profile aplikasi dan assignment wali kelas. Tidak ada public sign-up.
        </p>
      </header>

      {feedback ? (
        <section className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${feedback.tone === "success" ? "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]" : "border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] text-[var(--danger)]"}`}>
          {feedback.text}
        </section>
      ) : null}

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Provision staf internal</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Gunakan password sementara yang kuat dan kirimkan lewat kanal aman. Password hanya diteruskan ke Supabase Auth saat akun dibuat; Attendance System tidak menyimpannya.
        </p>

        <form action={provisionStaffAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Nama lengkap</span>
            <input name="fullName" required maxLength={120} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Email login</span>
            <input name="email" type="email" required maxLength={254} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Password sementara</span>
            <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Role</span>
            <select name="role" defaultValue="HOMEROOM_TEACHER" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none">
              <option value="HOMEROOM_TEACHER">Wali Kelas</option>
              <option value="OPERATOR">Operator</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Kelas (khusus wali kelas)</span>
            <select name="classId" defaultValue="" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none">
              <option value="">— Tidak berlaku —</option>
              {context.classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">Tahun ajaran (khusus wali kelas)</span>
            <select name="academicYearId" defaultValue={periods.academicYear?.id ?? ""} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none">
              <option value="">— Tidak berlaku —</option>
              {periods.academicYear ? (
                <option value={periods.academicYear.id}>{periods.academicYear.label}</option>
              ) : null}
            </select>
          </label>
          <button type="submit" className="justify-self-start rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]">
            Buat akun staf
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold">Direktori staf</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{staff.length} profile aplikasi dalam institusi ini.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Staf</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Assignment</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Kontrol</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.userId} className="border-t border-[var(--border)] align-top">
                  <td className="px-5 py-5">
                    <p className="font-medium">{person.fullName}</p>
                    <p className="mt-1 break-all text-[11px] text-[var(--muted)]">User ID {person.userId}</p>
                  </td>
                  <td className="px-5 py-5">{person.role}</td>
                  <td className="px-5 py-5">
                    {person.homeroomAssignments.length ? (
                      <div className="grid gap-2">
                        {person.homeroomAssignments.map((assignment) => (
                          <div key={assignment.id}>
                            <p>{assignment.className}</p>
                            <p className="text-xs text-[var(--muted)]">{assignment.academicYearLabel}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-5">
                    <span className={person.active ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                      {person.active ? "ACTIVE" : "DISABLED"}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <form action={setStaffActiveAction} className="grid min-w-[230px] gap-2">
                      <input type="hidden" name="targetUserId" value={person.userId} />
                      <input type="hidden" name="active" value={person.active ? "false" : "true"} />
                      <input name="note" maxLength={300} placeholder="Alasan perubahan" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none" />
                      <button type="submit" className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]">
                        {person.active ? "Nonaktifkan akses" : "Aktifkan akses"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
