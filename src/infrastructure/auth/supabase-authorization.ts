import { z } from "zod";
import type { AuthorizationContext } from "../../application/auth/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const authorizationContextSchema = z.object({
  userId: z.string().uuid(),
  institutionId: z.string().uuid(),
  fullName: z.string().min(1),
  role: z.enum(["SYSTEM_ADMIN", "HOMEROOM_TEACHER", "OPERATOR"]),
  schoolDate: z.string().date(),
  classes: z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string().min(1),
      name: z.string().min(1),
    }),
  ),
});

export async function getAuthorizationContext(
  userId: string,
  schoolDate?: string,
): Promise<AuthorizationContext | null> {
  const raw = await callSupabaseAdminRpc<unknown>(
    "get_user_authorization_context",
    {
      p_user_id: userId,
      p_school_date: schoolDate ?? null,
    },
  );

  if (raw === null) {
    return null;
  }

  return authorizationContextSchema.parse(raw);
}
