import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { getStudentById } from "../lib/db";
import { QrDisplay } from "../components/QrDisplay";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { Student } from "../types";

export function StudentQrPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const getBranch = useStore((s) => s.getBranch);

  const studentsPath = location.pathname.startsWith("/admin")
    ? "/admin/students"
    : location.pathname.startsWith("/user")
      ? "/user/students"
      : "/manager/students";

  const [student, setStudent] = useState<Student | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!studentId) {
      setLoadState("missing");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    void (async () => {
      try {
        const row = await getStudentById(studentId);
        if (cancelled) return;
        if (!row) {
          setStudent(null);
          setLoadState("missing");
          return;
        }
        setStudent(row);
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setStudent(null);
          setLoadState("missing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loadState === "loading") {
    return <p className="text-sm text-mist">Loading student…</p>;
  }

  if (!studentId || loadState === "missing" || !student) {
    return <Navigate to={studentsPath} replace />;
  }

  const branchName = getBranch(student.branchId)?.name;

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={studentsPath}
          className="touch-target inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-morning bg-white text-cerulean hover:bg-morning/40"
          aria-label="Back to students"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-cerulean">Student QR</h1>
          <p className="truncate text-sm text-mist">{student.name}</p>
        </div>
      </div>

      <Card className="!p-4 sm:!p-6">
        <QrDisplay student={student} branchName={branchName} variant="page" />
      </Card>

      <Link to={studentsPath} className="block">
        <Button variant="outline" className="w-full">
          Back to students
        </Button>
      </Link>
    </div>
  );
}
