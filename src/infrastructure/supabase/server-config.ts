import { z } from "zod";

const supabaseServerConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export interface SupabaseServerConfig {
  url: string;
  secretKey: string;
}

let cachedConfig: SupabaseServerConfig | undefined;

/**
 * Reads privileged Supabase configuration for backend-only infrastructure.
 * Never expose the returned secret to browser components or API responses.
 */
export function getSupabaseServerConfig(): SupabaseServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = supabaseServerConfigSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Supabase server persistence is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in the server environment.",
    );
  }

  cachedConfig = {
    url: parsed.data.SUPABASE_URL.replace(/\/$/, ""),
    secretKey: parsed.data.SUPABASE_SECRET_KEY,
  };

  return cachedConfig;
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
