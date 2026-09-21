import type { Metadata } from "next";
import { SCHOOL } from "@/config/school";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SCHOOL.systemName} | ${SCHOOL.name}`,
    template: `%s | ${SCHOOL.name}`,
  },
  description: `${SCHOOL.systemDescription} Digunakan sebagai sistem pengelolaan kehadiran ${SCHOOL.name}.`,
  icons: {
    icon: "/brand/amaliah-logo.webp",
    shortcut: "/brand/amaliah-logo.webp",
    apple: "/brand/amaliah-logo.webp",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
