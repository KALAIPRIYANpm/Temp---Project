import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import {
  dashboardAttendanceRange,
  type DashboardAttendancePeriod,
} from "../lib/reportRanges";
import { todayKey } from "../lib/dates";
import { branchListTitle } from "../lib/branch";
import {
  countActiveStudentsByBranch,
  summarizeAttendanceByBranch,
} from "../lib/db";
import { DateRangeFields } from "./DateRangeFields";
import { Card } from "./ui/Card";
import { Select } from "./ui/Select";

const PERIOD_OPTIONS: { value: DashboardAttendancePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

type BranchAttendanceSectionProps = {
  reportsPath?: string;
};

export function BranchAttendanceSection({ reportsPath = "/admin/reports" }: BranchAttendanceSectionProps) {
  const branches = useStore((s) => s.branches);

  const [period, setPeriod] = useState<DashboardAttendancePeriod>("today");
  const [customFrom, setCustomFrom] = useState(() => todayKey());
  const [customTo, setCustomTo] = useState(() => todayKey());
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});
  const [attendanceByBranch, setAttendanceByBranch] = useState<
    Record<string, { checkIns: number; uniquePresent: number }>
  >({});
  const [loading, setLoading] = useState(false);

  const { from, to, title, subtitle } = useMemo(
    () => dashboardAttendanceRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo],
  );

  const onPeriodChange = (next: DashboardAttendancePeriod) => {
    if (next === "custom" && period !== "custom") {
      const current = dashboardAttendanceRange(period);
      setCustomFrom(current.from);
      setCustomTo(current.to);
    }
    setPeriod(next);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [counts, summary] = await Promise.all([
          countActiveStudentsByBranch(),
          summarizeAttendanceByBranch(from, to),
        ]);
        if (cancelled) return;
        setBranchCounts(counts);
        setAttendanceByBranch(summary);
      } catch {
        if (!cancelled) {
          setBranchCounts({});
          setAttendanceByBranch({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const branchRows = useMemo(
    () =>
      branches.map((branch) => {
        const studentCount = branchCounts[branch.id] ?? 0;
        const stats = attendanceByBranch[branch.id];
        return {
          branch,
          studentCount,
          checkIns: stats?.checkIns ?? 0,
          uniquePresent: stats?.uniquePresent ?? 0,
        };
      }),
    [branches, branchCounts, attendanceByBranch],
  );

  const isSingleDay = from === to;

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-medium text-cerulean">{title}</h2>
          <p className="mt-0.5 text-sm text-mist">
            {subtitle}
            {loading ? " · Loading…" : ""}
          </p>
        </div>
        <Select
          label="View"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as DashboardAttendancePeriod)}
          options={PERIOD_OPTIONS}
          wrapperClassName="w-full shrink-0 sm:w-44"
          aria-label="Attendance period"
        />
      </div>

      {period === "custom" && (
        <div className="mb-4">
          <DateRangeFields
            from={customFrom}
            to={customTo}
            onFromChange={(value) => setCustomFrom(value || todayKey())}
            onToChange={(value) => setCustomTo(value || todayKey())}
          />
        </div>
      )}

      {branches.length === 0 ? (
        <p className="text-sm text-mist">No branches yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {branchRows.map(({ branch, studentCount, checkIns, uniquePresent }) => (
            <li
              key={branch.id}
              className="flex flex-col gap-1 border-b border-morning py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="font-medium text-cerulean">{branchListTitle(branch)}</span>
                <span className="block text-mist sm:inline sm:before:content-['·'] sm:before:mx-1">
                  {studentCount} students
                </span>
              </span>
              <span className="shrink-0 font-medium text-honey">
                {isSingleDay
                  ? `${uniquePresent} present`
                  : `${uniquePresent} students · ${checkIns} check-ins`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-morning pt-3 text-sm">
        <Link to={reportsPath} className="font-medium text-cerulean hover:underline">
          View full history &amp; export →
        </Link>
      </p>
    </Card>
  );
}
