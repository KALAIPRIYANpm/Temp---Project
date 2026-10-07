import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { Card, CardRow } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { RollNumberInput } from "../../components/ui/RollNumberInput";
import { StudentSearchField } from "../../components/StudentSearchField";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormActions, FormStack } from "../../components/ui/FormStack";
import {
  TableWrap,
  tableActionsCell,
  tableCell,
  tableCellMuted,
  tableHeadCell,
} from "../../components/ui/TableWrap";
import { PhotoUpload } from "../../components/PhotoUpload";
import { StudentPhoto } from "../../components/StudentPhoto";
import { StudentActionIcons } from "../../components/StudentActionIcons";
import { StudentDetailsModal } from "../../components/StudentDetailsModal";
import {
  formatGender,
  formatMedium,
  GENDER_OPTIONS,
  CLASS_OPTIONS,
  MEDIUM_OPTIONS,
  normalizeStudentName,
  parseStudentClass,
} from "../../lib/student";
import { schoolSelectOptions } from "../../lib/belgaumSchools";
import { sanitizeRollNumber, hasFormErrors } from "../../lib/validation";
import { toastRollNumberInUse, validateStudentFormAsync } from "../../lib/studentFormValidation";
import { toUserMessage } from "../../lib/userError";
import { useFormValidation } from "../../hooks/useFormValidation";
import { usePagedStudents } from "../../hooks/usePagedStudents";
import { useScrollIntoViewOnChange } from "../../hooks/useScrollIntoViewOnChange";
import type { Gender, Medium, Student } from "../../types";

export function AdminStudents() {
  const navigate = useNavigate();
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);

  const [filterBranch, setFilterBranch] = useState(() => branches[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
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
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [photo, setPhoto] = useState<string | undefined>();
  const { errors, clearField, clearAll, setFieldErrors } = useFormValidation<
    "name" | "rollNumber" | "studentClass" | "medium" | "phone" | "branchId"
  >();

  useEffect(() => {
    if (!filterBranch && branches[0]?.id) {
      setFilterBranch(branches[0].id);
    }
  }, [branches, filterBranch]);

  useEffect(() => {
    setPage(1);
  }, [search, filterBranch]);

  const { students, total, totalPages, loading, error, presentTodayIds, reload } =
    usePagedStudents({
      branchId: filterBranch || undefined,
      search,
      page,
      enabled: Boolean(filterBranch),
    });
  const listTopRef = useScrollIntoViewOnChange<HTMLDivElement>(page, { busy: loading });

  const openQr = (studentId: string) => {
    navigate(`/admin/students/${studentId}/qr`);
  };

  const resetForm = () => {
    setName("");
    setRollNumber("");
    setStudentClass("");
    setGender("na");
    setMedium("na");
    setLanguage("");
    setSchoolName("");
    setPhone("");
    setAddress("");
    setBranchId(filterBranch || branches[0]?.id || "");
    setPhoto(undefined);
    setEditing(null);
    clearAll();
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openView = (s: Student) => {
    setViewing(s);
  };

  const closeView = () => {
    setViewing(null);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setName(s.name);
    setRollNumber(sanitizeRollNumber(s.rollNumber));
    setStudentClass(parseStudentClass(s.class));
    setGender(s.gender);
    setMedium(s.medium);
    setLanguage(s.language);
    setSchoolName(s.schoolName);
    setPhone(s.phone);
    setAddress(s.address);
    setBranchId(s.branchId);
    setPhoto(s.photo);
    clearAll();
    setFormOpen(true);
  };

  const save = async () => {
    const formErrors = await validateStudentFormAsync(
      { name, rollNumber, studentClass, medium, phone, branchId },
      { excludeStudentId: editing?.id },
    );
    if (hasFormErrors(formErrors)) {
      setFieldErrors(formErrors);
      return;
    }
    try {
      if (editing) {
        await updateStudent(editing.id, {
          branchId,
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
        closeForm();
        reload();
      } else {
        const student = await addStudent({
          branchId,
          name: normalizeStudentName(name),
          rollNumber: sanitizeRollNumber(rollNumber),
          class: studentClass.trim(),
          gender,
          medium,
          language: language.trim(),
          schoolName: schoolName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          photo,
        });
        closeForm();
        reload();
        navigate(`/admin/students/${student.id}/qr`);
      }
    } catch (e) {
      toastRollNumberInUse(toUserMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteStudent(deleting.id);
      setDeleting(null);
      reload();
    } catch {
      /* store sets actionError */
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        subtitle={
          filterBranch
            ? `${getBranch(filterBranch)?.name ?? "Branch"}${total ? ` · ${total} students` : ""}`
            : undefined
        }
        action={
          branches.length > 0 ? (
            <Button onClick={openAdd}>Add student</Button>
          ) : (
            <Link to="/admin/branches">
              <Button>Add branch first</Button>
            </Link>
          )
        }
      />

      {branches.length > 0 && (
        <Select
          label="Filter by branch"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
        />
      )}

      <StudentSearchField
        value={search}
        onChange={setSearch}
        branchId={filterBranch || undefined}
      />

      {loading && <p className="text-sm text-mist">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div ref={listTopRef} className="scroll-mt-20">
        <div className="space-y-3 md:hidden">
          {students.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              branchName={getBranch(s.branchId)?.name}
              present={presentTodayIds.has(s.id)}
              onView={() => openView(s)}
              onEdit={() => openEdit(s)}
              onQr={() => openQr(s.id)}
              onDelete={() => setDeleting(s)}
            />
          ))}
          {!loading && students.length === 0 && (
            <p className="text-sm text-mist">
              {search ? "No students match your search." : "No students found."}
            </p>
          )}
        </div>

        <Card padding="sm" className="hidden md:block">
          <TableWrap>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-morning">
                  <th className={`${tableHeadCell} text-center`}>Photo</th>
                  <th className={`${tableHeadCell} text-center`}>Roll</th>
                  <th className={`${tableHeadCell} text-center`}>Name</th>
                  <th className={`${tableHeadCell} text-center`}>Class</th>
                  <th className={`${tableHeadCell} text-center`}>Branch</th>
                  <th className={`${tableHeadCell} text-center`}>Phone</th>
                  <th className={`${tableHeadCell} text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    branchName={getBranch(s.branchId)?.name}
                    onView={() => openView(s)}
                    onEdit={() => openEdit(s)}
                    onQr={() => openQr(s.id)}
                    onDelete={() => setDeleting(s)}
                  />
                ))}
              </tbody>
            </table>
          </TableWrap>
          {!loading && students.length === 0 && (
            <p className="text-sm text-mist">
              {search ? "No students match your search." : "No students found."}
            </p>
          )}
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-mist">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit student" : "New student"}
        wide
        footer={
          <FormActions>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>
              {editing ? "Save changes" : "Create & show QR"}
            </Button>
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
          <Select
            label="Branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              clearField("branchId");
            }}
            error={errors.branchId}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </FormStack>
      </Modal>

      <StudentDetailsModal
        open={viewing !== null}
        onClose={closeView}
        student={viewing}
        branchName={viewing ? getBranch(viewing.branchId)?.name : undefined}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete student?"
        description={
          deleting ? (
            <>
              <p>
                You are about to permanently delete{" "}
                <span className="font-medium text-cerulean">{deleting.name}</span>
                {deleting.rollNumber ? (
                  <>
                    {" "}
                    (roll{" "}
                    <span className="font-medium text-cerulean">
                      {deleting.rollNumber}
                    </span>
                    )
                  </>
                ) : null}
                .
              </p>
              <p className="mt-2 font-medium text-red-600">This cannot be undone.</p>
            </>
          ) : null
        }
        confirming={deletingBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingBusy) setDeleting(null);
        }}
      />
    </div>
  );
}

function StudentCard({
  student,
  branchName,
  present,
  onView,
  onEdit,
  onQr,
  onDelete,
}: {
  student: Student;
  branchName?: string;
  present: boolean;
  onView: () => void;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
}) {
  return (
    <CardRow
      actions={
        <StudentActionIcons
          compact
          onView={onView}
          onEdit={onEdit}
          onQr={onQr}
          onDelete={onDelete}
        />
      }
    >
      <div className="flex gap-3">
        <StudentPhoto student={student} size="md" />
        <div className="min-w-0">
          <p className="font-medium text-cerulean">{student.name}</p>
          <p className="text-sm text-mist">Roll: {student.rollNumber} · Class: {student.class}</p>
          <p className="text-sm text-mist">Medium: {formatMedium(student.medium)}</p>
          {student.language && (
            <p className="text-sm text-mist">Language: {student.language}</p>
          )}
          {student.schoolName && (
            <p className="text-sm text-mist">School: {student.schoolName}</p>
          )}
          {student.phone && <p className="text-sm text-mist">Phone: {student.phone}</p>}
          {student.address && <p className="text-sm text-mist">Address: {student.address}</p>}
          <p className="text-sm text-mist">Gender: {formatGender(student.gender)}</p>
          <p className="text-sm text-mist">Branch: {branchName}</p>
          <div className="mt-2">
            {present ? <Badge tone="success">Present</Badge> : <Badge tone="neutral">Absent</Badge>}
          </div>
        </div>
      </div>
    </CardRow>
  );
}

function StudentRow({
  student,
  branchName,
  onView,
  onEdit,
  onQr,
  onDelete,
}: {
  student: Student;
  branchName?: string;
  onView: () => void;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-morning last:border-0">
      <td className={`${tableCell} text-center`}>
        <div className="flex justify-center">
          <StudentPhoto student={student} size="sm" />
        </div>
      </td>
      <td className={`${tableCellMuted} text-center`}>{student.rollNumber}</td>
      <td className={`${tableCell} text-center`}>{student.name}</td>
      <td className={`${tableCell} text-center`}>{student.class}</td>
      <td className={`${tableCellMuted} text-center`}>{branchName}</td>
      <td className={`${tableCellMuted} text-center`}>{student.phone || "—"}</td>
      <td className={`${tableActionsCell} text-center`}>
        <div className="inline-flex justify-center">
          <StudentActionIcons
            compact
            onView={onView}
            onEdit={onEdit}
            onQr={onQr}
            onDelete={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}
