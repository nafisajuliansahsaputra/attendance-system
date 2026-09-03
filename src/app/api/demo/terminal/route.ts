import { NextResponse } from "next/server";
import { z } from "zod";
import { processResolvedAttendanceAttempt } from "@/application/attendance/process-resolved-attempt";
import {
  buildDemoTerminalAttempt,
  demoCardIds,
  demoEnvironmentIds,
  demoFaceIds,
} from "@/demo/terminal-inputs";
import { DemoAttendancePersistence } from "@/infrastructure/persistence/demo-attendance-persistence";

const requestSchema = z.object({
  requestId: z.string().min(1).max(100),
  cardId: z.enum(demoCardIds),
  faceId: z.enum(demoFaceIds),
  environmentId: z.enum(demoEnvironmentIds),
  alreadyRecorded: z.boolean().default(false),
});

const persistence = new DemoAttendancePersistence();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_TERMINAL_INPUT",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const attempt = buildDemoTerminalAttempt(parsed.data);
  const result = await processResolvedAttendanceAttempt(attempt, persistence);

  return NextResponse.json({
    source: "virtual-hardware-adapter",
    input: {
      cardId: parsed.data.cardId,
      faceId: parsed.data.faceId,
      environmentId: parsed.data.environmentId,
      alreadyRecorded: parsed.data.alreadyRecorded,
    },
    resolution: {
      rfidUid: attempt.card.uid,
      cardRegistered: attempt.card.registered,
      student: attempt.card.student ?? null,
      faceStatus: attempt.face.status,
      verificationScore: attempt.face.score ?? null,
      session: attempt.session
        ? {
            id: attempt.session.id,
            name: attempt.session.name,
            type: attempt.session.type,
            eligible: attempt.session.eligible,
          }
        : null,
      duplicate: attempt.duplicate,
    },
    ...result,
  });
}
