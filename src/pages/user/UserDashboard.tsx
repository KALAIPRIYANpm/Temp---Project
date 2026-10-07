import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey, formatTime } from "../../lib/dates";
import {
  countActiveStudents,
  getStudentsByIds,
  listAttendanceForBranchDate,
} from "../../lib/db";
import type { AttendanceRecord, Student } from "../../types";

type DayPoint = { key: string; label: string; count: number };

/** Last `n` day keys (YYYY-MM-DD), oldest first, ending today. */
function lastDays(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }) });
  }
  return out;
}

/* ---------- Charts (pure SVG / CSS) ---------- */

function RateRing({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-morning" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="stroke-cerulean transition-all duration-700"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-cerulean text-[20px] font-semibold"
        style={{ transformOrigin: "50% 50%" }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function WeekBars({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => {
        const isToday = i === data.length - 1;
        return (
          <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs text-mist">{d.count}</span>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${
                isToday ? "bg-cerulean" : "bg-cerulean/30"
              }`}
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 2 }}
              title={`${d.key}: ${d.count}`}
            />
            <span className={`text-xs ${isToday ? "font-medium text-cerulean" : "text-mist"}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HourBars({ records }: { records: AttendanceRecord[] }) {
  const buckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of records) {
      const h = new Date(r.markedAt).getHours();
      if (!Number.isNaN(h)) map.set(h, (map.get(h) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [records]);

  if (buckets.length === 0) return <p className="text-sm text-mist">No check-ins yet.</p>;
  const max = Math.max(...buckets.map(([, n]) => n));

  return (
    <ul className="space-y-1.5">
      {buckets.map(([h, n]) => (
        <li key={h} className="flex items-center gap-3 text-xs">
          <span className="w-12 text-mist">
            {String(h % 12 || 12)} {h < 12 ? "AM" : "PM"}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-morning">
            <div
              className="h-full rounded-full bg-cerulean transition-all duration-500"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="w-5 text-right text-mist">{n}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Page ---------- */

export function UserDashboard() {
  const session = useStore((s) => s.session);
  const getBranch = useStore((s) => s.getBranch);

  const branchId = session?.branchId;
  const today = todayKey();

  const [studentCount, setStudentCount] = useState(0);
  const [week, setWeek] = useState<DayPoint[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [studentById, setStudentById] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setStudentCount(0);
      setWeek([]);
      setTodayAttendance([]);
      setStudentById({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const days = lastDays(7);
        const [count, ...perDay] = await Promise.all([
          countActiveStudents(branchId),
          ...days.map((d) => listAttendanceForBranchDate(branchId, d.key)),
        ]);
        if (cancelled) return;

        const todayRecords = perDay[perDay.length - 1] ?? [];
        setStudentCount(count);
        setWeek(days.map((d, i) => ({ ...d, count: perDay[i]?.length ?? 0 })));
        setTodayAttendance(todayRecords);

        const students = await getStudentsByIds(todayRecords.map((r) => r.studentId));
        if (cancelled) return;
        const map: Record<string, Student> = {};
        for (const s of students) map[s.id] = s;
        setStudentById(map);
      } catch {
        if (!cancelled) {
          setStudentCount(0);
          setWeek([]);
          setTodayAttendance([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, today]);

  const presentToday = todayAttendance.length;
  const rate = studentCount ? Math.round((presentToday / studentCount) * 100) : 0;

  const insight = useMemo(() => {
    if (week.length < 2) return null;
    const previous = week.slice(0, -1);
    const avg = previous.reduce((a, d) => a + d.count, 0) / previous.length;
    const best = [...week].sort((a, b) => b.count - a.count)[0];
    const diff = Math.round(presentToday - avg);
    const trend =
      avg === 0
        ? "Not enough history yet to compare."
        : diff === 0
        ? "Today is right on your 6-day average."
        : `Today is ${Math.abs(diff)} ${diff > 0 ? "above" : "below"} your 6-day average (${Math.round(avg)}).`;
    return best.count > 0 ? `${trend} Best day this week: ${best.label} (${best.count}).` : trend;
  }, [week, presentToday]);

  const recent = [...todayAttendance]
    .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={getBranch(branchId ?? "")?.name ?? "Your branch"}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/user/scan" className="block w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Scan QR</Button>
            </Link>
            <Link to="/user/attendance" className="block w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Edit attendance
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Students" value={studentCount} />
        <StatCard label="Present today" value={presentToday} />
        <StatCard label="Absent today" value={Math.max(studentCount - presentToday, 0)} />
      </div>

      {loading && <p className="text-sm text-mist">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-medium text-cerulean">Today's attendance</h2>
          <div className="flex items-center gap-4">
            <RateRing percent={rate} />
            <p className="text-sm text-mist">
              {presentToday} of {studentCount} students checked in.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium text-cerulean">Last 7 days</h2>
          <WeekBars data={week} />
          {insight && <p className="mt-3 text-sm text-mist">{insight}</p>}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-cerulean">Check-ins by hour</h2>
          <HourBars records={todayAttendance} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-cerulean">Latest check-ins</h2>
            <Link to="/user/attendance" className="text-xs text-mist hover:text-cerulean">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-mist">No check-ins yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-0.5 border-b border-morning py-2 last:border-0 sm:flex-row sm:justify-between"
                >
                  <span className="font-medium text-cerulean">
                    {studentById[r.studentId]?.name ?? "—"}
                  </span>
                  <span className="text-mist">{formatTime(r.markedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}