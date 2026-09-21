import type { Metadata } from "next";
import { OperationalTerminalKiosk } from "@/components/terminal/OperationalTerminalKiosk";

export const metadata: Metadata = {
  title: "Terminal Operasional Absensi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OperationalTerminalPage() {
  return <OperationalTerminalKiosk />;
}
