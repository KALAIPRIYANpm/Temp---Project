import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey, formatTime } from "../../lib/dates";
import { sortStudentsByRollNumber } from "../../lib/student";
import {
  getStudentsByIds,
  listAttendanceForBranchDate,
  listStudentsByBranch,
} from "../../lib/db";
import type { AttendanceRecord, Student } from "../../types";

export function ManagerDashboard() {
  const session = useStore((s) => s.session);
  const getBranch = useStore((s) => s.getBranch);

  const branchId = session?.branchId;
  const today = todayKey();
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [studentById, setStudentById] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setStudents([]);
      setTodayAttendance([]);
      setStudentById({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [branchStudents, dayAttendance] = await Promise.all([
          listStudentsByBranch(branchId, { activeOnly: true }),
          listAttendanceForBranchDate(branchId, today),
        ]);
        if (cancelled) return;
        setStudents(sortStudentsByRollNumber(branchStudents));
        setTodayAttendance(dayAttendance);
        const map: Record<string, Student> = {};
        for (const s of branchStudents) map[s.id] = s;
        // Fill any attendance-only ids (should already be in branch list)
        const missing = dayAttendance
          .map((r) => r.studentId)
          .filter((id) => !map[id]);
        if (missing.length > 0) {
          const extras = await getStudentsByIds(missing);
          for (const s of extras) map[s.id] = s;
        }
        if (!cancelled) setStudentById(map);
      } catch {
        if (!cancelled) {
          setStudents([]);
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

  const activeStudents = students;
  const absentStudents = useMemo(
    () =>
      activeStudents.filter((s) => !todayAttendance.some((a) => a.studentId === s.id)),
    [activeStudents, todayAttendance],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${getBranch(branchId ?? "")?.name ?? "Branch"} · ${today}`}
        action={
          <Link to="/manager/scan" className="block w-full sm:inline-block sm:w-auto">
            <Button className="w-full sm:w-auto">Scan QR</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3 sm:gap-4 [&>*]:min-w-0">
        <StatCard label="Students" value={activeStudents.length} />
        <StatCard label="Present" value={todayAttendance.length} />
        <StatCard label="Absent" value={Math.max(activeStudents.length - todayAttendance.length, 0)} />
      </div>

      {loading && <p className="text-sm text-mist">Loading…</p>}

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Checked in today</h2>
        {todayAttendance.length === 0 ? (
          <p className="text-sm text-mist">No one yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {todayAttendance.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-0.5 border-b border-morning py-2 last:border-0 sm:flex-row sm:justify-between"
              >
                <span className="font-medium text-cerulean">
                  {studentById[r.studentId]?.name ?? "—"}
                  <span className="block text-xs font-normal text-mist">
                    {studentById[r.studentId]?.rollNumber} · {studentById[r.studentId]?.class}
                  </span>
                </span>
                <span className="text-mist">{formatTime(r.markedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-cerulean">Not checked in</h2>
        <ul className="space-y-2 text-sm">
          {absentStudents.map((s) => (
            <li key={s.id} className="border-b border-morning py-2 last:border-0">
              <span className="font-medium text-cerulean">{s.name}</span>{" "}
              <span className="text-mist">
                ({s.rollNumber} · {s.class})
              </span>
            </li>
          ))}
          {activeStudents.length === todayAttendance.length && activeStudents.length > 0 && (
            <li className="text-green-700">Everyone is here.</li>
          )}
          {!loading && activeStudents.length === 0 && (
            <li className="text-mist">No active students in this branch.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
