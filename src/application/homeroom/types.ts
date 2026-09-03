export type ConfirmableAbsenceStatus = "SAKIT" | "IZIN" | "ALPA";

export interface HomeroomAttendanceRow {
  studentId: string;
  nis: string;
  fullName: string;
  classId: string;
  className: string;
  arrivalRecordId?: string;
  arrivalTime?: string;
  attendanceStatus?: "ON_TIME" | "LATE" | "COMPLETED";
  systemState:
    | "NOT_SCHEDULED"
    | "PRESENT_ON_TIME"
    | "PRESENT_LATE"
    | "NO_VALID_ARRIVAL"
    | "PENDING_CONFIRMATION";
  finalStatus?: "PRESENT" | "LATE" | ConfirmableAbsenceStatus;
  needsConfirmation: boolean;
}

export interface SchoolDayConfirmationResult {
  schoolDayAttendanceId: string;
  studentId: string;
  schoolDate: string;
  previousStatus?: string;
  finalStatus: ConfirmableAbsenceStatus;
}
