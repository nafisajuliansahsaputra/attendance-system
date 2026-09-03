import { z } from "zod";
import type {
  AttendanceContextInput,
  AttendanceContextResolver,
  AttendanceResolvedContext,
  SessionCandidate,
} from "../../application/attendance/context-resolver";
import type { SessionResolution } from "../../domain/attendance/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const rawContextSchema = z.object({
  institutionId: z.string().uuid(),
  deviceId: z.string().uuid(),
  schoolDate: z.string(),
  timezone: z.string().min(1),
  card: z.object({
    uid: z.string().min(1),
    registered: z.boolean(),
    credentialId: z.string().uuid().optional(),
    student: z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1),
        enrollmentId: z.string().uuid().optional(),
        className: z.string().min(1).optional(),
      })
      .optional(),
  }),
  faceProfile: z
    .object({
      id: z.string().uuid(),
      modelName: z.string().min(1),
      modelVersion: z.string().min(1),
      templateReference: z.string().min(1).optional(),
    })
    .nullable(),
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      sessionType: z.string().min(1),
      attendanceMode: z.string().min(1),
      opensAt: z.string().min(1),
      lateAfterAt: z.string().nullable(),
      closesAt: z.string().min(1),
      eligible: z.boolean(),
      duplicate: z.boolean(),
      faceVerificationRequired: z.boolean(),
      scheduleRelationship: z.enum([
        "NORMAL",
        "ADDITIVE",
        "REPLACE_NORMAL",
        "CANCEL_NORMAL",
      ]),
    }),
  ),
});

type RawContext = z.infer<typeof rawContextSchema>;

function mapSessionType(value: string): SessionResolution["type"] {
  switch (value) {
    case "SCHOOL_ARRIVAL":
      return "arrival";
    case "SCHOOL_DEPARTURE":
      return "departure";
    case "DHUHA":
      return "dhuha";
    case "DZUHUR":
      return "dzuhur";
    case "ASHAR":
      return "ashar";
    case "CEREMONY":
      return "ceremony";
    case "SCHOOL_ACTIVITY":
      return "activity";
    case "CUSTOM":
      return "custom";
    default:
      throw new Error(`Unsupported attendance session type: ${value}`);
  }
}

function mapSession(raw: RawContext["sessions"][number]): SessionCandidate {
  return {
    id: raw.id,
    name: raw.name,
    type: mapSessionType(raw.sessionType),
    opensAt: raw.opensAt,
    lateAfter: raw.lateAfterAt ?? undefined,
    closesAt: raw.closesAt,
    eligible: raw.eligible,
    duplicate: raw.duplicate,
    faceVerificationRequired: raw.faceVerificationRequired,
    scheduleRelationship: raw.scheduleRelationship,
  };
}

export function mapSupabaseAttendanceContext(payload: unknown): AttendanceResolvedContext {
  const raw = rawContextSchema.parse(payload);

  return {
    institutionId: raw.institutionId,
    deviceId: raw.deviceId,
    schoolDate: raw.schoolDate,
    timezone: raw.timezone,
    card: {
      uid: raw.card.uid,
      registered: raw.card.registered,
      student: raw.card.student
        ? {
            id: raw.card.student.id,
            name: raw.card.student.name,
            className: raw.card.student.className ?? "Tanpa kelas aktif",
          }
        : undefined,
    },
    faceProfile: raw.faceProfile ?? undefined,
    sessions: raw.sessions.map(mapSession),
  };
}

export class SupabaseAttendanceContextResolver implements AttendanceContextResolver {
  async resolve(input: AttendanceContextInput): Promise<AttendanceResolvedContext> {
    const payload = await callSupabaseAdminRpc<unknown>("resolve_attendance_context", {
      p_institution_id: input.institutionId,
      p_device_id: input.deviceId,
      p_rfid_uid: input.rfidUid.trim().toUpperCase(),
      p_occurred_at: input.occurredAt,
    });

    return mapSupabaseAttendanceContext(payload);
  }
}
