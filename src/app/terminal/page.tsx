import type { Metadata } from "next";
import { TerminalSimulator } from "@/components/terminal/TerminalSimulator";

export const metadata: Metadata = {
  title: "Terminal Simulator",
};

export default function TerminalPage() {
  return <TerminalSimulator />;
}
