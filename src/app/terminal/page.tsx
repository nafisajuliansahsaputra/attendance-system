import type { Metadata } from "next";
import { TerminalSimulator } from "@/components/terminal/TerminalSimulator";

export const metadata: Metadata = {
  title: "Virtual Hardware Terminal",
  description:
    "Input-driven recruiter demo for the Smart Attendance System canonical attendance engine.",
};

export default function TerminalPage() {
  return <TerminalSimulator />;
}
