import { format } from "date-fns";
import type { AttendanceRecord, Branch, Student } from "../types";
import { formatTime } from "./dates";
import { isDateKeyInRange, parseDateKey } from "./reportRanges";

export function filterAttendance(
  records: AttendanceRecord[],
  from: string,
  to: string,
  branchId: "all" | string,
): AttendanceRecord[] {
  return records.filter((r) => {
    if (!isDateKeyInRange(r.date, from, to)) return false;
    if (branchId !== "all" && r.branchId !== branchId) return false;
    return true;
  });
}

export function countByDate(records: AttendanceRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of records) {
    m.set(r.date, (m.get(r.date) ?? 0) + 1);
  }
  return m;
}

export interface ReportRow {
  date: string;
  time: string;
  studentName: string;
  rollNumber: string;
  studentClass: string;
  branchName: string;
  managerName: string;
}

export function buildReportRows(
  records: AttendanceRecord[],
  getStudent: (id: string) => Student | undefined,
  getBranch: (id: string) => Branch | undefined,
  getMarkedByName: (id: string) => string,
): ReportRow[] {
  const sorted = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.markedAt.localeCompare(b.markedAt);
  });
  return sorted.map((r) => {
    const s = getStudent(r.studentId);
    const b = getBranch(r.branchId);
    return {
      date: r.date,
      time: formatTime(r.markedAt),
      studentName: s?.name ?? "—",
      rollNumber: s?.rollNumber ?? "—",
      studentClass: s?.class ?? "—",
      branchName: b?.name ?? "—",
      managerName: getMarkedByName(r.markedById),
    };
  });
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function reportToCsv(rows: ReportRow[]): string {
  const header = [
    "Date",
    "Time",
    "Student",
    "Roll number",
    "Class",
    "Branch",
    "Manager",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.date,
        r.time,
        r.studentName,
        r.rollNumber,
        r.studentClass,
        r.branchName,
        r.managerName,
      ]
        .map((c) => csvEscape(c))
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function summaryStats(
  records: AttendanceRecord[],
  activeStudentCount: number,
): { checkIns: number; uniqueStudents: number; activeStudentsInScope: number } {
  const ids = new Set(records.map((r) => r.studentId));
  return {
    checkIns: records.length,
    uniqueStudents: ids.size,
    activeStudentsInScope: activeStudentCount,
  };
}

export function formatReportDate(dateKey: string): string {
  return format(parseDateKey(dateKey), "MMM d, yyyy");
}
