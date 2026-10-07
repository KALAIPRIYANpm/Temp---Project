import type { AttendanceRecord, Branch, Student } from "../types";
import { compareClass } from "./student";
import {
  enrollmentGenderSlices,
  genderAttendanceSlices,
  presentAbsentSlices,
  REPORT_CHART_PALETTE,
  type ChartSlice,
} from "./reportAnalytics";

export type RankRow = { name: string; value: number };

export type PeriodSummary = {
  totalStudents: number;
  present: number;
  absent: number;
};

export function periodSummary(
  records: AttendanceRecord[],
  activeStudents: Student[],
): PeriodSummary {
  const presentIds = new Set(records.map((r) => r.studentId));
  const present = activeStudents.filter((s) => presentIds.has(s.id)).length;
  const totalStudents = activeStudents.length;
  return {
    totalStudents,
    present,
    absent: Math.max(totalStudents - present, 0),
  };
}

export function summaryBarRows(summary: PeriodSummary): RankRow[] {
  return [
    { name: "Students", value: summary.totalStudents },
    { name: "Present", value: summary.present },
    { name: "Absent", value: summary.absent },
  ];
}

export function branchAttendanceRanks(
  branches: Branch[],
  records: AttendanceRecord[],
  limit = 5,
): { top: RankRow[]; bottom: RankRow[] } {
  const rows: RankRow[] = branches.map((branch) => {
    const presentIds = new Set(
      records.filter((r) => r.branchId === branch.id).map((r) => r.studentId),
    );
    return { name: branch.name, value: presentIds.size };
  });

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const bottom = [...rows].sort((a, b) => a.value - b.value).slice(0, limit);
  return { top: sorted.slice(0, limit), bottom };
}

export function branchStudentCountRanks(
  branches: Branch[],
  students: Student[],
  limit = 5,
): { top: RankRow[]; bottom: RankRow[] } {
  const rows: RankRow[] = branches.map((branch) => ({
    name: branch.name,
    value: students.filter((s) => s.active && s.branchId === branch.id).length,
  }));

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const bottom = [...rows].sort((a, b) => a.value - b.value).slice(0, limit);
  return { top: sorted.slice(0, limit), bottom };
}

export function genderCountByBranchRanks(
  branches: Branch[],
  students: Student[],
  gender: "male" | "female",
  limit = 5,
): { top: RankRow[]; bottom: RankRow[] } {
  const rows: RankRow[] = branches.map((branch) => ({
    name: branch.name,
    value: students.filter(
      (s) => s.active && s.branchId === branch.id && s.gender === gender,
    ).length,
  }));

  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const bottom = [...rows].sort((a, b) => a.value - b.value).slice(0, limit);
  return { top: sorted.slice(0, limit), bottom };
}

export function studentsBySchoolSlices(students: Student[]): ChartSlice[] {
  const bySchool = new Map<string, number>();
  for (const student of students.filter((s) => s.active)) {
    const school = student.schoolName.trim() || "No school listed";
    bySchool.set(school, (bySchool.get(school) ?? 0) + 1);
  }

  return [...bySchool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], index) => ({
      name,
      value,
      fill: REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length],
    }));
}

export function genderEnrollmentForBranch(
  students: Student[],
  branchFilter: "all" | string,
): ChartSlice[] {
  const scoped =
    branchFilter === "all"
      ? students.filter((s) => s.active)
      : students.filter((s) => s.active && s.branchId === branchFilter);
  return enrollmentGenderSlices(scoped);
}

export function genderAttendanceForPeriod(
  records: AttendanceRecord[],
  activeStudents: Student[],
): ChartSlice[] {
  return genderAttendanceSlices(records, activeStudents);
}

export function presentAbsentForPeriod(
  records: AttendanceRecord[],
  activeStudents: Student[],
): ChartSlice[] {
  return presentAbsentSlices(records, activeStudents);
}

export type OverviewRow = {
  name: string;
  meta?: string;
  total: number;
  present: number;
  absent: number;
  percent: number;
};

export type DashboardFilters = {
  branch: "all" | string;
  school: "all" | string;
  class: "all" | string;
};

export function scopeActiveStudents(
  students: Student[],
  filters: DashboardFilters,
): Student[] {
  let list = students.filter((s) => s.active);
  if (filters.branch !== "all") {
    list = list.filter((s) => s.branchId === filters.branch);
  }
  if (filters.school !== "all") {
    list = list.filter(
      (s) => (s.schoolName.trim() || "No school listed") === filters.school,
    );
  }
  if (filters.class !== "all") {
    list = list.filter((s) => s.class === filters.class);
  }
  return list;
}

export function scopeRecords(
  records: AttendanceRecord[],
  studentIds: Set<string>,
): AttendanceRecord[] {
  return records.filter((r) => studentIds.has(r.studentId));
}

function rowStats(total: number, present: number): OverviewRow["absent"] {
  return Math.max(total - present, 0);
}

function percent(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 1000) / 10;
}

export function branchOverviewRows(
  branches: Branch[],
  students: Student[],
  records: AttendanceRecord[],
  filters: DashboardFilters,
): OverviewRow[] {
  const scoped = scopeActiveStudents(students, filters);
  const presentIds = new Set(records.map((r) => r.studentId));

  const list =
    filters.branch === "all"
      ? branches
      : branches.filter((b) => b.id === filters.branch);

  return list
    .map((branch) => {
      const branchStudents = scoped.filter((s) => s.branchId === branch.id);
      const total = branchStudents.length;
      const present = branchStudents.filter((s) => presentIds.has(s.id)).length;
      return {
        name: branch.name,
        meta: branch.city || undefined,
        total,
        present,
        absent: rowStats(total, present),
        percent: percent(present, total),
      };
    })
    .filter((r) => r.total > 0 || filters.branch !== "all")
    .sort((a, b) => b.percent - a.percent);
}

export function schoolOverviewRows(
  students: Student[],
  records: AttendanceRecord[],
  filters: DashboardFilters,
): OverviewRow[] {
  const scoped = scopeActiveStudents(students, filters);
  const presentIds = new Set(records.map((r) => r.studentId));
  const bySchool = new Map<string, Student[]>();

  for (const student of scoped) {
    const school = student.schoolName.trim() || "No school listed";
    const list = bySchool.get(school) ?? [];
    list.push(student);
    bySchool.set(school, list);
  }

  return [...bySchool.entries()]
    .map(([name, list]) => {
      const total = list.length;
      const present = list.filter((s) => presentIds.has(s.id)).length;
      return {
        name,
        total,
        present,
        absent: rowStats(total, present),
        percent: percent(present, total),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export function classOverviewRows(
  students: Student[],
  records: AttendanceRecord[],
  filters: DashboardFilters,
): OverviewRow[] {
  const scoped = scopeActiveStudents(students, filters);
  const presentIds = new Set(records.map((r) => r.studentId));
  const byClass = new Map<string, Student[]>();

  for (const student of scoped) {
    const cls = student.class.trim() || "—";
    const list = byClass.get(cls) ?? [];
    list.push(student);
    byClass.set(cls, list);
  }

  return [...byClass.entries()]
    .map(([name, list]) => {
      const total = list.length;
      const present = list.filter((s) => presentIds.has(s.id)).length;
      return {
        name,
        total,
        present,
        absent: rowStats(total, present),
        percent: percent(present, total),
      };
    })
    .sort((a, b) => compareClass(a.name, b.name));
}

export function schoolAttendanceRanks(
  students: Student[],
  records: AttendanceRecord[],
  filters: DashboardFilters,
  limit = 5,
): { top: RankRow[]; bottom: RankRow[] } {
  const rows = schoolOverviewRows(students, records, filters).map((r) => ({
    name: r.name,
    value: r.percent,
  }));

  const withStudents = rows.filter((r) => r.value >= 0);
  const sorted = [...withStudents].sort((a, b) => b.value - a.value);
  const bottom = [...withStudents].sort((a, b) => a.value - b.value).slice(0, limit);
  return {
    top: sorted.slice(0, limit).map((r) => ({ name: r.name, value: r.value })),
    bottom,
  };
}

export function uniqueSchoolOptions(students: Student[]): string[] {
  return [
    ...new Set(
      students
        .filter((s) => s.active)
        .map((s) => s.schoolName.trim() || "No school listed"),
    ),
  ].sort();
}

export function uniqueClassOptions(students: Student[]): string[] {
  return [
    ...new Set(students.filter((s) => s.active).map((s) => s.class.trim()).filter(Boolean)),
  ].sort();
}
