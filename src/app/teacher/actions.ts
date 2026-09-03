"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { confirmSchoolDayStatus } from "../../infrastructure/homeroom/supabase-homeroom";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";

const confirmationSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  schoolDate: z.string().date(),
  status: z.enum(["SAKIT", "IZIN", "ALPA"]),
  note: z.string().trim().max(500).optional(),
});

export async function confirmAttendanceStatus(formData: FormData) {
  const parsed = confirmationSchema.safeParse({
    studentId: formData.get("studentId"),
    classId: formData.get("classId"),
    schoolDate: formData.get("schoolDate"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect("/teacher?error=invalid-confirmation");
  }

  const { userId } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);

  try {
    await confirmSchoolDayStatus({
      actorUserId: userId,
      studentId: parsed.data.studentId,
      schoolDate: parsed.data.schoolDate,
      status: parsed.data.status,
      note: parsed.data.note,
    });
  } catch {
    const query = new URLSearchParams({
      class: parsed.data.classId,
      date: parsed.data.schoolDate,
      error: "confirmation-failed",
    });
    redirect(`/teacher?${query.toString()}`);
  }

  revalidatePath("/teacher");

  const query = new URLSearchParams({
    class: parsed.data.classId,
    date: parsed.data.schoolDate,
    saved: "1",
  });
  redirect(`/teacher?${query.toString()}`);
}
