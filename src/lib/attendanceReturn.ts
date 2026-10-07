import type { UserRole } from "../types";

const STORAGE_KEY = "tsk-attendance-return";

export type AttendanceListReturn = {
  path: string;
  selectedBranch: string;
  dateMode: "single" | "range";
  filterDate: string;
  rangeFrom: string;
  rangeTo: string;
  classFilter: string;
  statusFilter: "all" | "present" | "absent";
  sortBy: string;
  search: string;
  page: number;
  scrollY: number;
  focusStudentId?: string;
};

export type StudentProfileLocationState = {
  from?: string;
};

/** In-memory copy so React Strict Mode remounts still see the snapshot. */
let mountCache: AttendanceListReturn | null | undefined;

export function attendancePathForRole(role: UserRole | undefined): string {
  const base = role === "admin" ? "/admin" : role === "user" ? "/user" : "/manager";
  return `${base}/attendance`;
}

export function saveAttendanceReturn(snapshot: AttendanceListReturn): void {
  mountCache = snapshot;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekAttendanceReturn(): AttendanceListReturn | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttendanceListReturn;
  } catch {
    return null;
  }
}

/** Read once per navigation; safe across Strict Mode double-mount. */
export function readAttendanceReturnForMount(): AttendanceListReturn | null {
  if (mountCache !== undefined) return mountCache;
  mountCache = peekAttendanceReturn();
  return mountCache;
}

export function clearAttendanceReturn(): void {
  mountCache = undefined;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasAttendanceReturn(): boolean {
  if (mountCache) return true;
  return peekAttendanceReturn() !== null;
}
