"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assignStudentRfid,
  transferStudentEnrollment,
} from "../../../infrastructure/admin/supabase-students";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const sharedFilterSchema = {
  search: z.string().trim().max(100).optional(),
  classId: z.string().uuid().optional().or(z.literal("")),
  page: z.string().regex(/^\d+$/).optional(),
};

const assignSchema = z.object({
  studentId: z.string().uuid(),
  uid: z.string().trim().min(1).max(100),
  note: z.string().trim().max(300).optional(),
  ...sharedFilterSchema,
});

const transferSchema = z.object({
  studentId: z.string().uuid(),
  targetClassId: z.string().uuid(),
  effectiveOn: z.string().date(),
  note: z.string().trim().max(300).optional(),
  ...sharedFilterSchema,
});

function targetUrl(input: {
  search?: string;
  classId?: string;
  page?: string;
  saved?: string;
  error?: string;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("q", input.search);
  if (input.classId) query.set("class", input.classId);
  if (input.page && input.page !== "1") query.set("page", input.page);
  if (input.saved) query.set("saved", input.saved);
  if (input.error) query.set("error", input.error);

  const suffix = query.toString();
  return suffix ? `/dashboard/students?${suffix}` : "/dashboard/students";
}

function preservedFilters(formData: FormData) {
  return {
    search:
      typeof formData.get("search") === "string"
        ? String(formData.get("search"))
        : undefined,
    classId:
      typeof formData.get("classId") === "string"
        ? String(formData.get("classId"))
        : undefined,
    page:
      typeof formData.get("page") === "string"
        ? String(formData.get("page"))
        : undefined,
  };
}

function mapAssignmentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("RFID_UID_IN_USE")) return "rfid-in-use";
  if (message.includes("STUDENT_NOT_FOUND")) return "student-not-found";
  if (message.includes("FORBIDDEN_ADMIN_ONLY")) return "forbidden";
  if (message.includes("RFID_UID_")) return "invalid-rfid";
  return "save-failed";
}

function mapTransferError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("TRANSFER_DATE_MUST_FOLLOW_ENROLLMENT_START")) {
    return "transfer-date";
  }
  if (message.includes("ACADEMIC_YEAR_NOT_FOUND_FOR_DATE")) {
    return "academic-year-date";
  }
  if (message.includes("TARGET_CLASS_NOT_FOUND")) return "class-not-found";
  if (message.includes("STUDENT_NOT_FOUND")) return "student-not-found";
  if (message.includes("FORBIDDEN_ADMIN_ONLY")) return "forbidden";
  if (message.includes("student_enrollments_no_overlapping_periods")) {
    return "enrollment-overlap";
  }
  return "transfer-failed";
}

export async function assignStudentRfidAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = assignSchema.safeParse({
    studentId: formData.get("studentId"),
    uid: formData.get("uid"),
    note: formData.get("note") || undefined,
    search: formData.get("search") || undefined,
    classId: formData.get("classId") || "",
    page: formData.get("page") || undefined,
  });

  if (!parsed.success) {
    redirect(targetUrl({ ...preservedFilters(formData), error: "invalid-input" }));
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
        page: parsed.data.page,
        error: assignmentError,
      }),
    );
  }

  revalidatePath("/dashboard/students");
  redirect(
    targetUrl({
      search: parsed.data.search,
      classId: parsed.data.classId || undefined,
      page: parsed.data.page,
      saved: "rfid",
    }),
  );
}

export async function transferStudentEnrollmentAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = transferSchema.safeParse({
    studentId: formData.get("studentId"),
    targetClassId: formData.get("targetClassId"),
    effectiveOn: formData.get("effectiveOn"),
    note: formData.get("note") || undefined,
    search: formData.get("search") || undefined,
    classId: formData.get("classId") || "",
    page: formData.get("page") || undefined,
  });

  if (!parsed.success) {
    redirect(targetUrl({ ...preservedFilters(formData), error: "invalid-transfer" }));
  }

  let transferError: string | undefined;

  try {
    await transferStudentEnrollment({
      actorUserId: userId,
      studentId: parsed.data.studentId,
      targetClassId: parsed.data.targetClassId,
      effectiveOn: parsed.data.effectiveOn,
      note: parsed.data.note,
    });
  } catch (error) {
    transferError = mapTransferError(error);
  }

  if (transferError) {
    redirect(
      targetUrl({
        search: parsed.data.search,
        classId: parsed.data.classId || undefined,
        page: parsed.data.page,
        error: transferError,
      }),
    );
  }

  revalidatePath("/dashboard/students");
  revalidatePath("/teacher");
  revalidatePath("/teacher/reports");
  redirect(
    targetUrl({
      search: parsed.data.search,
      classId: parsed.data.classId || undefined,
      page: parsed.data.page,
      saved: "class",
    }),
  );
}
