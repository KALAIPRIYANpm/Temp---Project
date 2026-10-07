import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { Button } from "../components/ui/Button";
import { CardRow } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { RollNumberInput } from "../components/ui/RollNumberInput";
import { StudentSearchField } from "../components/StudentSearchField";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { FormActions, FormStack } from "../components/ui/FormStack";
import { PhotoUpload } from "../components/PhotoUpload";
import { StudentPhoto } from "../components/StudentPhoto";
import { StudentActionIcons } from "../components/StudentActionIcons";
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
import { usePagedStudents } from "../hooks/usePagedStudents";
import { useScrollIntoViewOnChange } from "../hooks/useScrollIntoViewOnChange";
import type { Gender, Medium, Student } from "../types";

type BranchStudentsBasePath = "/manager" | "/user";

export function BranchStudentsPage({ basePath }: { basePath: BranchStudentsBasePath }) {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const getBranch = useStore((s) => s.getBranch);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const deleteStudent = useStore((s) => s.deleteStudent);

  const branchId = session?.branchId ?? "";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
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
  const [photo, setPhoto] = useState<string | undefined>();
  const { errors, clearField, clearAll, setFieldErrors } = useFormValidation<
    "name" | "rollNumber" | "studentClass" | "medium" | "phone"
  >();

  useEffect(() => {
    setPage(1);
  }, [search, branchId]);

  const { students, total, totalPages, loading, error, presentTodayIds, reload } =
    usePagedStudents({ branchId, search, page });
  const listTopRef = useScrollIntoViewOnChange<HTMLDivElement>(page, { busy: loading });

  const openQr = (studentId: string) => {
    navigate(`${basePath}/students/${studentId}/qr`);
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
        navigate(`${basePath}/students/${student.id}/qr`);
      }
    } catch (e) {
      toastRollNumberInUse(toUserMessage(e));
    }
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch.
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${getBranch(branchId)?.name ?? "Branch"}${total ? ` · ${total} students` : ""}`}
        action={
          <Button onClick={openAdd} disabled={!branchId}>
            Add student
          </Button>
        }
      />

      <StudentSearchField
        value={search}
        onChange={setSearch}
        branchId={branchId}
      />

      {loading && <p className="text-sm text-mist">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div ref={listTopRef} className="scroll-mt-20 space-y-3">
        {students.map((s) => (
          <CardRow
            key={s.id}
            actions={
              <StudentActionIcons
                compact
                onEdit={() => openEdit(s)}
                onQr={() => openQr(s.id)}
                onDelete={() => setDeleting(s)}
              />
            }
          >
            <div className="flex gap-3">
              <StudentPhoto student={s} size="md" />
              <div className="min-w-0">
                <p className="font-medium text-cerulean">{s.name}</p>
                <p className="text-sm text-mist">
                  Roll: {s.rollNumber} · Class: {s.class}
                </p>
                <p className="text-sm text-mist">Medium: {formatMedium(s.medium)}</p>
                {s.language && (
                  <p className="text-sm text-mist">Language: {s.language}</p>
                )}
                {s.schoolName && (
                  <p className="text-sm text-mist">School: {s.schoolName}</p>
                )}
                {s.phone && <p className="text-sm text-mist">Phone: {s.phone}</p>}
                {s.address && <p className="text-sm text-mist">Address: {s.address}</p>}
                <p className="text-sm text-mist">Gender: {formatGender(s.gender)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!s.active && <Badge tone="neutral">Inactive</Badge>}
                  {presentTodayIds.has(s.id) ? (
                    <Badge tone="success">Present today</Badge>
                  ) : (
                    <Badge tone="neutral">Not checked in</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardRow>
        ))}
        {!loading && students.length === 0 && (
          <p className="text-sm text-mist">
            {search ? "No students match your search." : "No students in your branch yet."}
          </p>
        )}
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
          <p className="text-sm text-mist">
            Branch: <span className="font-medium text-cerulean">{getBranch(branchId)?.name}</span>
          </p>
        </FormStack>
      </Modal>

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
