import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";

export const dynamic = "force-dynamic";

export function GET() {
  const faceServiceConfigured = Boolean(
    process.env.FACE_SERVICE_URL?.trim() && process.env.FACE_SERVICE_SECRET?.trim(),
  );
  const supabaseConfigured = isSupabaseServerConfigured();

  return Response.json(
    {
      status: supabaseConfigured ? "ok" : "degraded",
      service: "attendance-system-web",
      version: "0.1.0",
      architecture: "hardware-ready",
      readiness: {
        supabaseConfigured,
        faceServiceConfigured,
        livenessImplemented: false,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
