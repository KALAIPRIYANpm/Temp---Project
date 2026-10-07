import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";

export type DashboardAttendancePeriod =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export type DateRangeKeys = { from: string; to: string };

/** Ensure from ≤ to for yyyy-MM-dd keys. */
export function normalizeDateRange(from: string, to: string): DateRangeKeys {
  if (!from || !to) {
    const today = toDateKey(new Date());
    return { from: from || today, to: to || today };
  }
  return from <= to ? { from, to } : { from: to, to: from };
}

export function formatDateRangeLabel(from: string, to: string): string {
  const range = normalizeDateRange(from, to);
  const start = parseDateKey(range.from);
  const end = parseDateKey(range.to);
  if (range.from === range.to) {
    return format(start, "EEEE, MMM d, yyyy");
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

/** Date range presets for the dashboard branch attendance panel */
export function dashboardAttendanceRange(
  period: DashboardAttendancePeriod,
  custom?: DateRangeKeys,
): {
  from: string;
  to: string;
  title: string;
  subtitle: string;
} {
  const today = new Date();
  const todayK = toDateKey(today);

  if (period === "custom") {
    const range = normalizeDateRange(
      custom?.from ?? todayK,
      custom?.to ?? todayK,
    );
    return {
      from: range.from,
      to: range.to,
      title: "Branch Attendance",
      subtitle: `Custom · ${formatDateRangeLabel(range.from, range.to)}`,
    };
  }

  if (period === "today") {
    const label = format(today, "MMM d, yyyy");
    return {
      from: todayK,
      to: todayK,
      title: "Branch Attendance today",
      subtitle: label,
    };
  }

  if (period === "this_week") {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `This week · ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }

  if (period === "last_week") {
    const ref = subWeeks(today, 1);
    const start = startOfWeek(ref, { weekStartsOn: 0 });
    const end = endOfWeek(ref, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `Last week · ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }

  if (period === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      title: "Branch Attendance",
      subtitle: `This month · ${format(start, "MMMM yyyy")}`,
    };
  }

  const ref = subMonths(today, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
    title: "Branch Attendance",
    subtitle: `Last month · ${format(start, "MMMM yyyy")}`,
  };
}

/** Parse local calendar date from yyyy-MM-dd */
export function parseDateKey(dateKey: string): Date {
  return parse(dateKey, "yyyy-MM-dd", new Date());
}

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function periodRange(
  period: ReportPeriod,
  dateKey: string,
  custom?: DateRangeKeys,
): { from: string; to: string; label: string } {
  if (period === "custom") {
    const range = normalizeDateRange(
      custom?.from ?? dateKey,
      custom?.to ?? dateKey,
    );
    return {
      from: range.from,
      to: range.to,
      label: formatDateRangeLabel(range.from, range.to),
    };
  }

  const d = parseDateKey(dateKey);
  if (period === "daily") {
    const k = toDateKey(d);
    return { from: k, to: k, label: format(d, "EEEE, MMM d, yyyy") };
  }
  if (period === "weekly") {
    const start = startOfWeek(d, { weekStartsOn: 0 });
    const end = endOfWeek(d, { weekStartsOn: 0 });
    return {
      from: toDateKey(start),
      to: toDateKey(end),
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    };
  }
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
    label: format(start, "MMMM yyyy"),
  };
}

/** All days to show in month grid (includes leading/trailing days from adjacent months) */
export function calendarDaysForMonth(visibleMonth: Date): Date[] {
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function isDateKeyInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to;
}

/** Inclusive list of yyyy-MM-dd keys from → to (normalized so from ≤ to). */
export function dateKeysInRange(from: string, to: string): string[] {
  const range = normalizeDateRange(from, to);
  return eachDayOfInterval({
    start: parseDateKey(range.from),
    end: parseDateKey(range.to),
  }).map(toDateKey);
}

/** Max days allowed for bulk mark-present range actions. */
export const MAX_ATTENDANCE_RANGE_DAYS = 62;
