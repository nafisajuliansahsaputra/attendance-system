import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAdminFaceEnrollmentTarget } from "../../../../../infrastructure/admin/supabase-faces";
import { requireAuthorizedUser } from "../../../../../lib/auth/require-authorized-user";
import { FaceEnrollmentCamera } from "./face-enrollment-camera";

export const dynamic = "force-dynamic";

interface FaceEnrollmentPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function FaceEnrollmentPage({ params }: FaceEnrollmentPageProps) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const { studentId } = await params;
  const parsedId = z.string().uuid().safeParse(studentId);
  if (!parsedId.success) notFound();

  let target;
  try {
    target = await getAdminFaceEnrollmentTarget({
      actorUserId: userId,
      studentId: parsedId.data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("STUDENT_NOT_FOUND")) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="border-b border-[var(--border)] pb-7">
        <Link
          href="/dashboard/students"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          ← Kembali ke siswa & RFID
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
          Biometric enrollment
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Enroll wajah siswa</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {target.fullName} · NIS {target.nis} · {target.className ?? "Tanpa kelas aktif"}
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Face profile</p>
          <p className="mt-2 font-semibold">
            {target.faceProfile ? "ACTIVE" : "Belum enroll"}
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:col-span-2">
          <p className="text-sm text-[var(--muted)]">Model aktif tersimpan</p>
          <p className="mt-2 font-semibold">
            {target.faceProfile
              ? `${target.faceProfile.modelName} · ${target.faceProfile.modelVersion}`
              : "—"}
          </p>
          {target.faceProfile?.qualityScore != null ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Enrollment quality score: {target.faceProfile.qualityScore.toFixed(3)}
            </p>
          ) : null}
        </article>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Kamera enrollment</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Gunakan pencahayaan merata, satu wajah saja, dan arahkan wajah ke kamera. Frame JPEG hanya dipakai untuk ekstraksi embedding di memory; raw photo tidak disimpan oleh aplikasi.
        </p>
        <div className="mt-5">
          <FaceEnrollmentCamera studentId={target.studentId} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:rgba(251,191,36,0.25)] bg-[color:rgba(251,191,36,0.06)] p-5 text-sm leading-6 text-[var(--muted)]">
        <strong className="text-[var(--warning)]">Anti-spoof/liveness belum diimplementasikan.</strong>{" "}
        Sistem saat ini melakukan 1:1 face verification dan quality checks, tetapi belum boleh diklaim tahan terhadap foto/video presentation attack sampai liveness engine terpisah dipilih dan dievaluasi.
      </section>
    </main>
  );
}
