"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assignStudentRfid } from "../../../infrastructure/admin/supabase-students";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const assignSchema = z.object({
  studentId: z.string().uuid(),
  uid: z.string().trim().min(1).max(100),
  note: z.string().trim().max(300).optional(),
  search: z.string().trim().max(100).optional(),
  classId: z.string().uuid().optional().or(z.literal("")),
});

function targetUrl(input: {
  search?: string;
  classId?: string;
  saved?: string;
  error?: string;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("q", input.search);
  if (input.classId) query.set("class", input.classId);
  if (input.saved) query.set("saved", input.saved);
  if (input.error) query.set("error", input.error);

  const suffix = query.toString();
  return suffix ? `/dashboard/students?${suffix}` : "/dashboard/students";
}

function mapAssignmentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("RFID_UID_IN_USE")) return "rfid-in-use";
  if (message.includes("STUDENT_NOT_FOUND")) return "student-not-found";
  if (message.includes("FORBIDDEN_ADMIN_ONLY")) return "forbidden";
  if (message.includes("RFID_UID_")) return "invalid-rfid";
  return "save-failed";
}

export async function assignStudentRfidAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = assignSchema.safeParse({
    studentId: formData.get("studentId"),
    uid: formData.get("uid"),
    note: formData.get("note") || undefined,
    search: formData.get("search") || undefined,
    classId: formData.get("classId") || "",
  });

  if (!parsed.success) {
    redirect(
      targetUrl({
        search: typeof formData.get("search") === "string" ? String(formData.get("search")) : undefined,
        classId: typeof formData.get("classId") === "string" ? String(formData.get("classId")) : undefined,
        error: "invalid-input",
      }),
    );
  }

  let assignmentError: string | undefined;

  try {
    await assignStudentRfid({
      actorUserId: userId,
      studentId: parsed.data.studentId,
      uid: parsed.data.uid,
      note: parsed.data.note,
    });
  } catch (error) {
    assignmentError = mapAssignmentError(error);
  }

  if (assignmentError) {
    redirect(
      targetUrl({
        search: parsed.data.search,
        classId: parsed.data.classId || undefined,
        error: assignmentError,
      }),
    );
  }

  revalidatePath("/dashboard/students");
  redirect(
    targetUrl({
      search: parsed.data.search,
      classId: parsed.data.classId || undefined,
      saved: "rfid",
    }),
  );
}
