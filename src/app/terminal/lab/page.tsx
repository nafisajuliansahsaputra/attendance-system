import type { Metadata } from "next";
import { TerminalSimulator } from "@/components/terminal/TerminalSimulator";

export const metadata: Metadata = {
  title: "Simulasi Perangkat Absensi",
};

export default function TerminalLabPage() {
  return (
    <div className="terminal-page-shell">
      <TerminalSimulator />
    </div>
  );
}
