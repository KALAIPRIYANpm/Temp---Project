import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "../../store/useStore";
import { listAttendanceInRange, listStudentsByBranch } from "../../lib/db";
import { todayKey } from "../../lib/dates";
import type { AttendanceRecord, Student } from "../../types";
import { compareClass, MEDIUM_OPTIONS } from "../../lib/student";
import {
  ANALYSIS_PERIOD_OPTIONS,
  analysisRange,
  attendanceBySchool,
  attendanceRate,
  averagePresentBySchool,
  buildAttendanceIndex,
  genderCounts,
  NO_SCHOOL,
  populationByBranch,
  presentByClassGender,
  schoolOf,
  scopeAnalysisStudents,
  studentMonthlyRows,
  studentsByMedium,
  weeklyAttendanceByMonth,
  weeklyWindowStart,
  type AnalysisFilters,
  type AnalysisPeriod,
} from "../../lib/attendanceAnalysis";
import {
  DistributionBlocks,
  GenderStackedBars,
  GenderStackedColumns,
  PercentBars,
  ValueColumns,
  WeeklyLineChart,
} from "../../components/analysis/AnalysisCharts";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

const TABLE_PAGE_SIZE = 25;

function KpiStripe({
  label,
  value,
  detail,
  stripe,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  stripe: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-morning/50 bg-white shadow-sm">
      <div className="w-2 shrink-0" style={{ background: stripe }} />
      <div className="min-w-0 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-mist">{label}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-cerulean">{value}</p>
        <p className="mt-1 truncate text-xs text-mist">{detail}</p>
      </div>
    </div>
  );
}

export function AttendanceAnalysis() {
  const branches = useStore((s) => s.branches);

  const [period, setPeriod] = useState<AnalysisPeriod>("this_month");
  const [filters, setFilters] = useState<AnalysisFilters>({
    branch: "all",
    school: "all",
    class: "all",
    medium: "all",
  });
  const [tableLimit, setTableLimit] = useState(TABLE_PAGE_SIZE);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setFilter = <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => {
    setFilters((f) =>
      key === "branch" ? { ...f, branch: value as string, school: "all", class: "all" } : { ...f, [key]: value },
    );
    setTableLimit(TABLE_PAGE_SIZE);
  };

  const { from, to } = useMemo(() => analysisRange(period), [period]);
  const today = todayKey();
  const trendEnd = to < today ? to : today;
  const fetchFrom = useMemo(() => {
    const weeklyFrom = weeklyWindowStart(trendEnd);
    return weeklyFrom < from ? weeklyFrom : from;
  }, [from, trendEnd]);

  const branchIdsKey = branches.map((b) => b.id).join(",");

  useEffect(() => {
    const branchIds = filters.branch === "all" ? branchIdsKey.split(",").filter(Boolean) : [filters.branch];
    if (branchIds.length === 0) {
      setStudents([]);
      setAttendance([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const [records, ...studentLists] = await Promise.all([
          listAttendanceInRange({
            from: fetchFrom,
            to,
            branchId: filters.branch === "all" ? undefined : filters.branch,
          }),
          ...branchIds.map((id) => listStudentsByBranch(id, { activeOnly: true })),
        ]);
        if (cancelled) return;
        setAttendance(records);
        setStudents(studentLists.flat());
      } catch {
        if (!cancelled) {
          setAttendance([]);
          setStudents([]);
          setLoadError("Could not load attendance data. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.branch, branchIdsKey, fetchFrom, to]);

  const schoolOptions = useMemo(() => {
    const scoped = scopeAnalysisStudents(students, { ...filters, school: "all" });
    return [...new Set(scoped.map(schoolOf))].sort();
  }, [students, filters]);

  const classOptions = useMemo(() => {
    const scoped = scopeAnalysisStudents(students, { ...filters, class: "all" });
    return [...new Set(scoped.map((s) => s.class.trim()).filter(Boolean))].sort(compareClass);
  }, [students, filters]);

  const scoped = useMemo(() => scopeAnalysisStudents(students, filters), [students, filters]);
  const index = useMemo(() => buildAttendanceIndex(attendance, from, to), [attendance, from, to]);

  const gender = useMemo(() => genderCounts(scoped), [scoped]);
  const rate = useMemo(() => attendanceRate(scoped, index), [scoped, index]);
  const schoolCount = useMemo(
    () => new Set(scoped.map(schoolOf).filter((s) => s !== NO_SCHOOL)).size,
    [scoped],
  );
  const sessionCount = useMemo(() => {
    const branchIds = new Set(scoped.map((s) => s.branchId));
    let total = 0;
    for (const id of branchIds) total += index.sessionsByBranch.get(id)?.size ?? 0;
    return total;
  }, [scoped, index]);

  const population = useMemo(() => {
    const list =
      filters.branch === "all" ? branches : branches.filter((b) => b.id === filters.branch);
    return populationByBranch(list, scoped);
  }, [branches, scoped, filters.branch]);

  const weekly = useMemo(
    () => weeklyAttendanceByMonth(scoped, attendance, trendEnd),
    [scoped, attendance, trendEnd],
  );
  const mediumRows = useMemo(() => studentsByMedium(scoped), [scoped]);
  const schoolRates = useMemo(() => attendanceBySchool(scoped, index), [scoped, index]);
  const classGender = useMemo(() => presentByClassGender(scoped, index), [scoped, index]);
  const schoolAverages = useMemo(() => averagePresentBySchool(scoped, index), [scoped, index]);
  const tableRows = useMemo(
    () => studentMonthlyRows(scoped, branches, index),
    [scoped, branches, index],
  );

  const periodLabel =
    ANALYSIS_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-morning/50 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-cerulean sm:text-3xl">
          Attendance Analysis
        </h1>
        <p className="mt-1 text-sm text-mist">
          {periodLabel} · Absent counts only include days a branch took attendance
          {loading && " · Loading…"}
        </p>
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-morning/50 bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h2 className="border-b-2 border-[#2e7f80] pb-2 text-sm font-bold uppercase tracking-wide text-cerulean">
            Filters
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Select
              label="Branch"
              value={filters.branch}
              onChange={(e) => setFilter("branch", e.target.value)}
              options={[
                { value: "all", label: "All branches" },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <Select
              label="Date"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as AnalysisPeriod);
                setTableLimit(TABLE_PAGE_SIZE);
              }}
              options={ANALYSIS_PERIOD_OPTIONS}
            />
            <Select
              label="School"
              value={filters.school}
              onChange={(e) => setFilter("school", e.target.value)}
              options={[
                { value: "all", label: "All schools" },
                ...schoolOptions.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Select
              label="Class"
              value={filters.class}
              onChange={(e) => setFilter("class", e.target.value)}
              options={[
                { value: "all", label: "All classes" },
                ...classOptions.map((c) => ({
                  value: c,
                  label: /^\d+$/.test(c) ? `Class ${c}` : c,
                })),
              ]}
            />
            <Select
              label="Medium"
              value={filters.medium}
              onChange={(e) => setFilter("medium", e.target.value as AnalysisFilters["medium"])}
              options={[{ value: "all", label: "All mediums" }, ...MEDIUM_OPTIONS]}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiStripe
              label="Number of schools"
              value={schoolCount.toLocaleString()}
              detail="Selected scope"
              stripe="#2e7f80"
            />
            <KpiStripe
              label="Total students"
              value={scoped.length.toLocaleString()}
              detail={`M ${gender.male.toLocaleString()} · F ${gender.female.toLocaleString()}`}
              stripe="#2f5270"
            />
            <KpiStripe
              label="Attendance"
              value={rate.possible > 0 ? `${rate.percent}%` : "—"}
              detail={
                rate.possible > 0
                  ? `${sessionCount} sessions · ${rate.present} present · ${rate.possible - rate.present} absent`
                  : "No attendance taken in this period"
              }
              stripe="#7aab86"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DashboardPanel title="Student population" subtitle="By branch · M / F">
              <GenderStackedColumns rows={population} emptyLabel="No students in this scope." />
            </DashboardPanel>
            <DashboardPanel title="Weekly attendance" subtitle="Last 3 months · % per week of month">
              <WeeklyLineChart series={weekly} emptyLabel="No attendance in the last 3 months." />
            </DashboardPanel>
            <DashboardPanel title="Students by medium" subtitle="Active students in scope">
              <DistributionBlocks rows={mediumRows} unit="students" emptyLabel="No students in this scope." />
            </DashboardPanel>
            <DashboardPanel title="Attendance by schools" subtitle="Average attendance rate">
              <PercentBars rows={schoolRates} emptyLabel="No attendance taken in this period." />
            </DashboardPanel>
            <DashboardPanel title="Attendance by class" subtitle="Students present · M / F">
              <GenderStackedBars rows={classGender} emptyLabel="No attendance taken in this period." />
            </DashboardPanel>
            <DashboardPanel title="Average students by school" subtitle="Average present per session">
              <ValueColumns rows={schoolAverages} emptyLabel="No attendance taken in this period." />
            </DashboardPanel>
          </div>

          <DashboardPanel
            title="Attendance data"
            subtitle={`Branch · School · Class · Student · Month · Present · Absent · Att. % — ${tableRows.length.toLocaleString()} rows`}
          >
            {tableRows.length === 0 ? (
              <p className="text-sm text-mist">No attendance taken in this period.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-morning/60">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="bg-morning/40 text-[11px] font-bold uppercase tracking-wide text-cerulean">
                      <tr>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">School</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Month</th>
                        <th className="px-3 py-2 text-right">Present</th>
                        <th className="px-3 py-2 text-right">Abs</th>
                        <th className="px-3 py-2 text-right">Att. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning/50 text-cerulean">
                      {tableRows.slice(0, tableLimit).map((row) => (
                        <tr key={row.key} className="even:bg-page/60">
                          <td className="px-3 py-2">{row.branch}</td>
                          <td className="px-3 py-2">{row.school}</td>
                          <td className="px-3 py-2">{row.className}</td>
                          <td className="px-3 py-2">
                            {row.studentName}
                            <span className="ml-1 text-mist">({row.rollNumber})</span>
                          </td>
                          <td className="px-3 py-2">{row.month}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.present}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.absent}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.percent.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {tableLimit < tableRows.length && (
                  <div className="mt-3 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTableLimit((n) => n + TABLE_PAGE_SIZE * 2)}
                    >
                      Show more ({(tableRows.length - tableLimit).toLocaleString()} left)
                    </Button>
                  </div>
                )}
              </>
            )}
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
