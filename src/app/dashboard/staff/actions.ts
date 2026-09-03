"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  provisionStaffAccount,
  setAdminStaffActiveStatus,
} from "../../../infrastructure/admin/supabase-staff";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const provisionSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(["SYSTEM_ADMIN", "HOMEROOM_TEACHER", "OPERATOR"]),
    classId: z.string().uuid().optional().or(z.literal("")),
    academicYearId: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.role === "HOMEROOM_TEACHER") {
      if (!value.classId) {
        ctx.addIssue({ code: "custom", path: ["classId"], message: "class required" });
      }
      if (!value.academicYearId) {
        ctx.addIssue({ code: "custom", path: ["academicYearId"], message: "academic year required" });
      }
    }
  });

const statusSchema = z.object({
  targetUserId: z.string().uuid(),
  active: z.enum(["true", "false"]),
  note: z.string().trim().max(300).optional(),
});

function staffUrl(input?: { saved?: string; error?: string }) {
  const query = new URLSearchParams();
  if (input?.saved) query.set("saved", input.saved);
  if (input?.error) query.set("error", input.error);
  const suffix = query.toString();
  return suffix ? `/dashboard/staff?${suffix}` : "/dashboard/staff";
}

function mapStaffError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("AUTH_USER_CREATE_FAILED")) return "auth-create";
  if (message.includes("HOMEROOM") || message.includes("CLASS")) return "assignment";
  if (message.includes("CANNOT_DEACTIVATE_SELF")) return "self-deactivate";
  if (message.includes("CANNOT_DEACTIVATE_LAST_ADMIN")) return "last-admin";
  if (message.includes("STAFF_PROFILE_NOT_FOUND")) return "not-found";
  if (message.includes("FORBIDDEN")) return "forbidden";
  if (message.includes("CLEANUP_FAILED")) return "cleanup-failed";
  return "save-failed";
}

export async function provisionStaffAction(formData: FormData) {
  const { context, userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = provisionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    classId: formData.get("classId") || "",
    academicYearId: formData.get("academicYearId") || "",
  });

  if (!parsed.success) {
    redirect(staffUrl({ error: "invalid-input" }));
  }

  let errorCode: string | undefined;

  try {
    await provisionStaffAccount({
      actorUserId: userId,
      institutionId: context.institutionId,
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      classId: parsed.data.classId || undefined,
      academicYearId: parsed.data.academicYearId || undefined,
    });
  } catch (error) {
    errorCode = mapStaffError(error);
  }

  if (errorCode) {
    redirect(staffUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/staff");
  redirect(staffUrl({ saved: "created" }));
}

export async function setStaffActiveAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = statusSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    active: formData.get("active"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect(staffUrl({ error: "invalid-input" }));
  }

  let errorCode: string | undefined;

  try {
    await setAdminStaffActiveStatus({
      actorUserId: userId,
      targetUserId: parsed.data.targetUserId,
      active: parsed.data.active === "true",
      note: parsed.data.note,
    });
  } catch (error) {
    errorCode = mapStaffError(error);
  }

  if (errorCode) {
    redirect(staffUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/staff");
  redirect(staffUrl({ saved: "status" }));
}
