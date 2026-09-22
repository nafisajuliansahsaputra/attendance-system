"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthorizationContext } from "../../infrastructure/auth/supabase-authorization";
import { createSupabaseServerClient } from "../../lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/masuk-petugas?error=invalid-input");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect("/masuk-petugas?error=credentials");
  }

  const userId = data.user?.id ?? null;

  if (!userId) {
    await supabase.auth.signOut();
    redirect("/masuk-petugas?error=session");
  }

  const context = await getAuthorizationContext(userId);

  if (!context) {
    await supabase.auth.signOut();
    redirect("/masuk-petugas?error=not-authorized");
  }

  revalidatePath("/", "layout");

  if (context.role === "HOMEROOM_TEACHER") {
    redirect("/teacher");
  }

  redirect("/dashboard");
}
