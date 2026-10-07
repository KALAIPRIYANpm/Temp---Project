import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toastError, toastInfo, toastSuccess } from "../lib/toast";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../store/useStore";
import { canAccessBranch } from "../lib/branchAccess";
import { formatReportDate } from "../lib/attendanceReport";
import {
  hasAttendanceReturn,
  type StudentProfileLocationState,
} from "../lib/attendanceReturn";
import { todayKey } from "../lib/dates";
import { calendarDaysForMonth, parseDateKey, toDateKey } from "../lib/reportRanges";
import {
  formatGender,
  formatMedium,
  GENDER_OPTIONS,
  CLASS_OPTIONS,
  MEDIUM_OPTIONS,
  normalizeStudentName,
  parseStudentClass,
} from "../lib/student";
import { schoolSelectOptions } from "../lib/belgaumSchools";
import { sanitizeRollNumber, hasFormErrors } from "../lib/validation";
import { toastRollNumberInUse, validateStudentFormAsync } from "../lib/studentFormValidation";
import { toUserMessage } from "../lib/userError";
import { useFormValidation } from "../hooks/useFormValidation";
import {
  getAttendanceForStudentDate,
  getStudentById,
  listAttendanceForStudent,
} from "../lib/db";
import { StudentPhoto } from "../components/StudentPhoto";
import { StudentActionIcons } from "../components/StudentActionIcons";
import { StudentAttendanceCalendar } from "../components/StudentAttendanceCalendar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { RollNumberInput } from "../components/ui/RollNumberInput";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FormActions, FormStack } from "../components/ui/FormStack";
import { PhotoUpload } from "../components/PhotoUpload";
import { MarkPresentRangeDialog } from "../components/MarkPresentRangeDialog";
import type { AttendanceRecord, Gender, Medium, Student } from "../types";

function resolveStudentsBase(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/students";
  if (pathname.startsWith("/user")) return "/user/students";
  return "/manager/students";
}

function resolveAttendanceBase(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/attendance";
  if (pathname.startsWith("/user")) return "/user/attendance";
  return "/manager/attendance";
}

function resolveBackTarget(
  pathname: string,
  state: StudentProfileLocationState | null,
): { to: string; label: string } {
  const from = state?.from;
  if (typeof from === "string" && from.includes("/attendance")) {
    return { to: from, label: "Back to attendance" };
  }
  if (hasAttendanceReturn()) {
    return { to: resolveAttendanceBase(pathname), label: "Back to attendance" };
  }
  const studentsBase = resolveStudentsBase(pathname);
  return { to: studentsBase, label: "Back to students" };
}

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const getBranch = useStore((s) => s.getBranch);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);
  const markAttendanceForDate = useStore((s) => s.markAttendanceForDate);
  const deleteAttendance = useStore((s) => s.deleteAttendance);

  const studentsBase = resolveStudentsBase(location.pathname);
  const backTarget = resolveBackTarget(
    location.pathname,
    (location.state as StudentProfileLocationState | null) ?? null,
  );

  const [student, setStudent] = useState<Student | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [presentToday, setPresentToday] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [gender, setGender] = useState<Gender>("na");
  const [medium, setMedium] = useState<Medium>("na");
  const [language, setLanguage] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const { errors, clearField, clearAll, setFieldErrors } = useFormValidation<
    "name" | "rollNumber" | "studentClass" | "medium" | "phone"
  >();

  const monthRange = useMemo(() => {
    const days = calendarDaysForMonth(visibleMonth);
    return {
      from: toDateKey(days[0]!),
      to: toDateKey(days[days.length - 1]!),
    };
  }, [visibleMonth]);

  const reloadStudent = useCallback(async (id: string) => {
    const row = await getStudentById(id);
    if (!row) {
      setStudent(null);
      setLoadState("missing");
      return null;
    }
    setStudent(row);
    setLoadState("ready");
    return row;
  }, []);

  const reloadAttendance = useCallback(
    async (id: string, from: string, to: string) => {
      const [monthRecords, todayRecord] = await Promise.all([
        listAttendanceForStudent(id, { from, to }),
        getAttendanceForStudentDate(id, todayKey()),
      ]);
      setAttendance(monthRecords);
      setPresentToday(Boolean(todayRecord));
    },
    [],
  );

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

  useEffect(() => {
    if (!studentId || loadState !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const [monthRecords, todayRecord] = await Promise.all([
          listAttendanceForStudent(studentId, {
            from: monthRange.from,
            to: monthRange.to,
          }),
          getAttendanceForStudentDate(studentId, todayKey()),
        ]);
        if (cancelled) return;
        setAttendance(monthRecords);
        setPresentToday(Boolean(todayRecord));
      } catch {
        if (!cancelled) {
          setAttendance([]);
          setPresentToday(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, loadState, monthRange.from, monthRange.to]);

  if (loadState === "loading") {
    return <p className="text-sm text-mist">Loading student…</p>;
  }

  if (!studentId || loadState === "missing" || !student) {
    return <Navigate to={studentsBase} replace />;
  }

  if (session && !canAccessBranch(session, student.branchId)) {
    return <Navigate to={studentsBase} replace />;
  }

  const openEdit = () => {
    setName(student.name);
    setRollNumber(sanitizeRollNumber(student.rollNumber));
    setStudentClass(parseStudentClass(student.class));
    setGender(student.gender);
    setMedium(student.medium);
    setLanguage(student.language);
    setSchoolName(student.schoolName);
    setPhone(student.phone);
    setAddress(student.address);
    setPhoto(student.photo);
    clearAll();
    setFormOpen(true);
  };

  const save = async () => {
    const formErrors = await validateStudentFormAsync(
      { name, rollNumber, studentClass, medium, phone },
      { excludeStudentId: student.id },
    );
    if (hasFormErrors(formErrors)) {
      setFieldErrors(formErrors);
      return;
    }
    try {
      await updateStudent(student.id, {
        branchId: student.branchId,
        name: normalizeStudentName(name),
        rollNumber: sanitizeRollNumber(rollNumber),
        class: studentClass.trim(),
        gender,
        medium,
        language: language.trim(),
        schoolName: schoolName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photo: photo || undefined,
      });
      setFormOpen(false);
      await reloadStudent(student.id);
    } catch (e) {
      toastRollNumberInUse(toUserMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!student) return;
    setDeletingBusy(true);
    try {
      await deleteStudent(student.id);
      setDeleteOpen(false);
      navigate(studentsBase);
    } catch {
      /* actionError */
    } finally {
      setDeletingBusy(false);
    }
  };

  const editAttendance = async (dateKey: string) => {
    if (!session) return;

    if (dateKey > todayKey()) {
      toastInfo("Future dates cannot be edited.", "Cannot edit");
      return;
    }

    const record = attendance.find(
      (a) => a.studentId === student.id && a.date === dateKey,
    );
    const dateLabel = formatReportDate(dateKey);

    if (record) {
      const result = await Swal.fire({
        title: dateLabel,
        text: `${student.name} is marked present. Change to absent?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Mark absent",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#7a9d96",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
      try {
        await deleteAttendance(record.id);
        toastSuccess("Marked absent.", "Updated");
        await reloadAttendance(student.id, monthRange.from, monthRange.to);
      } catch {
        toastError("Couldn't remove attendance. Please try again.", "Couldn't update");
      }
      return;
    }

    const result = await Swal.fire({
      title: dateLabel,
      text: `Mark ${student.name} as present?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Mark present",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#00303f",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const res = await markAttendanceForDate(student.id, dateKey, session.userId, student);
    if (res.ok) {
      toastSuccess(res.message, "Updated");
      await reloadAttendance(student.id, monthRange.from, monthRange.to);
    } else {
      toastError(res.message, "Couldn't update");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start gap-2 sm:gap-3">
        <Link
          to={backTarget.to}
          className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-morning bg-white text-cerulean hover:bg-morning/40"
          aria-label={backTarget.label}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
          <h1 className="truncate text-lg font-semibold text-cerulean sm:text-xl">
            Student profile
          </h1>
          <p className="truncate text-sm text-mist">{student.name}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StudentActionIcons
            compact
            onEdit={openEdit}
            onQr={() => navigate(`${studentsBase}/${student.id}/qr`)}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <StudentPhoto student={student} size="lg" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <p className="text-lg font-semibold text-cerulean">{student.name}</p>
            <p>
              <span className="text-mist">Roll:</span>{" "}
              <span className="font-medium text-cerulean">{student.rollNumber}</span>
            </p>
            <p>
              <span className="text-mist">Class:</span>{" "}
              <span className="text-cerulean">{student.class}</span>
            </p>
            <p>
              <span className="text-mist">Medium:</span>{" "}
              <span className="text-cerulean">{formatMedium(student.medium)}</span>
            </p>
            {student.language && (
              <p>
                <span className="text-mist">Language:</span>{" "}
                <span className="text-cerulean">{student.language}</span>
              </p>
            )}
            {student.schoolName && (
              <p>
                <span className="text-mist">School:</span>{" "}
                <span className="text-cerulean">{student.schoolName}</span>
              </p>
            )}
            {student.phone && (
              <p>
                <span className="text-mist">Phone:</span>{" "}
                <span className="text-cerulean">{student.phone}</span>
              </p>
            )}
            {student.address && (
              <p>
                <span className="text-mist">Address:</span>{" "}
                <span className="text-cerulean">{student.address}</span>
              </p>
            )}
            <p>
              <span className="text-mist">Gender:</span>{" "}
              <span className="text-cerulean">{formatGender(student.gender)}</span>
            </p>
            <p>
              <span className="text-mist">Branch:</span>{" "}
              <span className="text-cerulean">{getBranch(student.branchId)?.name ?? "—"}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!student.active && <Badge tone="neutral">Inactive</Badge>}
              {presentToday ? (
                <Badge tone="success">Present today</Badge>
              ) : (
                <Badge tone="neutral">Absent today</Badge>
              )}
            </div>
            {student.active && (
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRangeOpen(true)}
                >
                  Attendance by date range
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <StudentAttendanceCalendar
        studentId={student.id}
        attendance={attendance}
        visibleMonth={visibleMonth}
        onMonthChange={setVisibleMonth}
        selectedDateKey={selectedDateKey}
        onSelectDate={(key) => {
          setSelectedDateKey(key);
          setVisibleMonth(parseDateKey(key));
        }}
        onEditDate={(key) => {
          setSelectedDateKey(key);
          void editAttendance(key);
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Edit student"
        wide
        footer={
          <FormActions>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save changes</Button>
          </FormActions>
        }
      >
        <FormStack>
          <PhotoUpload name={name} photo={photo} onChange={setPhoto} />
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value.toUpperCase());
              clearField("name");
            }}
            error={errors.name}
            required
          />
          <RollNumberInput
            value={rollNumber}
            onChange={(value) => {
              setRollNumber(value);
              clearField("rollNumber");
            }}
            error={errors.rollNumber}
            required
          />
          <Select
            label="Class"
            value={studentClass}
            onChange={(e) => {
              setStudentClass(e.target.value);
              clearField("studentClass");
            }}
            error={errors.studentClass}
            options={[
              { value: "", label: "Select class" },
              ...CLASS_OPTIONS,
            ]}
          />
          <Select
            label="Medium"
            value={medium}
            onChange={(e) => {
              setMedium(e.target.value as Medium);
              clearField("medium");
            }}
            error={errors.medium}
            options={MEDIUM_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          />
          <Input
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
          <Select
            label="School name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            options={schoolSelectOptions(schoolName)}
          />
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearField("phone");
            }}
            error={errors.phone}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            options={GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
          />
        </FormStack>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete student?"
        description={
          <>
            <p>
              You are about to permanently delete{" "}
              <span className="font-medium text-cerulean">{student.name}</span>
              {student.rollNumber ? (
                <>
                  {" "}
                  (roll{" "}
                  <span className="font-medium text-cerulean">
                    {student.rollNumber}
                  </span>
                  )
                </>
              ) : null}
              .
            </p>
            <p className="mt-2 font-medium text-red-600">This cannot be undone.</p>
          </>
        }
        confirming={deletingBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingBusy) setDeleteOpen(false);
        }}
      />

      <MarkPresentRangeDialog
        open={rangeOpen}
        student={student}
        onClose={() => setRangeOpen(false)}
        onChanged={() => {
          void reloadAttendance(student.id, monthRange.from, monthRange.to);
          void (async () => {
            const todayRecord = await getAttendanceForStudentDate(
              student.id,
              todayKey(),
            );
            setPresentToday(Boolean(todayRecord));
          })();
        }}
      />
    </div>
  );
}
