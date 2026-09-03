import { NextResponse } from "next/server";
import { z } from "zod";
import { processResolvedAttendanceAttempt } from "@/application/attendance/process-resolved-attempt";
import { buildDemoAttempt, demoScenarios } from "@/demo/scenarios";
import { DemoAttendancePersistence } from "@/infrastructure/persistence/demo-attendance-persistence";

const requestSchema = z.object({
  requestId: z.string().min(1).max(100),
  scenario: z.enum(demoScenarios),
});

const persistence = new DemoAttendancePersistence();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_DEMO_REQUEST",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const attempt = buildDemoAttempt(parsed.data.scenario, parsed.data.requestId);
  const result = await processResolvedAttendanceAttempt(attempt, persistence);

  return NextResponse.json({
    source: "simulator",
    scenario: parsed.data.scenario,
    ...result,
  });
}
