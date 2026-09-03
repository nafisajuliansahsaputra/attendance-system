import type { Metadata } from "next";
import { LiveRecruiterTerminal } from "@/components/terminal/LiveRecruiterTerminal";

export const metadata: Metadata = {
  title: "Live Attendance Terminal",
};

export default function TerminalPage() {
  return <LiveRecruiterTerminal />;
}
