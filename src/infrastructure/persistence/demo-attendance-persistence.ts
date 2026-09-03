import type {
  AttendanceAttemptPersistence,
  PersistAttendanceResult,
} from "@/application/attendance/persistence";

/**
 * Recruiter/demo adapter used until the server-side Supabase secret is wired.
 *
 * It deliberately does not mutate canonical database state. The same
 * application service will later receive a Supabase implementation instead.
 */
export class DemoAttendancePersistence implements AttendanceAttemptPersistence {
  async persist(): Promise<PersistAttendanceResult> {
    return {
      mode: "ephemeral",
    };
  }
}
