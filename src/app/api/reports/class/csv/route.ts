import { z } from "zod";
import {
  classAttendanceReportToCsv,
  classReportExportFilename,
} from "@/application/reports/export";
import { getClassAttendanceReport } from "@/infrastructure/reports/supabase-class-report";
import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";

const querySchema = z
  .object({
    classId: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((value) => value.from <= value.to, {
    message: "from must be before or equal to to",
    path: ["from"],
  });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { userId } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    classId: url.searchParams.get("class"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "INVALID_REPORT_QUERY",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const report = await getClassAttendanceReport({
    actorUserId: userId,
    classId: parsed.data.classId,
    startDate: parsed.data.from,
    endDate: parsed.data.to,
  });
  const csv = `\uFEFF${classAttendanceReportToCsv(report)}`;
  const filename = classReportExportFilename(report);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
