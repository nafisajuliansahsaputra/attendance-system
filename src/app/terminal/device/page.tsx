import type { Metadata } from "next";
import { OperationalTerminalKiosk } from "@/components/terminal/OperationalTerminalKiosk";

export const metadata: Metadata = {
  title: "Terminal Operasional Absensi",
  robots: {
    index: false,
    follow: false,
  },
};

type OperationalTerminalPageProps = {
  searchParams: Promise<{
    portfolio?: string | string[];
  }>;
};

export default async function OperationalTerminalPage({
  searchParams,
}: OperationalTerminalPageProps) {
  const params = await searchParams;
  const presentationMode = params.portfolio === "1";

  return <OperationalTerminalKiosk presentationMode={presentationMode} />;
}
