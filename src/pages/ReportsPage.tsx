import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
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
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import type { AttendanceRecord, Student } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PERIOD_OPTIONS: { id: ReportPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

const fieldLabelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-mist";
const inputClass =
  "w-full rounded-lg border border-morning bg-white px-3 py-2 text-sm text-cerulean";

export function ReportsPage() {
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);

  const scopedBranch =
    session?.role === "manager" || session?.role === "user"
      ? session.branchId || "all"
      : "all";

  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayKey());
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [customFrom, setCustomFrom] = useState(() => todayKey());
  const [customTo, setCustomTo] = useState(() => todayKey());
  const [branchFilter, setBranchFilter] = useState<"all" | string>(scopedBranch);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isPeriodPending, startPeriodTransition] = useTransition();

  const [periodRecords, setPeriodRecords] = useState<AttendanceRecord[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Month-wise / day-wise download state
  const [exportMonth, setExportMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [exportDay, setExportDay] = useState(() => todayKey());
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const { from, to, label } = useMemo(
    () => periodRange(period, selectedDateKey, { from: customFrom, to: customTo }),
    [period, selectedDateKey, customFrom, customTo],
  );

  const selectPeriod = (next: ReportPeriod) => {
    startPeriodTransition(() => {
      if (next === "custom" && period !== "custom") {
        const current = periodRange(period, selectedDateKey);
        setCustomFrom(current.from);
        setCustomTo(current.to);
      }
      setPeriod(next);
    });
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
  }, [gridFrom, gridTo, branchFilter]);

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
  const loading = attendanceLoading || rosterLoading || isPeriodPending;

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
    setExportMonth(format(addMonths(new Date(y, m - 1, 1), delta), "yyyy-MM"));
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

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Harimandir Balopasana"
        subtitle="Attendance report by department"
      />

      {/* ============ Single unified filter ============ */}
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-mist" aria-hidden />
            <div>
              <h2 className="font-medium text-cerulean">Filters</h2>
              <p className="text-xs text-mist">
                {label} · {formatReportDate(from)}
                {from !== to && ` → ${formatReportDate(to)}`}
                {loading ? " · Updating…" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: period · department · date */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <span className={fieldLabelClass}>Period</span>
            <div className="inline-flex w-full flex-wrap rounded-full border border-morning bg-white p-1 shadow-sm">
              {PERIOD_OPTIONS.map(({ id, label: lbl }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPeriod(id)}
                  className={`min-w-[4.5rem] flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    period === id
                      ? "bg-cerulean text-white shadow-sm"
                      : "text-mist hover:text-cerulean"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            {session?.role === "admin" ? (
              <Select
                label="Department"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as "all" | string)}
                options={[
                  { value: "all", label: "All departments" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
                wrapperClassName="w-full"
              />
            ) : (
              <>
                <span className={fieldLabelClass}>Department</span>
                <p className="rounded-lg border border-morning bg-white px-3 py-2 text-sm font-medium text-cerulean">
                  {getBranch(scopedBranch)?.name ?? "—"}
                </p>
              </>
            )}
          </div>

          <div className="lg:col-span-4">
            {period === "custom" ? (
              <DateRangeFields
                from={customFrom}
                to={customTo}
                onFromChange={(value) =>
                  startPeriodTransition(() => setCustomFrom(value || todayKey()))
                }
                onToChange={(value) =>
                  startPeriodTransition(() => setCustomTo(value || todayKey()))
                }
              />
            ) : (
              <>
                <label className={fieldLabelClass} htmlFor="report-date">
                  Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="report-date"
                    type="date"
                    value={selectedDateKey}
                    max={todayKey()}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setSelectedDateKey(e.target.value);
                      setVisibleMonth(parseDateKey(e.target.value));
                    }}
                    className={inputClass}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 px-2"
                    aria-label={showCalendar ? "Hide calendar" : "Show calendar"}
                    aria-pressed={showCalendar}
                    onClick={() => setShowCalendar((v) => !v)}
                  >
                    <CalendarRange className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Optional calendar (non-custom periods) */}
        {period !== "custom" && showCalendar && (
          <div className="rounded-xl border border-morning p-3 sm:p-4">
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
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(key);
                      setVisibleMonth(day);
                    }}
                    className={`relative flex min-h-[44px] flex-col items-center justify-center rounded border py-1 text-sm transition-colors sm:min-h-[48px] ${
                      selected
                        ? "border-cerulean bg-cerulean text-white"
                        : inMonth
                          ? "border-morning bg-white text-cerulean hover:bg-morning/40"
                          : "border-transparent bg-morning/25 text-mist hover:bg-morning/40"
                    }`}
                  >
                    <span className="font-medium">{format(day, "d")}</span>
                    {hasData && (
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-honey" : "bg-mist"
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

        {/* Row 2: downloads — current view · month-wise · day-wise */}
        <div className="border-t border-morning pt-5">
          <div className="mb-3 flex items-center gap-2">
            <FileDown className="h-4 w-4 text-mist" aria-hidden />
            <h3 className="text-sm font-medium text-cerulean">Download report</h3>
            <span className="text-xs text-mist">· uses the selected department</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Current view */}
            <div className="flex flex-col rounded-xl border border-morning p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cerulean">
                <CalendarRange className="h-4 w-4 text-mist" /> Current view
              </p>
              <p className="mb-3 text-xs text-mist">
                {formatReportDate(from)}
                {from !== to && ` → ${formatReportDate(to)}`}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={downloadCsv}
                  disabled={loading}
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4 shrink-0" /> CSV
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={downloadPdf}
                  disabled={loading}
                  className="inline-flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4 shrink-0" /> PDF
                </Button>
              </div>
            </div>

            {/* Month-wise */}
            <div className="flex flex-col rounded-xl border border-morning p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cerulean">
                <CalendarRange className="h-4 w-4 text-mist" /> Month-wise
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="px-2"
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
                  className="px-2"
                  aria-label="Next month"
                  onClick={() => shiftExportMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 md:mt-auto md:pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                  onClick={() => exportMonthReport("csv")}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                  onClick={() => exportMonthReport("pdf")}
                >
                  <FileDown className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>

            {/* Day-wise */}
            <div className="flex flex-col rounded-xl border border-morning p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cerulean">
                <CalendarDays className="h-4 w-4 text-mist" /> Day-wise
              </p>
              <input
                type="date"
                value={exportDay}
                max={todayKey()}
                onChange={(e) => e.target.value && setExportDay(e.target.value)}
                className={inputClass}
              />
              <div className="mt-3 flex flex-wrap gap-2 md:mt-auto md:pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                  onClick={() => exportDayReport("csv")}
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                  onClick={() => exportDayReport("pdf")}
                >
                  <FileDown className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </div>

          {(exporting || exportMessage) && (
            <p className="mt-3 text-sm text-mist">
              {exporting ? "Preparing report…" : exportMessage}
            </p>
          )}
        </div>
      </Card>

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
