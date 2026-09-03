export type ScheduleRelationship =
  | "NORMAL"
  | "ADDITIVE"
  | "REPLACE_NORMAL"
  | "CANCEL_NORMAL";

export type ScheduleTargetType =
  | "ALL_STUDENTS"
  | "GRADE_LEVELS"
  | "CLASSES"
  | "DEPARTMENTS"
  | "SELECTED_STUDENTS";

export interface AdminScheduleTemplate {
  id: string;
  code: string;
  name: string;
  sessionType: string;
  attendanceMode: string;
  faceVerificationRequired: boolean;
  lateEnabled: boolean;
  active: boolean;
}

export interface AdminScheduleRule {
  id: string;
  templateId: string;
  name: string;
  recurrenceRule?: string;
  startsOn: string;
  endsOn?: string;
  opensAt: string;
  lateAfterAt?: string;
  closesAt: string;
  targetType: ScheduleTargetType;
  targetSelector: Record<string, unknown>;
  scheduleRelationship: ScheduleRelationship;
  active: boolean;
  materializedOccurrences: number;
  lastMaterializedDate?: string;
}

export interface AdminScheduleOption {
  id: string;
  code: string;
  name: string;
  active?: boolean;
}

export interface AdminScheduleConfiguration {
  templates: AdminScheduleTemplate[];
  rules: AdminScheduleRule[];
  classes: AdminScheduleOption[];
  gradeLevels: AdminScheduleOption[];
  departments: AdminScheduleOption[];
}

export interface CreateScheduleRuleResult {
  ruleId: string;
  created: boolean;
}

export interface RetireScheduleRuleResult {
  ruleId: string;
  endsOn: string;
  unchanged: boolean;
  cancelledOccurrences: number;
}
