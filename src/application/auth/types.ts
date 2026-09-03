export type ApplicationRole =
  | "SYSTEM_ADMIN"
  | "HOMEROOM_TEACHER"
  | "OPERATOR";

export interface AuthorizedClass {
  id: string;
  code: string;
  name: string;
}

export interface AuthorizationContext {
  userId: string;
  institutionId: string;
  fullName: string;
  role: ApplicationRole;
  schoolDate: string;
  classes: AuthorizedClass[];
}
