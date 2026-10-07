import {
  BarChart3,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutDashboard,
  PieChart,
  QrCode,
  ScanLine,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "../types";

/* ------------------------------------------------------------------ */
/*  Accent palette — every menu card gets its own colour personality   */
/* ------------------------------------------------------------------ */

export type NavAccent =
  | "sky"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "teal"
  | "indigo"
  | "orange"
  | "fuchsia"
  | "cyan";

export type NavAccentStyle = {
  /** soft wash across the card background */
  wash: string;
  /** solid gradient used on the icon tile */
  tile: string;
  /** soft tint used for chips / pills */
  soft: string;
  /** text colour matching the accent */
  text: string;
  /** hover border + glow */
  hover: string;
  /** small status dot / underline bar */
  bar: string;
};

// NOTE: class names are written out in full so Tailwind can detect them.
export const NAV_ACCENTS: Record<NavAccent, NavAccentStyle> = {
  sky: {
    wash: "bg-gradient-to-br from-sky-50 via-white to-white",
    tile: "bg-gradient-to-br from-sky-400 to-sky-600",
    soft: "bg-sky-100 text-sky-700",
    text: "text-sky-600",
    hover: "hover:border-sky-300 hover:shadow-sky-200/70",
    bar: "bg-sky-500",
  },
  emerald: {
    wash: "bg-gradient-to-br from-emerald-50 via-white to-white",
    tile: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    soft: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-600",
    hover: "hover:border-emerald-300 hover:shadow-emerald-200/70",
    bar: "bg-emerald-500",
  },
  violet: {
    wash: "bg-gradient-to-br from-violet-50 via-white to-white",
    tile: "bg-gradient-to-br from-violet-400 to-violet-600",
    soft: "bg-violet-100 text-violet-700",
    text: "text-violet-600",
    hover: "hover:border-violet-300 hover:shadow-violet-200/70",
    bar: "bg-violet-500",
  },
  amber: {
    wash: "bg-gradient-to-br from-amber-50 via-white to-white",
    tile: "bg-gradient-to-br from-amber-400 to-amber-600",
    soft: "bg-amber-100 text-amber-700",
    text: "text-amber-600",
    hover: "hover:border-amber-300 hover:shadow-amber-200/70",
    bar: "bg-amber-500",
  },
  rose: {
    wash: "bg-gradient-to-br from-rose-50 via-white to-white",
    tile: "bg-gradient-to-br from-rose-400 to-rose-600",
    soft: "bg-rose-100 text-rose-700",
    text: "text-rose-600",
    hover: "hover:border-rose-300 hover:shadow-rose-200/70",
    bar: "bg-rose-500",
  },
  teal: {
    wash: "bg-gradient-to-br from-teal-50 via-white to-white",
    tile: "bg-gradient-to-br from-teal-400 to-teal-600",
    soft: "bg-teal-100 text-teal-700",
    text: "text-teal-600",
    hover: "hover:border-teal-300 hover:shadow-teal-200/70",
    bar: "bg-teal-500",
  },
  indigo: {
    wash: "bg-gradient-to-br from-indigo-50 via-white to-white",
    tile: "bg-gradient-to-br from-indigo-400 to-indigo-600",
    soft: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-600",
    hover: "hover:border-indigo-300 hover:shadow-indigo-200/70",
    bar: "bg-indigo-500",
  },
  orange: {
    wash: "bg-gradient-to-br from-orange-50 via-white to-white",
    tile: "bg-gradient-to-br from-orange-400 to-orange-600",
    soft: "bg-orange-100 text-orange-700",
    text: "text-orange-600",
    hover: "hover:border-orange-300 hover:shadow-orange-200/70",
    bar: "bg-orange-500",
  },
  fuchsia: {
    wash: "bg-gradient-to-br from-fuchsia-50 via-white to-white",
    tile: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600",
    soft: "bg-fuchsia-100 text-fuchsia-700",
    text: "text-fuchsia-600",
    hover: "hover:border-fuchsia-300 hover:shadow-fuchsia-200/70",
    bar: "bg-fuchsia-500",
  },
  cyan: {
    wash: "bg-gradient-to-br from-cyan-50 via-white to-white",
    tile: "bg-gradient-to-br from-cyan-400 to-cyan-600",
    soft: "bg-cyan-100 text-cyan-700",
    text: "text-cyan-600",
    hover: "hover:border-cyan-300 hover:shadow-cyan-200/70",
    bar: "bg-cyan-500",
  },
};

export type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
  description?: string;
  /** short, friendly one-liner shown as a tag/pill on the card */
  tag?: string;
  /** colour personality of the card — look up with `accentFor(item)` */
  accent?: NavAccent;
};

export function accentFor(item: NavItem): NavAccentStyle {
  return NAV_ACCENTS[item.accent ?? "sky"];
}

/* ------------------------------------------------------------------ */
/*  Menus                                                              */
/* ------------------------------------------------------------------ */

const adminNav: NavItem[] = [
  {
    to: "/admin",
    label: "Home",
    end: true,
    icon: Home,
    description: "Your starting point",
    tag: "Start here",
    accent: "sky",
  },
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Live stats and branch attendance at a glance",
    tag: "Live",
    accent: "indigo",
  },
  {
    to: "/admin/analysis",
    label: "Analysis",
    icon: PieChart,
    description: "Dig into attendance by branch, school and class",
    tag: "Insights",
    accent: "violet",
  },
  {
    to: "/admin/branches",
    label: "Branches",
    icon: Building2,
    description: "Add and manage your branches",
    tag: "Manage",
    accent: "teal",
  },
  {
    to: "/admin/managers",
    label: "Managers",
    icon: UserCog,
    description: "Branch managers and their access",
    tag: "Team",
    accent: "amber",
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    description: "Staff accounts and permissions",
    tag: "Team",
    accent: "orange",
  },
  {
    to: "/admin/students",
    label: "Students",
    icon: GraduationCap,
    description: "Every student record in one place",
    tag: "Records",
    accent: "emerald",
  },
  {
    to: "/admin/scan",
    label: "Scan",
    icon: ScanLine,
    description: "Point, scan, marked present",
    tag: "Quick",
    accent: "cyan",
  },
  {
    to: "/admin/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    description: "Mark and edit attendance by hand",
    tag: "Daily",
    accent: "rose",
  },
  {
    to: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Charts, trends and CSV / PDF exports",
    tag: "Export",
    accent: "fuchsia",
  },
];

const managerNav: NavItem[] = [
  {
    to: "/manager",
    label: "Home",
    end: true,
    icon: Home,
    description: "Your starting point",
    tag: "Start here",
    accent: "sky",
  },
  {
    to: "/manager/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Today’s attendance at a glance",
    tag: "Live",
    accent: "indigo",
  },
  {
    to: "/manager/scan",
    label: "Scan",
    icon: ScanLine,
    description: "Point, scan, marked present",
    tag: "Quick",
    accent: "cyan",
  },
  {
    to: "/manager/students",
    label: "Students",
    icon: GraduationCap,
    description: "Everyone enrolled in your branch",
    tag: "Records",
    accent: "emerald",
  },
  {
    to: "/manager/users",
    label: "Users",
    icon: UserCog,
    description: "Your branch staff",
    tag: "Team",
    accent: "orange",
  },
  {
    to: "/manager/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    description: "Mark and edit attendance by hand",
    tag: "Daily",
    accent: "rose",
  },
  {
    to: "/manager/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Charts, trends and CSV / PDF exports",
    tag: "Export",
    accent: "fuchsia",
  },
];

const userNav: NavItem[] = [
  {
    to: "/user",
    label: "Home",
    end: true,
    icon: Home,
    description: "Your starting point",
    tag: "Start here",
    accent: "sky",
  },
  {
    to: "/user/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Today’s attendance at a glance",
    tag: "Live",
    accent: "indigo",
  },
  {
    to: "/user/scan",
    label: "Scan",
    icon: ScanLine,
    description: "Point, scan, marked present",
    tag: "Quick",
    accent: "cyan",
  },
  {
    to: "/user/students",
    label: "Students",
    icon: GraduationCap,
    description: "Everyone enrolled in your branch",
    tag: "Records",
    accent: "emerald",
  },
  {
    to: "/user/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    description: "Mark and edit attendance by hand",
    tag: "Daily",
    accent: "rose",
  },
  {
    to: "/user/reports",
    label: "Reports",
    icon: BarChart3,
    description: "Charts, trends and CSV / PDF exports",
    tag: "Export",
    accent: "fuchsia",
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  if (role === "admin") return adminNav;
  if (role === "manager") return managerNav;
  return userNav;
}

function roleBasePath(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/manager";
  return "/user";
}

export function homeQuickLinks(role: UserRole): NavItem[] {
  const base = roleBasePath(role);
  return [
    ...navItemsForRole(role).filter((item) => !item.end),
    {
      to: `${base}/download-qr`,
      label: "Download QR",
      icon: QrCode,
      description: "Grab QR codes for one student, a class, a branch or everyone",
      tag: "Print",
      accent: "teal",
    },
  ];
}