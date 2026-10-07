import {
  BarChart3,
  Building2,
  ClipboardList,
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

export type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
  description?: string;
};

const adminNav: NavItem[] = [
  { to: "/admin", label: "Home", end: true, icon: Home, description: "Main menu" },
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Stats and branch attendance",
  },
  {
    to: "/admin/analysis",
    label: "Analysis",
    icon: PieChart,
    description: "Attendance analysis by branch, school and class",
  },
  { to: "/admin/branches", label: "Branches", icon: Building2, description: "Manage branches" },
  { to: "/admin/managers", label: "Managers", icon: UserCog, description: "Branch managers" },
  { to: "/admin/users", label: "Users", icon: Users, description: "Staff accounts" },
  { to: "/admin/students", label: "Students", icon: Users, description: "Student records" },
  { to: "/admin/scan", label: "Scan", icon: ScanLine, description: "QR attendance scan" },
  {
    to: "/admin/attendance",
    label: "Attendance",
    icon: ClipboardList,
    description: "Mark and edit attendance",
  },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, description: "Analytics and export" },
];

const managerNav: NavItem[] = [
  { to: "/manager", label: "Home", end: true, icon: Home, description: "Main menu" },
  {
    to: "/manager/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Today’s attendance overview",
  },
  { to: "/manager/scan", label: "Scan", icon: ScanLine, description: "QR attendance scan" },
  { to: "/manager/students", label: "Students", icon: Users, description: "Branch students" },
  { to: "/manager/users", label: "Users", icon: UserCog, description: "Branch staff" },
  {
    to: "/manager/attendance",
    label: "Attendance",
    icon: ClipboardList,
    description: "Mark and edit attendance",
  },
  { to: "/manager/reports", label: "Reports", icon: BarChart3, description: "Analytics and export" },
];

const userNav: NavItem[] = [
  { to: "/user", label: "Home", end: true, icon: Home, description: "Main menu" },
  {
    to: "/user/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Today’s attendance overview",
  },
  { to: "/user/scan", label: "Scan", icon: ScanLine, description: "QR attendance scan" },
  { to: "/user/students", label: "Students", icon: Users, description: "Branch students" },
  {
    to: "/user/attendance",
    label: "Attendance",
    icon: ClipboardList,
    description: "Mark and edit attendance",
  },
  { to: "/user/reports", label: "Reports", icon: BarChart3, description: "Analytics and export" },
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
      description: "Individual, branch, class, or all students",
    },
  ];
}
