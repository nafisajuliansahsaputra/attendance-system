export interface AdminStudentDirectoryRow {
  studentId: string;
  nis: string;
  fullName: string;
  active: boolean;
  enrollmentId?: string;
  classId?: string;
  classCode?: string;
  className?: string;
  rfidCredentialId?: string;
  rfidUid?: string;
  rfidRegisteredAt?: string;
  faceProfileId?: string;
  faceStatus?: "ACTIVE" | "REVOKED" | "PENDING_REENROLLMENT";
  faceModelName?: string;
  faceModelVersion?: string;
  faceEnrolledAt?: string;
}

export interface AssignStudentRfidResult {
  credentialId: string;
  studentId: string;
  uid: string;
  replacedCount: number;
  unchanged: boolean;
}

export interface TransferStudentEnrollmentResult {
  studentId: string;
  enrollmentId: string;
  classId: string;
  effectiveOn: string;
  unchanged: boolean;
  previousEnrollmentId?: string;
}
