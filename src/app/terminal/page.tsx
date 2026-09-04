import type { Metadata } from "next";
import { LiveRecruiterTerminal } from "@/components/terminal/LiveRecruiterTerminal";

export const metadata: Metadata = {
  title: "Terminal Absensi Siswa",
};

export default function TerminalPage() {
  return (
    <div className="terminal-page-shell">
      <LiveRecruiterTerminal />
    </div>
  );
}
