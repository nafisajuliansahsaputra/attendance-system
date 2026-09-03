import type { Metadata } from "next";
import { TerminalSimulator } from "@/components/terminal/TerminalSimulator";

export const metadata: Metadata = {
  title: "Virtual Hardware Lab",
};

export default function TerminalLabPage() {
  return <TerminalSimulator />;
}
