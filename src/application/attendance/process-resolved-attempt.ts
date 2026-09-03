import { evaluateAttendanceAttempt } from "../../domain/attendance/engine";
import type {
  AttendanceOutcome,
  ResolvedAttendanceAttempt,
} from "../../domain/attendance/types";
import type {
  AttendanceAttemptPersistence,
  PersistAttendanceResult,
} from "./persistence";

export interface ProcessResolvedAttemptResult {
  outcome: AttendanceOutcome;
  persistence: PersistAttendanceResult;
}

/**
 * Application service shared by simulator and future hardware/device adapters.
 *
 * The domain engine decides attendance truth. Persistence only records that
 * decision and may never override/re-evaluate it independently.
 */
export async function processResolvedAttendanceAttempt(
  attempt: ResolvedAttendanceAttempt,
  persistence: AttendanceAttemptPersistence,
): Promise<ProcessResolvedAttemptResult> {
  const outcome = evaluateAttendanceAttempt(attempt);
  const persisted = await persistence.persist(attempt, outcome);

  return {
    outcome,
    persistence: persisted,
  };
}
