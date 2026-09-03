import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Attendance System",
    template: "%s | Smart Attendance System",
  },
  description:
    "Hardware-ready RFID and face-verification attendance system rebuilt from a 2025 P5 SMK project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
