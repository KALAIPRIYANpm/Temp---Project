import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { APP_SLUG } from "../lib/branding";
import { todayKey } from "../lib/dates";
import {
  buildReportRows,
  countByDate,
  reportToCsv,
  formatReportDate,
} from "../lib/attendanceReport";
import {
  REPORT_CHART_COLORS,
  activeStudentsInBranch,
  branchPresentAbsentTrend,
  dailyAttendanceTrend,
  formatAttendanceTrendSubtitle,
  presentAbsentSlices,
} from "../lib/reportAnalytics";
import {
  calendarDaysForMonth,
  periodRange,
  toDateKey,
  type ReportPeriod,
  parseDateKey,
} from "../lib/reportRanges";
import {
  countActiveStudents,
  countActiveStudentsByBranch,
  getStudentsByIds,
  listAttendanceInRange,
  listStudentsByBranch,
} from "../lib/db";
import { downloadAttendancePdf } from "../lib/Attendancepdf ";
import { BranchBarChart, DailyBarChart } from "../components/reports/GroupedBarChart";
import { DonutChart } from "../components/reports/DonutChart";
import { ReportChartCard } from "../components/reports/ReportChartCard";
import { DateRangeFields } from "../components/DateRangeFields";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import type { AttendanceRecord, Student } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIOD_OPTIONS: { id: ReportPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom range" },
];

const DATE_LABEL: Record<string, string> = {
  daily: "Date",
  weekly: "Any day in the week",
  monthly: "Month",
};

type ExportScope = "current" | "month" | "day";

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-morning bg-white px-2.5 py-1 text-xs font-medium text-cerulean">
      {children}
    </span>
  );
}

const fieldLabelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-mist";
const inputClass =
  "h-[42px] w-full rounded-lg border border-morning bg-white px-3 text-sm text-cerulean outline-none transition focus:border-cerulean focus:ring-1 focus:ring-cerulean disabled:cursor-not-allowed disabled:opacity-60";

export function ReportsPage() {
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);

  const isAdmin = session?.role === "admin";

  // Non-admins are locked to their own branch. This is derived (not stored in state)
  // so it stays correct even if the session finishes loading after the first render.
  const scopedBranch =
    session?.role === "manager" || session?.role === "user"
      ? session.branchId || "all"
      : "all";

  const [adminBranch, setAdminBranch] = useState<"all" | string>("all");
  const branchFilter: "all" | string = isAdmin ? adminBranch : scopedBranch;

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayKey());
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [customFrom, setCustomFrom] = useState(() => todayKey());
  const [customTo, setCustomTo] = useState(() => todayKey());
  const [showCalendar, setShowCalendar] = useState(false);

  const [periodRecords, setPeriodRecords] = useState<AttendanceRecord[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Download state
  const [exportMonth, setExportMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [exportDay, setExportDay] = useState(() => todayKey());
  const [exportScope, setExportScope] = useState<ExportScope>("current");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const { from, to, label } = useMemo(
    () => periodRange(period, selectedDateKey, { from: customFrom, to: customTo }),
    [period, selectedDateKey, customFrom, customTo],
  );

  const today = todayKey();

  const selectPeriod = (next: ReportPeriod) => {
    if (next === "custom" && period !== "custom") {
      // start the custom range from whatever is currently on screen
      setCustomFrom(from);
      setCustomTo(to);
      setShowCalendar(false);
    }
    setPeriod(next);
  };

  // Keep the custom range valid: From is never after To.
  const onRangeFromChange = (value: string) => {
    const next = value || today;
    setCustomFrom(next);
    if (next > customTo) setCustomTo(next);
  };
  const onRangeToChange = (value: string) => {
    const next = value || today;
    setCustomTo(next);
    if (next < customFrom) setCustomFrom(next);
  };

  const pickDate = (key: string) => {
    if (!key) return;
    setSelectedDateKey(key);
    setVisibleMonth(parseDateKey(key));
  };

  const departmentName =
    branchFilter === "all" ? "All departments" : (getBranch(branchFilter)?.name ?? "—");

  const hasActiveFilters =
    period !== "weekly" ||
    selectedDateKey !== today ||
    customFrom !== today ||
    customTo !== today ||
    (isAdmin && adminBranch !== "all");

  const resetFilters = () => {
    setPeriod("weekly");
    setSelectedDateKey(today);
    setCustomFrom(today);
    setCustomTo(today);
    setVisibleMonth(new Date());
    setShowCalendar(false);
    if (isAdmin) setAdminBranch("all");
  };

  const gridDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
  const gridFrom = toDateKey(gridDays[0]!);
  const gridTo = toDateKey(gridDays[gridDays.length - 1]!);

  // Enrollment counts — only change with branch
  useEffect(() => {
    let cancelled = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;
    setRosterLoading(true);

    void (async () => {
      try {
        if (branchId) {
          const [branchStudents, count] = await Promise.all([
            listStudentsByBranch(branchId, { activeOnly: true }),
            countActiveStudents(branchId),
          ]);
          if (cancelled) return;
          setStudents(branchStudents);
          setActiveCount(count);
          setBranchCounts({ [branchId]: count });
        } else {
          const [totalActive, counts] = await Promise.all([
            countActiveStudents(),
            countActiveStudentsByBranch(),
          ]);
          if (cancelled) return;
          setActiveCount(totalActive);
          setBranchCounts(counts);
        }
      } catch {
        if (!cancelled) {
          setActiveCount(0);
          setBranchCounts({});
          if (branchId) setStudents([]);
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchFilter]);

  // Attendance for the selected period
  useEffect(() => {
    let cancelled = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;
    setAttendanceLoading(true);

    void (async () => {
      try {
        const records = await listAttendanceInRange({ from, to, branchId });
        if (cancelled) return;

        if (!branchId) {
          const ids = [...new Set(records.map((r) => r.studentId))];
          const fetched = await getStudentsByIds(ids);
          if (cancelled) return;
          setPeriodRecords(records);
          setStudents(fetched);
        } else {
          setPeriodRecords(records);
        }
      } catch {
        if (!cancelled) {
          setPeriodRecords([]);
          if (branchFilter === "all") setStudents([]);
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, branchFilter]);

  // Calendar dots
  useEffect(() => {
    if (!showCalendar) return;
    let cancelled = false;
    const branchId = branchFilter === "all" ? undefined : branchFilter;

    void (async () => {
      try {
        const records = await listAttendanceInRange({
          from: gridFrom,
          to: gridTo,
          branchId,
        });
        if (!cancelled) setMonthAttendance(records);
      } catch {
        if (!cancelled) setMonthAttendance([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showCalendar, gridFrom, gridTo, branchFilter]);

  const studentById = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]));
    return (id: string) => map.get(id);
  }, [students]);

  const rows = useMemo(
    () => buildReportRows(periodRecords, studentById, getBranch, getMarkedByName),
    [periodRecords, studentById, getBranch, getMarkedByName],
  );

  const activeInScope = useMemo(() => {
    if (branchFilter === "all") return students.filter((s) => s.active);
    return activeStudentsInBranch(students, branchFilter);
  }, [students, branchFilter]);

  const presentAbsent = useMemo(() => {
    if (branchFilter === "all") {
      if (activeCount === 0) return [];
      const present = new Set(periodRecords.map((r) => r.studentId)).size;
      return [
        { name: "Present", value: present, fill: REPORT_CHART_COLORS.cerulean },
        {
          name: "Absent",
          value: Math.max(activeCount - present, 0),
          fill: REPORT_CHART_COLORS.morning,
        },
      ];
    }
    return presentAbsentSlices(periodRecords, activeInScope);
  }, [branchFilter, activeCount, periodRecords, activeInScope]);

  const dailyTrend = useMemo(() => {
    if (branchFilter === "all") {
      const countProxy = { length: activeCount } as unknown as Student[];
      return dailyAttendanceTrend(periodRecords, from, to, countProxy);
    }
    return dailyAttendanceTrend(periodRecords, from, to, activeInScope);
  }, [branchFilter, activeCount, periodRecords, from, to, activeInScope]);

  const trendSubtitle = useMemo(
    () => formatAttendanceTrendSubtitle(dailyTrend),
    [dailyTrend],
  );

  // Per-department (branch) present / absent — used by the chart and the PDF
  const branchTrend = useMemo(() => {
    if (branchFilter === "all") {
      return branches.map((branch) => {
        const total = branchCounts[branch.id] ?? 0;
        const present = new Set(
          periodRecords.filter((r) => r.branchId === branch.id).map((r) => r.studentId),
        ).size;
        return { name: branch.name, present, absent: Math.max(total - present, 0) };
      });
    }
    return branchPresentAbsentTrend(periodRecords, branches, students, branchFilter);
  }, [periodRecords, branches, students, branchFilter, branchCounts]);

  const dayCounts = useMemo(() => countByDate(monthAttendance), [monthAttendance]);

  const showBranchChart = branchFilter === "all" && branches.length > 1;
  const selectedDate = parseDateKey(selectedDateKey);
  const loading = attendanceLoading || rosterLoading;

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const csv = reportToCsv(rows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${APP_SLUG}-${from}-to-${to}.csv`,
    );
  };

  const downloadPdf = () => {
    downloadAttendancePdf(
      {
        periodLabel: label,
        fromLabel: formatReportDate(from),
        toLabel: formatReportDate(to),
        branches: branchTrend,
        rows: rows as unknown as Record<string, unknown>[],
      },
      `${APP_SLUG}-attendance-${from}-to-${to}.pdf`,
    );
  };

  /* ---------- Month-wise / day-wise export ---------- */

  const shiftExportMonth = (delta: number) => {
    const [y, m] = exportMonth.split("-").map(Number);
    if (!y || !m) return;
    const next = format(addMonths(new Date(y, m - 1, 1), delta), "yyyy-MM");
    if (next > format(new Date(), "yyyy-MM")) return; // no future months
    setExportMonth(next);
  };

  /** Fetches its own data for any range, so it works regardless of what's on screen. */
  const exportRange = async (
    rangeFrom: string,
    rangeTo: string,
    periodLabel: string,
    fileSuffix: string,
    kind: "csv" | "pdf",
  ) => {
    if (!rangeFrom || !rangeTo) return;
    setExporting(true);
    setExportMessage("");
    try {
      const branchId = branchFilter === "all" ? undefined : branchFilter;
      const records = await listAttendanceInRange({
        from: rangeFrom,
        to: rangeTo,
        branchId,
      });

      if (records.length === 0) {
        setExportMessage(`No attendance recorded for ${periodLabel}.`);
        return;
      }

      const ids = [...new Set(records.map((r) => r.studentId))];
      const fetched = await getStudentsByIds(ids);
      const byId = new Map(fetched.map((s) => [s.id, s]));
      const exportRows = buildReportRows(
        records,
        (id: string) => byId.get(id),
        getBranch,
        getMarkedByName,
      );

      if (kind === "csv") {
        saveBlob(
          new Blob([reportToCsv(exportRows)], { type: "text/csv;charset=utf-8" }),
          `${APP_SLUG}-attendance-${fileSuffix}.csv`,
        );
        return;
      }

      const exportBranches =
        branchFilter === "all"
          ? branches.map((branch) => {
              const total = branchCounts[branch.id] ?? 0;
              const present = new Set(
                records.filter((r) => r.branchId === branch.id).map((r) => r.studentId),
              ).size;
              return { name: branch.name, present, absent: Math.max(total - present, 0) };
            })
          : branchPresentAbsentTrend(records, branches, students, branchFilter);

      downloadAttendancePdf(
        {
          periodLabel,
          fromLabel: formatReportDate(rangeFrom),
          toLabel: formatReportDate(rangeTo),
          branches: exportBranches,
          rows: exportRows as unknown as Record<string, unknown>[],
        },
        `${APP_SLUG}-attendance-${fileSuffix}.pdf`,
      );
    } catch {
      setExportMessage("Could not prepare the report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const exportMonthReport = (kind: "csv" | "pdf") => {
    const [y, m] = exportMonth.split("-").map(Number);
    if (!y || !m) return;
    const start = new Date(y, m - 1, 1);
    void exportRange(
      toDateKey(startOfMonth(start)),
      toDateKey(endOfMonth(start)),
      format(start, "MMMM yyyy"),
      exportMonth,
      kind,
    );
  };

  const exportDayReport = (kind: "csv" | "pdf") => {
    if (!exportDay) return;
    void exportRange(exportDay, exportDay, formatReportDate(exportDay), exportDay, kind);
  };

  const runExport = (kind: "csv" | "pdf") => {
    setExportMessage("");
    if (exportScope === "month") return exportMonthReport(kind);
    if (exportScope === "day") return exportDayReport(kind);
    return kind === "csv" ? downloadCsv() : downloadPdf();
  };
  const exportBusy = exportScope === "current" ? loading : exporting;

  const rangeText = `${formatReportDate(from)}${from !== to ? ` → ${formatReportDate(to)}` : ""}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Harimandir Balopasana"
        subtitle="Attendance report by department"
      />

      {/* ============ Filters ============ */}
      <div className="rounded-2xl border border-morning/50 bg-white p-4 shadow-sm sm:p-5">
        {/* header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-morning/50 text-cerulean">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-cerulean">Filters</h2>
              <p className="text-xs text-mist">{loading ? "Updating…" : rangeText}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {/* row 1: period · department · date */}
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Period"
            value={period}
            onChange={(e) => selectPeriod(e.target.value as ReportPeriod)}
            options={PERIOD_OPTIONS.map((p) => ({ value: p.id, label: p.label }))}
          />

          {isAdmin ? (
            <Select
              label="Department"
              value={adminBranch}
              onChange={(e) => setAdminBranch(e.target.value as "all" | string)}
              options={[
                { value: "all", label: "All departments" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          ) : (
            <div>
              <span className={fieldLabelClass}>Department</span>
              <p className="flex h-[42px] items-center rounded-lg border border-morning bg-morning/20 px-3 text-sm font-medium text-cerulean">
                {getBranch(scopedBranch)?.name ?? "—"}
              </p>
            </div>
          )}

          {period !== "custom" && (
            <div>
              <label className={fieldLabelClass} htmlFor="report-date">
                {DATE_LABEL[period] ?? "Date"}
              </label>
              <div className="flex items-center gap-2">
                {period === "monthly" ? (
                  <input
                    id="report-date"
                    type="month"
                    value={selectedDateKey.slice(0, 7)}
                    max={today.slice(0, 7)}
                    onChange={(e) => e.target.value && pickDate(`${e.target.value}-01`)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    id="report-date"
                    type="date"
                    value={selectedDateKey}
                    max={today}
                    onChange={(e) => pickDate(e.target.value)}
                    className={inputClass}
                  />
                )}
                <Button
                  type="button"
                  variant={showCalendar ? "secondary" : "outline"}
                  size="sm"
                  className="h-[42px] shrink-0 px-3"
                  aria-label={showCalendar ? "Hide calendar" : "Show calendar"}
                  aria-pressed={showCalendar}
                  onClick={() => setShowCalendar((v) => !v)}
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {period === "custom" && (
            <div className="sm:col-span-2 lg:col-span-3">
              <DateRangeFields
                from={customFrom}
                to={customTo}
                onFromChange={onRangeFromChange}
                onToChange={onRangeToChange}
              />
            </div>
          )}
        </div>

        {/* calendar */}
        {period !== "custom" && showCalendar && (
          <div className="mt-4 rounded-xl border border-morning bg-morning/10 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-mist">Tap a day to change the report period</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-2"
                  aria-label="Previous month"
                  onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[8rem] text-center text-sm font-medium text-cerulean">
                  {format(visibleMonth, "MMMM yyyy")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-2"
                  aria-label="Next month"
                  onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-mist sm:gap-1 sm:text-sm">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
              {gridDays.map((day) => {
                const key = toDateKey(day);
                const hasData = (dayCounts.get(key) ?? 0) > 0;
                const inMonth = isSameMonth(day, visibleMonth);
                const selected = isSameDay(day, selectedDate);
                const future = key > today;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={future}
                    onClick={() => pickDate(key)}
                    className={`relative flex min-h-[44px] flex-col items-center justify-center rounded-lg border py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[48px] ${
                      selected
                        ? "border-cerulean bg-cerulean text-white"
                        : inMonth
                          ? "border-morning bg-white text-cerulean hover:bg-morning/40"
                          : "border-transparent bg-transparent text-mist hover:bg-morning/40"
                    }`}
                  >
                    <span className="font-medium">{format(day, "d")}</span>
                    {hasData && (
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-honey" : "bg-cerulean/50"
                        }`}
                        title="Has attendance"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* download */}
        <div className="mt-5 rounded-xl border border-morning/60 bg-morning/10 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileDown className="h-4 w-4 text-mist" aria-hidden />
            <h3 className="text-sm font-semibold text-cerulean">Download report</h3>
            <span className="text-xs text-mist">· {departmentName}</span>
          </div>

          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Export"
              value={exportScope}
              onChange={(e) => {
                setExportScope(e.target.value as ExportScope);
                setExportMessage("");
              }}
              options={[
                { value: "current", label: "Current view" },
                { value: "month", label: "Month-wise" },
                { value: "day", label: "Day-wise" },
              ]}
            />

            {exportScope === "current" && (
              <div>
                <span className={fieldLabelClass}>Range</span>
                <p className="flex h-[42px] items-center rounded-lg border border-morning bg-white px-3 text-sm text-cerulean">
                  {rangeText}
                </p>
              </div>
            )}

            {exportScope === "month" && (
              <div>
                <span className={fieldLabelClass}>Month</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[42px] px-2"
                    aria-label="Previous month"
                    onClick={() => shiftExportMonth(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <input
                    type="month"
                    value={exportMonth}
                    max={format(new Date(), "yyyy-MM")}
                    onChange={(e) => e.target.value && setExportMonth(e.target.value)}
                    className={inputClass}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[42px] px-2"
                    aria-label="Next month"
                    disabled={exportMonth >= format(new Date(), "yyyy-MM")}
                    onClick={() => shiftExportMonth(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {exportScope === "day" && (
              <div>
                <label className={fieldLabelClass} htmlFor="export-day">
                  Day
                </label>
                <input
                  id="export-day"
                  type="date"
                  value={exportDay}
                  max={today}
                  onChange={(e) => e.target.value && setExportDay(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="secondary"
                disabled={exportBusy}
                className="inline-flex h-[42px] flex-1 items-center justify-center gap-2"
                onClick={() => runExport("csv")}
              >
                <Download className="h-4 w-4 shrink-0" /> CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={exportBusy}
                className="inline-flex h-[42px] flex-1 items-center justify-center gap-2"
                onClick={() => runExport("pdf")}
              >
                <FileDown className="h-4 w-4 shrink-0" /> PDF
              </Button>
            </div>
          </div>

          {(exporting || exportMessage) && (
            <p className="mt-3 text-sm text-mist" role="status">
              {exporting ? "Preparing report…" : exportMessage}
            </p>
          )}
        </div>

        {/* active filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-morning/40 pt-3">
          <span className="text-xs text-mist">Showing:</span>
          <FilterChip>{label}</FilterChip>
          <FilterChip>{departmentName}</FilterChip>
          <FilterChip>{rangeText}</FilterChip>
          {loading && <span className="text-xs text-mist">Updating…</span>}
        </div>
      </div>

      {/* ============ Charts ============ */}
      <div
        className={`grid grid-cols-1 gap-4 xl:grid-cols-2 ${loading ? "opacity-70 transition-opacity" : ""}`}
      >
        <ReportChartCard title="Attendance split" subtitle="Present vs absent in this period">
          <DonutChart
            data={presentAbsent}
            emptyLabel="Add students to see attendance split."
          />
        </ReportChartCard>

        <ReportChartCard title="Attendance over time" subtitle={trendSubtitle}>
          <DailyBarChart
            data={dailyTrend}
            emptyLabel="No students in scope for this period."
          />
        </ReportChartCard>
      </div>

      {showBranchChart && (
        <div className={loading ? "opacity-70 transition-opacity" : ""}>
          <ReportChartCard
            title="Department comparison"
            subtitle="Present vs absent by department"
          >
            <BranchBarChart data={branchTrend} />
          </ReportChartCard>
        </div>
      )}
    </div>
  );
}
