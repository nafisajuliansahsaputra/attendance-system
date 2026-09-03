import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDemoAttempt, demoScenarios } from "@/demo/scenarios";
import { evaluateAttendanceAttempt } from "@/domain/attendance/engine";

const requestSchema = z.object({
  requestId: z.string().min(1).max(100),
  scenario: z.enum(demoScenarios),
});

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
  const outcome = evaluateAttendanceAttempt(attempt);

  return NextResponse.json({
    source: "simulator",
    scenario: parsed.data.scenario,
    outcome,
  });
}
