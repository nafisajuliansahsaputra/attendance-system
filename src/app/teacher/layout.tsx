import { SchoolPortalShell } from "@/components/school/SchoolPortalShell";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { context, email } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);

  return (
    <SchoolPortalShell
      mode="teacher"
      role={context.role}
      fullName={context.fullName}
      email={email}
      schoolDate={context.schoolDate}
    >
      {children}
    </SchoolPortalShell>
  );
}
