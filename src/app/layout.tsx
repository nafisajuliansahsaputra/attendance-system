import type { Metadata } from "next";
import { SCHOOL } from "@/config/school";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SCHOOL.systemName} | ${SCHOOL.name}`,
    template: `%s | ${SCHOOL.name}`,
  },
  description: `${SCHOOL.systemDescription} Digunakan sebagai sistem pengelolaan kehadiran ${SCHOOL.name}.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
