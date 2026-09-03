export interface ClassReportStudentRow {
  studentId: string;
  nis: string;
  fullName: string;
  requiredDays: number;
  present: number;
  late: number;
  sakit: number;
  izin: number;
  alpa: number;
  pending: number;
}

export interface SessionParticipationSummary {
  sessionType: string;
  scheduledParticipations: number;
  attendedParticipations: number;
}

export interface ClassAttendanceReport {
  class: {
    id: string;
    code: string;
    name: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    students: number;
    requiredStudentDays: number;
    present: number;
    late: number;
    sakit: number;
    izin: number;
    alpa: number;
    pending: number;
  };
  students: ClassReportStudentRow[];
  sessionTypes: SessionParticipationSummary[];
  policyNotes: string[];
}
