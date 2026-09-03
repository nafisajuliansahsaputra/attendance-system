import type { ApplicationRole } from "../auth/types";

export interface StaffHomeroomAssignment {
  id: string;
  classId: string;
  classCode: string;
  className: string;
  academicYearId: string;
  academicYearLabel: string;
  startsOn?: string;
  endsOn?: string;
}

export interface AdminStaffDirectoryRow {
  userId: string;
  fullName: string;
  role: ApplicationRole;
  active: boolean;
  createdAt: string;
  homeroomAssignments: StaffHomeroomAssignment[];
}

export interface ProvisionStaffAccountInput {
  actorUserId: string;
  institutionId: string;
  email: string;
  password: string;
  fullName: string;
  role: ApplicationRole;
  classId?: string;
  academicYearId?: string;
}
