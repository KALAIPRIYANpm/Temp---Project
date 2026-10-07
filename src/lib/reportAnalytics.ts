import { format } from "date-fns";
import type { AttendanceRecord, Branch, Student } from "../types";
import { parseDateKey } from "./reportRanges";

export const REPORT_CHART_COLORS = {
  cerulean: "#00303f",
  mist: "#7a9d96",
  morning: "#cae4db",
  honey: "#dcae1d",
  deep: "#1a5563",
  sage: "#5a8f87",
} as const;

export const REPORT_CHART_PALETTE = [
  REPORT_CHART_COLORS.cerulean,
  REPORT_CHART_COLORS.mist,
  REPORT_CHART_COLORS.honey,
  REPORT_CHART_COLORS.sage,
  REPORT_CHART_COLORS.deep,
  REPORT_CHART_COLORS.morning,
];

export type ChartSlice = { name: string; value: number; fill?: string };

export type DailyTrendPoint = {
  date: string;
  label: string;
  present: number;
  absent: number;
};

export type BranchTrendPoint = {
  name: string;
  present: number;
  absent: number;
};

export function activeStudentsInBranch(
  students: Student[],
  branchFilter: "all" | string,
): Student[] {
  return students.filter(
    (s) => s.active && (branchFilter === "all" || s.branchId === branchFilter),
  );
}

export function presentAbsentSlices(
  records: AttendanceRecord[],
  activeStudents: Student[],
): ChartSlice[] {
  const presentIds = new Set(records.map((r) => r.studentId));
  const present = activeStudents.filter((s) => presentIds.has(s.id)).length;
  const absent = Math.max(activeStudents.length - present, 0);

  if (activeStudents.length === 0) {
    return [];
  }

  return [
    { name: "Present", value: present, fill: REPORT_CHART_COLORS.cerulean },
    { name: "Absent", value: absent, fill: REPORT_CHART_COLORS.morning },
  ];
}

export function enrollmentGenderSlices(activeStudents: Student[]): ChartSlice[] {
  const counts = { Male: 0, Female: 0, Other: 0 };
  for (const student of activeStudents) {
    if (student.gender === "male") counts.Male += 1;
    else if (student.gender === "female") counts.Female += 1;
    else counts.Other += 1;
  }
  return [
    { name: "Male", value: counts.Male, fill: REPORT_CHART_COLORS.cerulean },
    { name: "Female", value: counts.Female, fill: REPORT_CHART_COLORS.mist },
    { name: "Other", value: counts.Other, fill: REPORT_CHART_COLORS.honey },
  ].filter((s) => s.value > 0);
}

export function enrollmentClassSlices(activeStudents: Student[]): ChartSlice[] {
  const byClass = new Map<string, number>();
  for (const student of activeStudents) {
    const cls = student.class.trim() || "—";
    byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
  }
  return [...byClass.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], index) => ({
      name,
      value,
      fill: REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length],
    }));
}

export function genderAttendanceSlices(
  records: AttendanceRecord[],
  activeStudents: Student[],
): ChartSlice[] {
  const presentIds = new Set(records.map((r) => r.studentId));
  const counts = { Male: 0, Female: 0, Other: 0 };

  for (const student of activeStudents) {
    if (!presentIds.has(student.id)) continue;
    if (student.gender === "male") counts.Male += 1;
    else if (student.gender === "female") counts.Female += 1;
    else counts.Other += 1;
  }

  return [
    { name: "Male", value: counts.Male, fill: REPORT_CHART_COLORS.cerulean },
    { name: "Female", value: counts.Female, fill: REPORT_CHART_COLORS.mist },
    { name: "Other", value: counts.Other, fill: REPORT_CHART_COLORS.honey },
  ].filter((s) => s.value > 0);
}

export function branchEnrollmentSlices(
  branches: Branch[],
  students: Student[],
  branchFilter: "all" | string,
): ChartSlice[] {
  const scoped =
    branchFilter === "all" ? branches : branches.filter((b) => b.id === branchFilter);

  return scoped
    .map((branch, index) => ({
      name: branch.name,
      value: students.filter((s) => s.active && s.branchId === branch.id).length,
      fill: REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length],
    }))
    .filter((s) => s.value > 0);
}

export function branchAttendanceSlices(
  records: AttendanceRecord[],
  branches: Branch[],
  branchFilter: "all" | string,
): ChartSlice[] {
  const scoped =
    branchFilter === "all" ? branches : branches.filter((b) => b.id === branchFilter);

  return scoped
    .map((branch, index) => {
      const unique = new Set(
        records.filter((r) => r.branchId === branch.id).map((r) => r.studentId),
      ).size;
      return {
        name: branch.name,
        value: unique,
        fill: REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length],
      };
    })
    .filter((s) => s.value > 0);
}

export function dailyAttendanceTrend(
  records: AttendanceRecord[],
  from: string,
  to: string,
  activeStudents: Student[],
): DailyTrendPoint[] {
  const activeCount = activeStudents.length;
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);

  const byDate = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
    const day = parseDateKey(record.date);
    if (day < fromDate || day > toDate) continue;
    const list = byDate.get(record.date) ?? [];
    list.push(record);
    byDate.set(record.date, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayRecords]) => {
      const present = new Set(dayRecords.map((r) => r.studentId)).size;
      return {
        date: key,
        label: format(parseDateKey(key), "MMM d"),
        present,
        absent: Math.max(activeCount - present, 0),
      };
    })
    .filter((point) => point.present > 0);
}

export function formatAttendanceTrendSubtitle(points: DailyTrendPoint[]): string {
  if (points.length === 0) return "No attendance sessions in this period";
  if (points.length === 1) return points[0]!.label;
  if (points.length <= 4) return points.map((p) => p.label).join(" · ");
  return `${points.length} sessions · ${points[0]!.label} – ${points[points.length - 1]!.label}`;
}

export function branchPresentAbsentTrend(
  records: AttendanceRecord[],
  branches: Branch[],
  students: Student[],
  branchFilter: "all" | string,
): BranchTrendPoint[] {
  const scoped =
    branchFilter === "all" ? branches : branches.filter((b) => b.id === branchFilter);

  return scoped.map((branch) => {
    const active = students.filter((s) => s.active && s.branchId === branch.id);
    const presentIds = new Set(
      records.filter((r) => r.branchId === branch.id).map((r) => r.studentId),
    );
    const present = active.filter((s) => presentIds.has(s.id)).length;
    return {
      name: branch.name,
      present,
      absent: Math.max(active.length - present, 0),
    };
  });
}

export function classAttendanceSlices(
  records: AttendanceRecord[],
  activeStudents: Student[],
): ChartSlice[] {
  const presentIds = new Set(records.map((r) => r.studentId));
  const byClass = new Map<string, number>();

  for (const student of activeStudents) {
    if (!presentIds.has(student.id)) continue;
    const cls = student.class.trim() || "—";
    byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
  }

  return [...byClass.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], index) => ({
      name,
      value,
      fill: REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length],
    }));
}
