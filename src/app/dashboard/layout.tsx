import { SchoolPortalShell } from "@/components/school/SchoolPortalShell";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { context, email } = await requireAuthorizedUser([
    "SYSTEM_ADMIN",
    "OPERATOR",
  ]);

  return (
    <SchoolPortalShell
      mode="management"
      role={context.role}
      fullName={context.fullName}
      email={email}
      schoolDate={context.schoolDate}
    >
      {children}
    </SchoolPortalShell>
  );
}
