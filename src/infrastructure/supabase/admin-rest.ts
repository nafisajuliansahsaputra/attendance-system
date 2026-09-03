import { getSupabaseServerConfig } from "./server-config";

interface PostgrestErrorPayload {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Calls a Supabase/PostgREST RPC with the server-only secret key.
 *
 * The modern sb_secret_ key is sent only as the `apikey` header. The Supabase
 * gateway translates it to the privileged service role internally.
 */
export async function callSupabaseAdminRpc<T>(
  functionName: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const config = getSupabaseServerConfig();
  const response = await fetch(
    `${config.url}/rest/v1/rpc/${encodeURIComponent(functionName)}`,
    {
      method: "POST",
      headers: {
        apikey: config.secretKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as PostgrestErrorPayload | null;
    const message = error?.message ?? `Supabase RPC failed with HTTP ${response.status}`;
    const code = error?.code ? ` [${error.code}]` : "";
    throw new Error(`${message}${code}`);
  }

  return (await response.json()) as T;
}
