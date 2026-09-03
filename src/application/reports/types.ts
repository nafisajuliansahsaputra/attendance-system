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

export interface ReportingAcademicYear {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
}

export interface ReportingTerm {
  id: string;
  name: string;
  sequence: number;
  startsOn: string;
  endsOn: string;
}

export interface ReportingPeriodPresets {
  academicYear?: ReportingAcademicYear;
  terms: ReportingTerm[];
}
