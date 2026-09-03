import { redirect } from "next/navigation";
import type { ApplicationRole } from "../../application/auth/types";
import { getAuthorizationContext } from "../../infrastructure/auth/supabase-authorization";
import { createSupabaseServerClient } from "../supabase/server";

export interface AuthorizedUser {
  userId: string;
  email?: string;
  context: NonNullable<Awaited<ReturnType<typeof getAuthorizationContext>>>;
}

export async function requireAuthorizedUser(
  allowedRoles?: readonly ApplicationRole[],
): Promise<AuthorizedUser> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    redirect("/login");
  }

  const context = await getAuthorizationContext(userId);

  if (!context) {
    redirect("/unauthorized?reason=profile");
  }

  if (allowedRoles && !allowedRoles.includes(context.role)) {
    redirect("/unauthorized?reason=role");
  }

  return {
    userId,
    email: typeof claims.email === "string" ? claims.email : undefined,
    context,
  };
}
