import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { AttendanceRecord, Branch, Medium, Student } from "../types";
import { compareClass, compareRollNumber, formatMedium } from "./student";
import { parseDateKey, toDateKey } from "./reportRanges";

export type AnalysisPeriod =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "all";

export const ANALYSIS_PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
];

export type AnalysisFilters = {
  branch: "all" | string;
  school: "all" | string;
  class: "all" | string;
  medium: "all" | Medium;
};

export const NO_SCHOOL = "No school listed";

export function schoolOf(student: Student): string {
  return student.schoolName.trim() || NO_SCHOOL;
}

export function analysisRange(period: AnalysisPeriod, today = new Date()) {
  if (period === "this_month") {
    return { from: toDateKey(startOfMonth(today)), to: toDateKey(endOfMonth(today)) };
  }
  if (period === "last_month") {
    const ref = subMonths(today, 1);
    return { from: toDateKey(startOfMonth(ref)), to: toDateKey(endOfMonth(ref)) };
  }
  if (period === "last_3_months") {
    return {
      from: toDateKey(startOfMonth(subMonths(today, 2))),
      to: toDateKey(endOfMonth(today)),
    };
  }
  if (period === "this_year") {
    return { from: toDateKey(startOfYear(today)), to: toDateKey(endOfYear(today)) };
  }
  return { from: "2000-01-01", to: toDateKey(today) };
}

export function weeklyWindowStart(endKey: string): string {
  return toDateKey(startOfMonth(subMonths(parseDateKey(endKey), 2)));
}

export function scopeAnalysisStudents(
  students: Student[],
  filters: AnalysisFilters,
): Student[] {
  return students.filter(
    (s) =>
      s.active &&
      (filters.branch === "all" || s.branchId === filters.branch) &&
      (filters.school === "all" || schoolOf(s) === filters.school) &&
      (filters.class === "all" || s.class === filters.class) &&
      (filters.medium === "all" || s.medium === filters.medium),
  );
}

/**
 * A session is a date on which a branch took attendance (at least one check-in).
 * Students are only counted absent on their own branch's session dates.
 */
export type AttendanceIndex = {
  sessionsByBranch: Map<string, Set<string>>;
  datesByStudent: Map<string, Set<string>>;
};

export function buildAttendanceIndex(
  records: AttendanceRecord[],
  from: string,
  to: string,
): AttendanceIndex {
  const sessionsByBranch = new Map<string, Set<string>>();
  const datesByStudent = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.date < from || r.date > to) continue;
    const sessions = sessionsByBranch.get(r.branchId) ?? new Set<string>();
    sessions.add(r.date);
    sessionsByBranch.set(r.branchId, sessions);
    const dates = datesByStudent.get(r.studentId) ?? new Set<string>();
    dates.add(r.date);
    datesByStudent.set(r.studentId, dates);
  }
  return { sessionsByBranch, datesByStudent };
}

export type RateSummary = { present: number; possible: number; percent: number };

function roundPercent(present: number, possible: number): number {
  if (possible === 0) return 0;
  return Math.round((present / possible) * 1000) / 10;
}

export function attendanceRate(
  students: Student[],
  index: AttendanceIndex,
  includeDate: (date: string) => boolean = () => true,
): RateSummary {
  let present = 0;
  let possible = 0;
  for (const student of students) {
    const sessions = index.sessionsByBranch.get(student.branchId);
    if (!sessions) continue;
    const attended = index.datesByStudent.get(student.id);
    for (const date of sessions) {
      if (!includeDate(date)) continue;
      possible += 1;
      if (attended?.has(date)) present += 1;
    }
  }
  return { present, possible, percent: roundPercent(present, possible) };
}

export function genderCounts(students: Student[]) {
  let male = 0;
  let female = 0;
  let other = 0;
  for (const s of students) {
    if (s.gender === "male") male += 1;
    else if (s.gender === "female") female += 1;
    else other += 1;
  }
  return { male, female, other };
}

export type GenderStackRow = { name: string; male: number; female: number; other: number };

export function populationByBranch(
  branches: Branch[],
  students: Student[],
): GenderStackRow[] {
  return branches
    .map((branch) => ({
      name: branch.name,
      ...genderCounts(students.filter((s) => s.branchId === branch.id)),
    }))
    .filter((row) => row.male + row.female + row.other > 0);
}

export function presentByClassGender(
  students: Student[],
  index: AttendanceIndex,
): GenderStackRow[] {
  const byClass = new Map<string, Student[]>();
  for (const s of students) {
    if (!index.datesByStudent.get(s.id)?.size) continue;
    const cls = s.class.trim() || "—";
    const list = byClass.get(cls) ?? [];
    list.push(s);
    byClass.set(cls, list);
  }
  return [...byClass.entries()]
    .sort(([a], [b]) => compareClass(a, b))
    .map(([cls, list]) => ({
      name: /^\d+$/.test(cls) ? `Class ${cls}` : cls,
      ...genderCounts(list),
    }));
}

function groupBySchool(students: Student[]): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  for (const s of students) {
    const key = schoolOf(s);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return map;
}

export type NamedValue = { name: string; value: number };

export function attendanceBySchool(
  students: Student[],
  index: AttendanceIndex,
): NamedValue[] {
  return [...groupBySchool(students).entries()]
    .map(([name, list]) => ({ name, rate: attendanceRate(list, index) }))
    .filter((row) => row.rate.possible > 0)
    .map((row) => ({ name: row.name, value: row.rate.percent }))
    .sort((a, b) => b.value - a.value);
}

/** Average number of students present per session, by school. */
export function averagePresentBySchool(
  students: Student[],
  index: AttendanceIndex,
): NamedValue[] {
  return [...groupBySchool(students).entries()]
    .map(([name, list]) => {
      const sessionKeys = new Set<string>();
      let present = 0;
      for (const s of list) {
        const sessions = index.sessionsByBranch.get(s.branchId);
        if (!sessions) continue;
        for (const date of sessions) sessionKeys.add(`${s.branchId}|${date}`);
        const attended = index.datesByStudent.get(s.id);
        if (attended) present += [...attended].filter((d) => sessions.has(d)).length;
      }
      const avg = sessionKeys.size > 0 ? present / sessionKeys.size : 0;
      return { name, value: Math.round(avg * 10) / 10, sessions: sessionKeys.size };
    })
    .filter((row) => row.sessions > 0)
    .map(({ name, value }) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function studentsByMedium(students: Student[]): NamedValue[] {
  const counts = new Map<string, number>();
  for (const s of students) {
    const label = s.medium === "na" ? "Not set" : formatMedium(s.medium);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export type WeeklySeries = { label: string; values: (number | null)[] };

/** Attendance % per week of month (W1–W5) for the last three months ending at `endKey`. */
export function weeklyAttendanceByMonth(
  students: Student[],
  records: AttendanceRecord[],
  endKey: string,
): WeeklySeries[] {
  const end = parseDateKey(endKey);
  const months = [2, 1, 0].map((back) => startOfMonth(subMonths(end, back)));
  const index = buildAttendanceIndex(records, weeklyWindowStart(endKey), endKey);

  return months
    .map((monthStart) => {
      const monthKey = format(monthStart, "yyyy-MM");
      const values = [1, 2, 3, 4, 5].map((week) => {
        const rate = attendanceRate(students, index, (date) => {
          if (!date.startsWith(monthKey)) return false;
          const day = Number(date.slice(8, 10));
          return Math.ceil(day / 7) === week;
        });
        return rate.possible > 0 ? rate.percent : null;
      });
      return { label: format(monthStart, "MMM yyyy"), values };
    })
    .filter((series) => series.values.some((v) => v !== null));
}

export type StudentMonthRow = {
  key: string;
  branch: string;
  school: string;
  className: string;
  studentName: string;
  rollNumber: string;
  monthKey: string;
  month: string;
  present: number;
  absent: number;
  percent: number;
};

export function studentMonthlyRows(
  students: Student[],
  branches: Branch[],
  index: AttendanceIndex,
): StudentMonthRow[] {
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const rows: StudentMonthRow[] = [];

  for (const student of students) {
    const sessions = index.sessionsByBranch.get(student.branchId);
    if (!sessions) continue;
    const attended = index.datesByStudent.get(student.id);

    const byMonth = new Map<string, { sessions: number; present: number }>();
    for (const date of sessions) {
      const monthKey = date.slice(0, 7);
      const entry = byMonth.get(monthKey) ?? { sessions: 0, present: 0 };
      entry.sessions += 1;
      if (attended?.has(date)) entry.present += 1;
      byMonth.set(monthKey, entry);
    }

    for (const [monthKey, entry] of byMonth) {
      rows.push({
        key: `${student.id}-${monthKey}`,
        monthKey,
        branch: branchName.get(student.branchId) ?? "—",
        school: schoolOf(student),
        className: student.class || "—",
        studentName: student.name,
        rollNumber: student.rollNumber,
        month: format(parseDateKey(`${monthKey}-01`), "MMM yyyy"),
        present: entry.present,
        absent: entry.sessions - entry.present,
        percent: roundPercent(entry.present, entry.sessions),
      });
    }
  }

  return rows.sort(
    (a, b) =>
      b.monthKey.localeCompare(a.monthKey) ||
      a.branch.localeCompare(b.branch) ||
      a.school.localeCompare(b.school) ||
      compareClass(a.className, b.className) ||
      compareRollNumber(a.rollNumber, b.rollNumber),
  );
}
