"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SCHOOL, roleLabel } from "@/config/school";

type PortalMode = "management" | "teacher";

type PortalIconName =
  | "home"
  | "students"
  | "calendar"
  | "devices"
  | "staff"
  | "clipboard"
  | "report"
  | "terminal"
  | "school"
  | "logout"
  | "menu"
  | "close";

interface SchoolPortalShellProps {
  mode: PortalMode;
  role: string;
  fullName: string;
  email?: string;
  schoolDate: string;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: PortalIconName;
  exact?: boolean;
}

function PortalIcon({ name, className = "h-5 w-5" }: { name: PortalIconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>;
    case "students":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/><path d="M8 15h2M14 15h2M8 18h2"/></svg>;
    case "devices":
      return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/><path d="M8 9h8M8 12h5"/></svg>;
    case "staff":
      return <svg {...common}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 6-6 6 6 0 0 1 6 6v2"/><path d="M19 8v6M16 11h6"/></svg>;
    case "clipboard":
      return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4"/></svg>;
    case "report":
      return <svg {...common}><path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-4"/></svg>;
    case "terminal":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/></svg>;
    case "school":
      return <svg {...common}><path d="M3 10 12 4l9 6"/><path d="M5 9v10h14V9M3 20h18"/><path d="M9 19v-6h6v6"/><path d="M12 4V2"/></svg>;
    case "logout":
      return <svg {...common}><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>;
    case "menu":
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  }
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PT";
}

function formatSchoolDate(value: string) {
  const parsed = new Date(`${value}T12:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(parsed);
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function currentPageTitle(pathname: string, mode: PortalMode) {
  const pages = mode === "management"
    ? [
        ["/dashboard/students", "Data Siswa"],
        ["/dashboard/schedules", "Jadwal Absensi"],
        ["/dashboard/devices", "Perangkat & Terminal"],
        ["/dashboard/staff", "Petugas & Hak Akses"],
        ["/dashboard", "Ringkasan Administrasi"],
      ]
    : [
        ["/teacher/reports", "Rekap & Laporan Kehadiran"],
        ["/teacher", "Kehadiran Harian"],
      ];

  return pages.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1]
    ?? SCHOOL.systemName;
}

export function SchoolPortalShell({
  mode,
  role,
  fullName,
  email,
  schoolDate,
  children,
}: SchoolPortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (mode === "teacher" && pathname.startsWith("/teacher/reports/print")) {
    return <>{children}</>;
  }

  const isAdmin = role === "SYSTEM_ADMIN";
  const managementNav: NavItem[] = [
    {
      href: "/dashboard",
      label: "Ringkasan",
      description: "Kondisi sistem sekolah",
      icon: "home",
      exact: true,
    },
    ...(isAdmin
      ? [
          {
            href: "/dashboard/students",
            label: "Data Siswa",
            description: "Identitas, kelas, RFID & wajah",
            icon: "students" as const,
          },
          {
            href: "/dashboard/schedules",
            label: "Jadwal Absensi",
            description: "Sesi, waktu & sasaran",
            icon: "calendar" as const,
          },
        ]
      : []),
    {
      href: "/dashboard/devices",
      label: "Perangkat",
      description: "Terminal & status koneksi",
      icon: "devices",
    },
    ...(isAdmin
      ? [
          {
            href: "/dashboard/staff",
            label: "Petugas & Akses",
            description: "Admin, operator & wali kelas",
            icon: "staff" as const,
          },
          {
            href: "/teacher",
            label: "Ruang Wali Kelas",
            description: "Kehadiran & konfirmasi",
            icon: "clipboard" as const,
          },
        ]
      : []),
  ];

  const teacherNav: NavItem[] = [
    {
      href: "/teacher",
      label: "Kehadiran Harian",
      description: "Pemeriksaan kelas hari ini",
      icon: "clipboard",
      exact: true,
    },
    {
      href: "/teacher/reports",
      label: "Rekap & Laporan",
      description: "Periode, CSV & PDF",
      icon: "report",
    },
    ...(isAdmin
      ? [{
          href: "/dashboard",
          label: "Administrasi Sistem",
          description: "Kembali ke pusat pengelolaan",
          icon: "school" as const,
        }]
      : []),
  ];

  const navItems = mode === "management" ? managementNav : teacherNav;
  const portalLabel = mode === "management" ? "Portal Administrasi" : "Portal Wali Kelas";
  const pageTitle = currentPageTitle(pathname, mode);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href={mode === "management" ? "/dashboard" : "/teacher"} className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <SchoolLogo size={44} className="ring-white/15" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold leading-5 text-white">{SCHOOL.shortName}</span>
            <span className="block truncate text-[11px] text-emerald-100/70">{SCHOOL.systemName}</span>
          </span>
        </Link>
      </div>

      <div className="px-4 pb-2 pt-5">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100/45">{portalLabel}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5" aria-label="Navigasi portal sekolah">
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                active
                  ? "bg-white text-[#12382b] shadow-sm"
                  : "text-emerald-50/80 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition ${
                active ? "bg-emerald-50 text-[#176b48]" : "bg-white/6 text-emerald-100/70 group-hover:bg-white/10 group-hover:text-white"
              }`}>
                <PortalIcon name={item.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{item.label}</span>
                <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-slate-500" : "text-emerald-100/45"}`}>{item.description}</span>
              </span>
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#176b48]" /> : null}
            </Link>
          );
        })}

        <div className="mx-2 my-4 border-t border-white/10" />

        <Link
          href="/terminal/lab"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-3 rounded-xl px-3 py-3 text-emerald-50/80 transition hover:bg-white/8 hover:text-white"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/6 text-emerald-100/70 transition group-hover:bg-white/10 group-hover:text-white">
            <PortalIcon name="terminal" className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">Terminal Uji</span>
            <span className="mt-0.5 block truncate text-[10px] text-emerald-100/45">Simulasi perangkat absensi</span>
          </span>
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-black/10 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#12382b]">
              {initials(fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{fullName}</p>
              <p className="mt-0.5 truncate text-[10px] text-emerald-100/55">{roleLabel(role)}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-3">
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-emerald-50/80 transition hover:bg-white/10 hover:text-white">
              <PortalIcon name="logout" className="h-4 w-4" />
              Keluar dari sistem
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="school-portal-shell min-h-screen bg-[#f4f7f5]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] bg-[#12382b] shadow-xl shadow-slate-950/10 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,320px)] bg-[#12382b] shadow-2xl">
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-emerald-50/70 transition hover:bg-white/10 hover:text-white"
            >
              <PortalIcon name="close" className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-[#dbe5df] bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Buka navigasi"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dbe5df] text-slate-600 transition hover:bg-slate-50 lg:hidden"
            >
              <PortalIcon name="menu" className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#56806d]">{portalLabel}</p>
              <h1 className="truncate text-[15px] font-bold tracking-[-0.01em] text-[#17352a] sm:text-base">{pageTitle}</h1>
            </div>

            <div className="hidden items-center gap-4 sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-[#24483a]">{formatSchoolDate(schoolDate)}</p>
                <p className="mt-0.5 max-w-[230px] truncate text-[10px] text-slate-500">{email ?? roleLabel(role)}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f3ed] text-xs font-bold text-[#176b48]">{initials(fullName)}</span>
            </div>
          </div>
        </header>

        <div className="portal-shell-content mx-auto w-full max-w-[1560px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
