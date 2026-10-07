import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  Users,
  Percent,
  UserCheck,
  UserX,
  RotateCcw,
  Trophy,
  AlertTriangle,
  FileBarChart,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { filterAttendance } from "../../lib/attendanceReport";
import {
  branchOverviewRows,
  classOverviewRows,
  periodSummary,
  schoolAttendanceRanks,
  schoolOverviewRows,
  scopeActiveStudents,
  scopeRecords,
  type DashboardFilters,
} from "../../lib/dashboardAnalytics";
import {
  dashboardAttendanceRange,
  formatDateRangeLabel,
  normalizeDateRange,
  type DashboardAttendancePeriod,
} from "../../lib/reportRanges";
import { APP_NAME } from "../../lib/branding";
import { compareClass } from "../../lib/student";
import { listAttendanceInRange, listStudentsByBranch } from "../../lib/db";
import { AttendanceOverviewTable } from "../../components/dashboard/AttendanceOverviewTable";
import { DashboardKpiCard } from "../../components/dashboard/DashboardKpiCard";
import { DashboardPanel } from "../../components/dashboard/DashboardPanel";
import { RankingBarChart } from "../../components/reports/RankingBarChart";
import { DateRangeFields } from "../../components/DateRangeFields";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import type { AttendanceRecord, Student } from "../../types";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const SCHOOL_PAGE_SIZE = 8;

/** Attendance health thresholds */
function healthStatus(percent: number, hasStudents: boolean) {
  if (!hasStudents)
    return { label: "No data", badge: "bg-morning/60 text-mist", bar: "bg-mist" };
  if (percent >= 90)
    return { label: "Excellent", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" };
  if (percent >= 75)
    return { label: "Good", badge: "bg-sky-100 text-sky-700", bar: "bg-sky-500" };
  if (percent >= 60)
    return { label: "Needs attention", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500" };
  return { label: "Critical", badge: "bg-rose-100 text-rose-700", bar: "bg-rose-500" };
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-morning bg-white px-2.5 py-1 text-xs font-medium text-cerulean">
      {children}
    </span>
  );
}

export function AdminOverview() {
  const branches = useStore((s) => s.branches);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");
  const initialRange = dashboardAttendanceRange("today");
  const [rangeFrom, setRangeFrom] = useState(initialRange.from);
  const [rangeTo, setRangeTo] = useState(initialRange.to);
  const [branchFilter, setBranchFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<"all" | string>("all");
  const [classFilter, setClassFilter] = useState<"all" | string>("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [schoolPage, setSchoolPage] = useState(1);
  const [showFilterErrors, setShowFilterErrors] = useState(false);

  useEffect(() => {
    if (!branchFilter && branches[0]?.id) {
      setBranchFilter(branches[0].id);
    }
  }, [branches, branchFilter]);

  const filters: DashboardFilters = useMemo(
    () => ({
      branch: branchFilter || "all",
      school: schoolFilter,
      class: classFilter,
    }),
    [branchFilter, schoolFilter, classFilter],
  );

  const range = useMemo(
    () => normalizeDateRange(rangeFrom, rangeTo),
    [rangeFrom, rangeTo],
  );
  const from = range.from;
  const to = range.to;

  const subtitle = useMemo(() => {
    if (period === "custom") {
      return `Custom · ${formatDateRangeLabel(from, to)}`;
    }
    return dashboardAttendanceRange(period).subtitle;
  }, [period, from, to]);

  const branchError =
    showFilterErrors && !branchFilter ? "Branch is required." : undefined;
  const fromError =
    showFilterErrors && !rangeFrom ? "From date is required." : undefined;
  const toError = showFilterErrors && !rangeTo ? "To date is required." : undefined;
  const filtersReady = Boolean(branchFilter && rangeFrom && rangeTo);

  const branchName = branches.find((b) => b.id === branchFilter)?.name;
  const hasActiveFilters =
    period !== "today" || schoolFilter !== "all" || classFilter !== "all";

  const onPeriodChange = (next: DashboardAttendancePeriod) => {
    if (next !== "custom") {
      const current = dashboardAttendanceRange(next);
      setRangeFrom(current.from);
      setRangeTo(current.to);
    }
    setPeriod(next);
  };

  const onFromChange = (value: string) => {
    setRangeFrom(value);
    setPeriod("custom");
  };

  const onToChange = (value: string) => {
    setRangeTo(value);
    setPeriod("custom");
  };

  const resetFilters = () => {
    const today = dashboardAttendanceRange("today");
    setPeriod("today");
    setRangeFrom(today.from);
    setRangeTo(today.to);
    setSchoolFilter("all");
    setClassFilter("all");
  };

  useEffect(() => {
    if (!filtersReady) {
      setAttendance([]);
      setStudents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [records, branchStudents] = await Promise.all([
          listAttendanceInRange({ from, to, branchId: branchFilter }),
          listStudentsByBranch(branchFilter, { activeOnly: true }),
        ]);
        if (cancelled) return;
        setAttendance(records);
        setStudents(branchStudents);
      } catch {
        if (!cancelled) {
          setAttendance([]);
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtersReady, from, to, branchFilter]);

  const schoolOptions = useMemo(() => {
    if (!branchFilter) return [];
    const scoped = scopeActiveStudents(students, { ...filters, school: "all" });
    return [
      ...new Set(scoped.map((s) => s.schoolName.trim() || "No school listed")),
    ].sort();
  }, [students, filters, branchFilter]);

  const classOptions = useMemo(() => {
    if (!branchFilter) return [];
    const scoped = scopeActiveStudents(students, { ...filters, class: "all" });
    return [...new Set(scoped.map((s) => s.class.trim()).filter(Boolean))].sort(
      compareClass,
    );
  }, [students, filters, branchFilter]);

  const scopedStudents = useMemo(() => {
    if (!branchFilter) return [];
    return scopeActiveStudents(students, filters);
  }, [branchFilter, students, filters]);

  const rawPeriodRecords = useMemo(
    () => filterAttendance(attendance, from, to, "all"),
    [attendance, from, to],
  );

  const periodRecords = useMemo(() => {
    if (!branchFilter) return [];
    const ids = new Set(scopedStudents.map((s) => s.id));
    return scopeRecords(rawPeriodRecords, ids);
  }, [rawPeriodRecords, scopedStudents, branchFilter]);

  const summary = useMemo(() => {
    if (!branchFilter) {
      return { totalStudents: 0, present: 0, absent: 0 };
    }
    return periodSummary(periodRecords, scopedStudents);
  }, [branchFilter, periodRecords, scopedStudents]);

  // Gender split of the students currently in scope (same scope as "Total Students")
  const genderCounts = useMemo(() => {
    let male = 0;
    let female = 0;
    for (const st of scopedStudents) {
      const g = String((st as { gender?: string }).gender ?? "")
        .trim()
        .toLowerCase();
      if (g === "m" || g.startsWith("male") || g.startsWith("boy")) male += 1;
      else if (g === "f" || g.startsWith("female") || g.startsWith("girl")) female += 1;
    }
    return { male, female };
  }, [scopedStudents]);

  const attendancePercent =
    summary.totalStudents > 0
      ? Math.round((summary.present / summary.totalStudents) * 1000) / 10
      : 0;
  const absentPercent =
    summary.totalStudents > 0 ? Math.round((100 - attendancePercent) * 10) / 10 : 0;
  const status = healthStatus(attendancePercent, summary.totalStudents > 0);

  const branchRows = useMemo(() => {
    if (!branchFilter) return [];
    return branchOverviewRows(branches, students, periodRecords, filters);
  }, [branchFilter, periodRecords, branches, students, filters]);

  const schoolRows = useMemo(
    () =>
      !branchFilter ? [] : schoolOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  useEffect(() => {
    setSchoolPage(1);
  }, [branchFilter, schoolFilter, classFilter, period, from, to]);

  const schoolTotalPages = Math.max(1, Math.ceil(schoolRows.length / SCHOOL_PAGE_SIZE));
  const pagedSchoolRows = useMemo(() => {
    const page = Math.min(schoolPage, schoolTotalPages);
    const start = (page - 1) * SCHOOL_PAGE_SIZE;
    return schoolRows.slice(start, start + SCHOOL_PAGE_SIZE);
  }, [schoolRows, schoolPage, schoolTotalPages]);

  const classRows = useMemo(
    () =>
      !branchFilter ? [] : classOverviewRows(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const schoolRanks = useMemo(
    () =>
      !branchFilter
        ? { top: [], bottom: [] }
        : schoolAttendanceRanks(students, periodRecords, filters),
    [branchFilter, students, periodRecords, filters],
  );

  const topSchoolBars = useMemo(
    () => schoolRanks.top.map((r) => ({ name: `${r.name} (${r.value}%)`, value: r.value })),
    [schoolRanks.top],
  );

  const bottomSchoolBars = useMemo(
    () => schoolRanks.bottom.map((r) => ({ name: `${r.name} (${r.value}%)`, value: r.value })),
    [schoolRanks.bottom],
  );

  const bestSchool = schoolRanks.top[0];
  const weakestSchool = schoolRanks.bottom[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-cerulean to-cerulean/80 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">
              {APP_NAME} · Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Branch Attendance
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {branchName ? `${branchName} · ` : ""}
              {filtersReady ? subtitle : "Select required filters"}
              {loading ? " · Loading…" : ""}
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/25"
          >
            <FileBarChart className="h-4 w-4" />
            Full reports
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-morning/50 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Period"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as DashboardAttendancePeriod)}
            options={PERIOD_OPTIONS}
          />
          <Select
            label="Branch"
            required
            value={branchFilter}
            error={branchError}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setSchoolFilter("all");
              setClassFilter("all");
              setShowFilterErrors(true);
            }}
            onBlur={() => setShowFilterErrors(true)}
            options={[
              { value: "", label: "Select branch" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <Select
            label="School"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value as "all" | string)}
            options={[
              {
                value: "all",
                label: branchFilter ? "All schools" : "Select a branch first",
              },
              ...schoolOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            label="Class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as "all" | string)}
            options={[
              {
                value: "all",
                label: branchFilter ? "All classes" : "Select a branch first",
              },
              ...classOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        <div className="mt-3">
          <DateRangeFields
            required
            from={rangeFrom}
            to={rangeTo}
            fromError={fromError}
            toError={toError}
            onFromChange={(value) => {
              onFromChange(value);
              setShowFilterErrors(true);
            }}
            onToChange={(value) => {
              onToChange(value);
              setShowFilterErrors(true);
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-morning/40 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-mist">Showing:</span>
            {branchName && <FilterChip>{branchName}</FilterChip>}
            {filtersReady && <FilterChip>{subtitle}</FilterChip>}
            {schoolFilter !== "all" && <FilterChip>{schoolFilter}</FilterChip>}
            {classFilter !== "all" && <FilterChip>Class {classFilter}</FilterChip>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset filters
          </Button>
        </div>
      </div>

      {!filtersReady ? (
        <p className="rounded border border-morning bg-white px-4 py-6 text-center text-sm text-mist">
          Select a branch and date range to load dashboard data.
        </p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <DashboardKpiCard
              label="Total Students"
              value={summary.totalStudents}
              icon={GraduationCap}
              tone="mist"
            />
            <DashboardKpiCard
              label="Male / Female"
              value={`${genderCounts.male} / ${genderCounts.female}`}
              icon={Users}
              tone="cerulean"
            />
            <DashboardKpiCard
              label="Present"
              value={summary.present}
              icon={UserCheck}
              tone="success"
            />
            <DashboardKpiCard
              label="Absent"
              value={summary.absent}
              icon={UserX}
              tone="danger"
            />
            <DashboardKpiCard
              label="Attendance %"
              value={`${attendancePercent}%`}
              icon={Percent}
              tone="cerulean"
            />
            <DashboardKpiCard
              label="Branches"
              value={branches.length}
              icon={Building2}
              tone="honey"
            />
          </div>

          {/* Snapshot + branch overview */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <DashboardPanel
              className="xl:col-span-4"
              title="Attendance snapshot"
              subtitle="Health of the selected scope"
            >
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-cerulean">
                    {attendancePercent}%
                  </p>
                  <p className="text-xs text-mist">
                    {summary.present} of {summary.totalStudents} students present
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-morning">
                <div
                  className={`${status.bar} transition-all duration-700`}
                  style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-mist">
                <span>Present {attendancePercent}%</span>
                <span>Absent {absentPercent}%</span>
              </div>

              <div className="mt-5 space-y-3 border-t border-morning/40 pt-4 text-sm">
                <div className="flex items-start gap-3">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs text-mist">Best performing school</p>
                    <p className="font-medium text-cerulean">
                      {bestSchool ? `${bestSchool.name} · ${bestSchool.value}%` : "Not enough data"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs text-mist">Needs follow-up</p>
                    <p className="font-medium text-cerulean">
                      {weakestSchool
                        ? `${weakestSchool.name} · ${weakestSchool.value}%`
                        : "Not enough data"}
                    </p>
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              className="xl:col-span-8"
              title="Attendance overview"
              subtitle="By branch"
            >
              <AttendanceOverviewTable
                rows={branchRows}
                nameLabel="Branch"
                metaLabel="City"
                emptyLabel="No branch data for current filters."
              />
            </DashboardPanel>
          </div>

          {/* School + class tables */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <DashboardPanel
              className="xl:col-span-7"
              title="School-wise summary"
              subtitle={
                !branchFilter ? "Select a branch to see schools" : "Attendance by school"
              }
            >
              <AttendanceOverviewTable
                rows={pagedSchoolRows}
                nameLabel="School"
                emptyLabel={
                  !branchFilter
                    ? "Select a branch to load school breakdown."
                    : "Add school names to student records."
                }
              />
              {schoolRows.length > SCHOOL_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={schoolPage <= 1}
                    onClick={() => setSchoolPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-mist">
                    Page {Math.min(schoolPage, schoolTotalPages)} of {schoolTotalPages} ·{" "}
                    {schoolRows.length} schools
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={schoolPage >= schoolTotalPages}
                    onClick={() => setSchoolPage((p) => Math.min(schoolTotalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              className="xl:col-span-5"
              title="Class-wise attendance"
              subtitle="By class"
            >
              <AttendanceOverviewTable
                rows={classRows}
                nameLabel="Class"
                emptyLabel={
                  !branchFilter
                    ? "Select a branch to load class breakdown."
                    : "No class data for current filters."
                }
              />
            </DashboardPanel>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DashboardPanel title="Top 5 schools" subtitle="Highest attendance %">
              <RankingBarChart
                data={topSchoolBars}
                emptyLabel={
                  !branchFilter
                    ? "Select a branch for school rankings."
                    : "Not enough school data."
                }
              />
            </DashboardPanel>

            <DashboardPanel title="Lowest 5 schools" subtitle="Lowest attendance %">
              <RankingBarChart
                data={bottomSchoolBars}
                emptyLabel={
                  !branchFilter
                    ? "Select a branch for school rankings."
                    : "Not enough school data."
                }
                accent="#7a9d96"
              />
            </DashboardPanel>
          </div>
        </>
      )}

      <p className="text-xs text-mist">
        Attendance is tracked when students scan QR or are marked present by staff. Branch and
        date range are required. School and class filters load after you select a branch.
      </p>
    </div>
  );
}