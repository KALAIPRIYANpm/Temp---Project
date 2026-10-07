import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import Swal from "sweetalert2";
import { toastError, toastSuccess } from "../lib/toast";
import { Eye } from "lucide-react";
import { useStore } from "../store/useStore";
import { Badge } from "../components/ui/Badge";
import { Card, CardRow } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { StudentPhoto } from "../components/StudentPhoto";
import { DateRangeFields } from "../components/DateRangeFields";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../components/ui/TableWrap";
import { formatTime, todayKey } from "../lib/dates";
import { formatReportDate } from "../lib/attendanceReport";
import { CLASS_OPTIONS, compareClass, compareRollNumber, filterStudents } from "../lib/student";
import {
  normalizeDateRange,
  parseDateKey,
  formatDateRangeLabel,
} from "../lib/reportRanges";
import { useScrollIntoViewOnChange } from "../hooks/useScrollIntoViewOnChange";
import {
  attendancePathForRole,
  clearAttendanceReturn,
  readAttendanceReturnForMount,
  saveAttendanceReturn,
  type AttendanceListReturn,
} from "../lib/attendanceReturn";
import {
  listAttendanceForBranchDate,
  listAttendanceInRange,
  listStudentsByBranch,
} from "../lib/db";
import { StudentSearchField } from "../components/StudentSearchField";
import { MarkPresentRangeDialog } from "../components/MarkPresentRangeDialog";
import { toUserMessage } from "../lib/userError";
import type { AttendanceRecord, Student, UserRole } from "../types";

const PAGE_SIZE = 50;

type StatusFilter = "all" | "present" | "absent";
type SortOption =
  | "roll-asc"
  | "roll-desc"
  | "name-asc"
  | "name-desc"
  | "class-asc"
  | "present-first"
  | "absent-first";

const SORT_VALUES = new Set<SortOption>([
  "roll-asc",
  "roll-desc",
  "name-asc",
  "name-desc",
  "class-asc",
  "present-first",
  "absent-first",
]);

function isStatusFilter(value: string): value is StatusFilter {
  return value === "all" || value === "present" || value === "absent";
}

function isSortOption(value: string): value is SortOption {
  return SORT_VALUES.has(value as SortOption);
}

type StudentAttendanceRow = {
  student: Student;
  record?: AttendanceRecord;
  present: boolean;
  daysPresent: number;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "present", label: "Present only" },
  { value: "absent", label: "Absent only" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "roll-asc", label: "Roll number (low → high)" },
  { value: "roll-desc", label: "Roll number (high → low)" },
  { value: "name-asc", label: "Name (A→Z)" },
  { value: "name-desc", label: "Name (Z→A)" },
  { value: "class-asc", label: "Class (1→12)" },
  { value: "present-first", label: "Present first" },
  { value: "absent-first", label: "Absent first" },
];

function sortStudentRows(
  rows: StudentAttendanceRow[],
  sort: SortOption,
): StudentAttendanceRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sort) {
      case "roll-desc":
        return compareRollNumber(b.student.rollNumber, a.student.rollNumber);
      case "name-asc":
        return a.student.name.localeCompare(b.student.name, undefined, {
          sensitivity: "base",
        });
      case "name-desc":
        return b.student.name.localeCompare(a.student.name, undefined, {
          sensitivity: "base",
        });
      case "class-asc": {
        const byClass = compareClass(a.student.class, b.student.class);
        return byClass !== 0
          ? byClass
          : compareRollNumber(a.student.rollNumber, b.student.rollNumber);
      }
      case "present-first": {
        if (a.present !== b.present) return a.present ? -1 : 1;
        return compareRollNumber(a.student.rollNumber, b.student.rollNumber);
      }
      case "absent-first": {
        if (a.present !== b.present) return a.present ? 1 : -1;
        return compareRollNumber(a.student.rollNumber, b.student.rollNumber);
      }
      case "roll-asc":
      default:
        return compareRollNumber(a.student.rollNumber, b.student.rollNumber);
    }
  });
  return sorted;
}

function studentProfilePath(role: UserRole | undefined, studentId: string): string {
  const base = role === "admin" ? "/admin" : role === "user" ? "/user" : "/manager";
  return `${base}/students/${studentId}`;
}

export function AttendanceEditPage() {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);
  const getMarkedByName = useStore((s) => s.getMarkedByName);
  const markAttendanceForDate = useStore((s) => s.markAttendanceForDate);
  const markAttendanceBulkForClassDate = useStore((s) => s.markAttendanceBulkForClassDate);
  const clearAttendanceBulkForClassDate = useStore((s) => s.clearAttendanceBulkForClassDate);
  const deleteAttendance = useStore((s) => s.deleteAttendance);

  // Peek once per mount cycle (Strict Mode safe); clear after scroll restore.
  const restoredRef = useRef<AttendanceListReturn | null | undefined>(undefined);
  if (restoredRef.current === undefined) {
    restoredRef.current = readAttendanceReturnForMount();
  }
  const restored = restoredRef.current;

  const isAdmin = session?.role === "admin";
  const [selectedBranch, setSelectedBranch] = useState(
    () =>
      restored?.selectedBranch ||
      session?.branchId ||
      branches[0]?.id ||
      "",
  );
  const branchId = isAdmin ? selectedBranch : session?.branchId;
  const [dateMode, setDateMode] = useState<"single" | "range">(
    () => (restored?.dateMode === "range" ? "range" : "single"),
  );
  const [filterDate, setFilterDate] = useState(() => restored?.filterDate ?? todayKey());
  const [rangeFrom, setRangeFrom] = useState(() => restored?.rangeFrom ?? todayKey());
  const [rangeTo, setRangeTo] = useState(() => restored?.rangeTo ?? todayKey());
  const [classFilter, setClassFilter] = useState(() => restored?.classFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    restored && isStatusFilter(restored.statusFilter) ? restored.statusFilter : "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    restored && isSortOption(restored.sortBy) ? restored.sortBy : "roll-asc",
  );
  const [search, setSearch] = useState(() => restored?.search ?? "");
  const [page, setPage] = useState(() =>
    restored && restored.page >= 1 ? restored.page : 1,
  );
  const [rangeStudent, setRangeStudent] = useState<Student | null>(null);
  const [highlightStudentId, setHighlightStudentId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const pendingScrollRestore = useRef(
    restored
      ? { scrollY: restored.scrollY, focusStudentId: restored.focusStudentId }
      : null,
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const range = useMemo(
    () => normalizeDateRange(rangeFrom, rangeTo),
    [rangeFrom, rangeTo],
  );
  const isRange = dateMode === "range";
  const rangeDayCount = useMemo(
    () =>
      differenceInCalendarDays(parseDateKey(range.to), parseDateKey(range.from)) + 1,
    [range.from, range.to],
  );

  const filtersKey = [
    branchId,
    filterDate,
    classFilter,
    statusFilter,
    sortBy,
    search,
    dateMode,
    range.from,
    range.to,
  ].join("|");
  const prevFiltersKeyRef = useRef(filtersKey);

  useEffect(() => {
    if (prevFiltersKeyRef.current === filtersKey) return;
    prevFiltersKeyRef.current = filtersKey;
    setPage(1);
  }, [filtersKey]);

  useEffect(() => {
    if (isAdmin && !selectedBranch && branches[0]?.id) {
      setSelectedBranch(branches[0].id);
    }
  }, [isAdmin, selectedBranch, branches]);

  const reload = useCallback(async () => {
    if (!branchId) {
      setStudents([]);
      setAttendance([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [roster, dayOrRangeAttendance] = await Promise.all([
        listStudentsByBranch(branchId, { activeOnly: true }),
        dateMode === "range"
          ? listAttendanceInRange({
              from: range.from,
              to: range.to,
              branchId,
            })
          : listAttendanceForBranchDate(branchId, filterDate),
      ]);
      setStudents(roster);
      setAttendance(dayOrRangeAttendance);
    } catch (e) {
      setLoadError(toUserMessage(e, "Couldn't load attendance. Please try again."));
      setStudents([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, filterDate, dateMode, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const daysPresentByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of attendance) {
      map.set(record.studentId, (map.get(record.studentId) ?? 0) + 1);
    }
    return map;
  }, [attendance]);

  const records = useMemo(() => {
    const byStudent = new Map<string, AttendanceRecord>();
    for (const record of attendance) {
      const existing = byStudent.get(record.studentId);
      if (!existing || record.date >= existing.date) {
        byStudent.set(record.studentId, record);
      }
    }
    return byStudent;
  }, [attendance]);

  const classRoster = useMemo(() => {
    if (classFilter === "all") return students;
    return students.filter((s) => s.class === classFilter);
  }, [students, classFilter]);

  const scopedRows = useMemo<StudentAttendanceRow[]>(() => {
    return classRoster.map((student) => {
      const daysPresent = daysPresentByStudent.get(student.id) ?? 0;
      const record = records.get(student.id);
      return {
        student,
        record,
        present: daysPresent > 0,
        daysPresent,
      };
    });
  }, [classRoster, records, daysPresentByStudent]);

  const presentTotal = useMemo(
    () => scopedRows.filter((row) => row.present).length,
    [scopedRows],
  );
  const totalStudents = scopedRows.length;
  const absentTotal = Math.max(totalStudents - presentTotal, 0);

  const filteredRows = useMemo(() => {
    const searchTerm = search.trim();
    let rows = scopedRows;

    if (searchTerm) {
      const matchedIds = new Set(filterStudents(classRoster, searchTerm).map((s) => s.id));
      rows = rows.filter((row) => matchedIds.has(row.student.id));
    }

    if (statusFilter === "present") {
      rows = rows.filter((row) => row.present);
    } else if (statusFilter === "absent") {
      rows = rows.filter((row) => !row.present);
    }

    return sortStudentRows(rows, sortBy);
  }, [scopedRows, classRoster, search, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  // Don't clamp while loading — empty roster would force page 1 and wipe a restored page.
  const safePage = loading ? page : Math.min(page, totalPages);
  const listTopRef = useScrollIntoViewOnChange<HTMLDivElement>(safePage);
  const studentRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  useEffect(() => {
    if (loading) return;
    if (page !== safePage) setPage(safePage);
  }, [loading, page, safePage]);

  // After roster loads, put the focused student on the correct page before scrolling.
  useEffect(() => {
    if (loading) return;
    const focusId = pendingScrollRestore.current?.focusStudentId;
    if (!focusId || filteredRows.length === 0) return;
    const idx = filteredRows.findIndex((row) => row.student.id === focusId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (page !== targetPage) setPage(targetPage);
  }, [loading, filteredRows, page]);

  useEffect(() => {
    const pending = pendingScrollRestore.current;
    if (!pending || loading) return;

    const focusId = pending.focusStudentId;
    if (focusId) {
      const onPage = studentRows.some((row) => row.student.id === focusId);
      if (!onPage) return;
    }

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const stillPending = pendingScrollRestore.current;
        if (!stillPending) return;

        const flashRow = (studentId: string) => {
          setHighlightStudentId(studentId);
          window.setTimeout(() => {
            setHighlightStudentId((current) => (current === studentId ? null : current));
          }, 1000);
        };

        if (focusId) {
          const nodes = document.querySelectorAll(
            `[data-student-id="${CSS.escape(focusId)}"]`,
          );
          for (const node of nodes) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.getClientRects().length === 0) continue;
            pendingScrollRestore.current = null;
            node.scrollIntoView({ block: "center", behavior: "auto" });
            flashRow(focusId);
            clearAttendanceReturn();
            return;
          }
          return;
        }

        pendingScrollRestore.current = null;
        window.scrollTo({ top: stillPending.scrollY, behavior: "auto" });
        clearAttendanceReturn();
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [loading, studentRows]);

  const openProfile = (studentId: string) => {
    saveAttendanceReturn({
      path: attendancePathForRole(session?.role),
      selectedBranch,
      dateMode,
      filterDate,
      rangeFrom,
      rangeTo,
      classFilter,
      statusFilter,
      sortBy,
      search,
      page: safePage,
      scrollY: window.scrollY,
      focusStudentId: studentId,
    });
    navigate(studentProfilePath(session?.role, studentId), {
      state: { from: attendancePathForRole(session?.role) },
    });
  };

  const markPresent = async (student: Student) => {
    if (!session || isRange) return;
    const res = await markAttendanceForDate(student.id, filterDate, session.userId, student);
    if (res.ok) {
      toastSuccess(`${student.name} · ${formatReportDate(filterDate)}`, "Marked present");
      if (res.record) {
        setAttendance((prev) => [
          ...prev.filter((a) => !(a.studentId === student.id && a.date === filterDate)),
          res.record!,
        ]);
      } else {
        void reload();
      }
    } else {
      toastError(res.message, "Couldn't mark");
      void reload();
    }
  };

  const markAbsent = async (record: AttendanceRecord, studentName: string) => {
    if (isRange) return;
    const result = await Swal.fire({
      title: "Mark absent?",
      text: `Mark ${studentName} absent for ${formatReportDate(filterDate)}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Mark absent",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#7a9d96",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAttendance(record.id, record.branchId);
      setAttendance((prev) => prev.filter((a) => a.id !== record.id));
      toastSuccess("Attendance updated.", "Marked absent");
    } catch (e) {
      toastError(
        toUserMessage(e, "Couldn't update attendance. Please try again."),
        "Couldn't remove",
      );
      void reload();
    }
  };

  const bulkMarkClassPresent = async () => {
    if (!session || !branchId || classFilter === "all" || bulkBusy) return;
    const from = isRange ? range.from : filterDate;
    const to = isRange ? range.to : filterDate;
    const periodLabel = isRange
      ? formatDateRangeLabel(from, to)
      : formatReportDate(filterDate);
    const result = await Swal.fire({
      title: "Bulk mark class present?",
      text: isRange
        ? `Mark all students in class ${classFilter} present for every day in ${periodLabel}? Existing present days are skipped. This is a bulk action for the whole class.`
        : `Mark all absent students in class ${classFilter} present for ${periodLabel}? (${absentTotal} absent). This is a bulk action for the whole class.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Bulk mark present",
      confirmButtonColor: "#00303f",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setBulkBusy(true);
    try {
      const res = await markAttendanceBulkForClassDate({
        branchId,
        className: classFilter,
        from,
        to,
        markedById: session.userId,
      });
      if (res.ok) {
        toastSuccess(res.message, "Bulk present");
        void reload();
      } else {
        toastError(res.message, "Couldn't mark");
        void reload();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMarkClassAbsent = async () => {
    if (!session || !branchId || classFilter === "all" || bulkBusy) return;
    const from = isRange ? range.from : filterDate;
    const to = isRange ? range.to : filterDate;
    const periodLabel = isRange
      ? formatDateRangeLabel(from, to)
      : formatReportDate(filterDate);
    const result = await Swal.fire({
      title: "Bulk mark class absent?",
      text: isRange
        ? `Clear all attendance for class ${classFilter} across ${periodLabel}? This is a bulk action for the whole class.`
        : `Remove attendance for all present students in class ${classFilter} on ${periodLabel}? (${presentTotal} present). This is a bulk action for the whole class.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Bulk mark absent",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setBulkBusy(true);
    try {
      const res = await clearAttendanceBulkForClassDate({
        branchId,
        className: classFilter,
        from,
        to,
      });
      if (res.ok) {
        toastSuccess(res.message, "Bulk absent");
        void reload();
      } else {
        toastError(res.message, "Couldn't update");
        void reload();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  if (!branchId) {
    return (
      <p className="text-sm text-mist">
        {isAdmin
          ? "Add a branch first to manage attendance."
          : "No branch assigned to your account. Ask admin to assign your branch."}
      </p>
    );
  }

  const branchLabel = getBranch(branchId)?.name ?? "Branch";
  const dateLabel = isRange
    ? formatDateRangeLabel(range.from, range.to)
    : formatReportDate(filterDate);
  const emptyMessage = search.trim()
    ? "No students match your search."
    : statusFilter !== "all" && scopedRows.length > 0
      ? statusFilter === "present"
        ? isRange
          ? "No students attended in the selected range."
          : "No students are marked present."
        : isRange
          ? "No students were absent for the entire selected range."
          : "No students are marked absent."
      : classFilter !== "all"
        ? `No active students in class ${classFilter}.`
        : "No active students in this branch.";

  const switchToRange = () => {
    setRangeFrom(filterDate);
    setRangeTo(filterDate);
    setDateMode("range");
  };

  const switchToSingle = () => {
    setFilterDate(range.to || todayKey());
    setDateMode("single");
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={
          isAdmin
            ? "See who was present, open student profiles, and mark or remove attendance"
            : `${branchLabel} — mark present or view student attendance history`
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && (
            <Select
              label="Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          <Select
            label="Date mode"
            value={dateMode}
            onChange={(e) => {
              const next = e.target.value as "single" | "range";
              if (next === "range") switchToRange();
              else switchToSingle();
            }}
            options={[
              { value: "single", label: "Single day" },
              { value: "range", label: "Date range" },
            ]}
          />
          <Select
            label="Class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            options={[
              { value: "all", label: "All classes" },
              ...CLASS_OPTIONS,
            ]}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            options={SORT_OPTIONS}
          />
        </div>

        <div className="mt-4">
          <StudentSearchField
            value={search}
            onChange={setSearch}
            branchId={branchId}
            placeholder="Name, phone, roll number, or QR code"
          />
        </div>

        <div className="mt-4">
          {isRange ? (
            <DateRangeFields
              from={rangeFrom}
              to={rangeTo}
              onFromChange={(value) => setRangeFrom(value || todayKey())}
              onToChange={(value) => setRangeTo(value || todayKey())}
            />
          ) : (
            <Input
              label="Attendance date"
              type="date"
              value={filterDate}
              max={todayKey()}
              onChange={(e) => setFilterDate(e.target.value)}
              wrapperClassName="max-w-xs"
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-morning pt-4 text-sm">
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {totalStudents} students
          </span>
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {presentTotal} {isRange ? "attended" : "present"}
          </span>
          <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
            {absentTotal} {isRange ? "none" : "absent"}
          </span>
          {(search.trim() || statusFilter !== "all") && (
            <span className="rounded-full bg-morning/40 px-3 py-1 text-cerulean">
              {filteredRows.length} shown
            </span>
          )}
          <span className="text-mist">{dateLabel}</span>
          {loading && <span className="text-mist">Loading…</span>}
        </div>

        <div className="mt-4 rounded border border-morning bg-morning/20 p-3 sm:p-4">
          <div className="mb-2">
            <p className="text-sm font-semibold text-cerulean">Bulk attendance</p>
            <p className="text-xs text-mist">
              {classFilter === "all"
                ? `Select a class above to mark the whole class present or absent ${isRange ? "for every day in this range" : "for this date"}.`
                : isRange
                  ? `Applies to every student in class ${classFilter} across ${dateLabel} (${rangeDayCount} day${rangeDayCount === 1 ? "" : "s"}).`
                  : `Applies to every student in class ${classFilter} on ${dateLabel}.`}
            </p>
          </div>
          {classFilter !== "all" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={
                  bulkBusy ||
                  loading ||
                  (isRange
                    ? scopedRows.every((r) => r.daysPresent >= rangeDayCount)
                    : absentTotal === 0)
                }
                onClick={() => void bulkMarkClassPresent()}
              >
                {bulkBusy
                  ? "Working…"
                  : `Bulk mark class ${classFilter} present`}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={bulkBusy || loading || presentTotal === 0}
                onClick={() => void bulkMarkClassAbsent()}
              >
                Bulk mark class {classFilter} absent
              </Button>
            </div>
          )}
        </div>
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
      </Card>

      <div ref={listTopRef} className="scroll-mt-20">
        <div className="space-y-3 md:hidden">
          {studentRows.map(({ student, record, present, daysPresent }) => (
            <div key={student.id} data-student-id={student.id}>
            <CardRow
              className={
                highlightStudentId === student.id ? "attendance-row-flash" : undefined
              }
              actions={
                <div className="flex w-full flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => openProfile(student.id)}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setRangeStudent(student)}
                  >
                    Range
                  </Button>
                  {!isRange &&
                    (present && record ? (
                      <Button
                        variant="danger"
                        size="sm"
                        className="w-full"
                        onClick={() => void markAbsent(record, student.name)}
                      >
                        Absent
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => void markPresent(student)}
                      >
                        Present
                      </Button>
                    ))}
                </div>
              }
            >
              <div className="flex gap-3">
                <StudentPhoto student={student} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-cerulean">{student.name}</p>
                  <p className="text-sm text-mist">
                    Roll {student.rollNumber} · Class {student.class}
                  </p>
                  {present && record && !isRange ? (
                    <p className="mt-1 text-xs text-mist">
                      {formatTime(record.markedAt)} · {getMarkedByName(record.markedById)}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    {isRange ? (
                      <Badge tone={daysPresent > 0 ? "success" : "neutral"}>
                        {daysPresent}/{rangeDayCount} days
                      </Badge>
                    ) : present ? (
                      <Badge tone="success">Present</Badge>
                    ) : (
                      <Badge tone="neutral">Absent</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardRow>
            </div>
          ))}
          {!loading && studentRows.length === 0 && (
            <p className="text-sm text-mist">{emptyMessage}</p>
          )}
        </div>

        <Card padding="sm" className="hidden md:block">
          <TableWrap>
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-morning">
                  <th className={tableHeadCell}>Student</th>
                  <th className={tableHeadCell}>Roll</th>
                  <th className={tableHeadCell}>Class</th>
                  <th className={tableHeadCell}>Status</th>
                  <th className={tableHeadCell}>{isRange ? "Last check-in" : "Checked in"}</th>
                  <th className={tableHeadCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map(({ student, record, present, daysPresent }) => (
                  <tr
                    key={student.id}
                    data-student-id={student.id}
                    className={`border-b border-morning last:border-0${
                      highlightStudentId === student.id ? " attendance-row-flash" : ""
                    }`}
                  >
                    <td className={tableCell}>
                      <div className="flex items-center gap-3">
                        <StudentPhoto student={student} size="sm" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className={tableCellMuted}>{student.rollNumber}</td>
                    <td className={tableCell}>{student.class}</td>
                    <td className={tableCell}>
                      {isRange ? (
                        <Badge tone={daysPresent > 0 ? "success" : "neutral"}>
                          {daysPresent}/{rangeDayCount} days
                        </Badge>
                      ) : present ? (
                        <Badge tone="success">Present</Badge>
                      ) : (
                        <Badge tone="neutral">Absent</Badge>
                      )}
                    </td>
                    <td className={tableCellMuted}>
                      {present && record
                        ? `${isRange ? `${formatReportDate(record.date)} · ` : ""}${formatTime(record.markedAt)} · ${getMarkedByName(record.markedById)}`
                        : "—"}
                    </td>
                    <td className={`${tableActionsCell} text-left`}>
                      <div className="inline-flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-[5.5rem] shrink-0 gap-1"
                          onClick={() => openProfile(student.id)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          Profile
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-[5.5rem] shrink-0"
                          onClick={() => setRangeStudent(student)}
                        >
                          Range
                        </Button>
                        {!isRange &&
                          (present && record ? (
                            <Button
                              variant="danger"
                              size="sm"
                              className="w-[5.5rem] shrink-0"
                              onClick={() => void markAbsent(record, student.name)}
                            >
                              Absent
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-[5.5rem] shrink-0"
                              onClick={() => void markPresent(student)}
                            >
                              Present
                            </Button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          {!loading && studentRows.length === 0 && (
            <p className="text-sm text-mist">{emptyMessage}</p>
          )}
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-mist">
            Page {safePage} of {totalPages}
            {filteredRows.length > 0 && (
              <>
                {" "}
                · showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of{" "}
                {filteredRows.length}
              </>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <MarkPresentRangeDialog
        open={rangeStudent !== null}
        student={rangeStudent}
        onClose={() => setRangeStudent(null)}
        onChanged={() => void reload()}
      />
    </div>
  );
}
