import { Modal } from "./ui/Modal";
import { StudentPhoto } from "./StudentPhoto";
import { formatGender, formatMedium } from "../lib/student";
import type { Student } from "../types";

function Row({ label, value }: { label: string; value?: string }) {
  const display = value?.trim();
  if (!display) return null;

  return (
    <div className="flex gap-3 border-b border-morning/60 py-2.5 last:border-0">
      <span className="w-20 shrink-0 text-sm text-mist">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-medium text-cerulean">{display}</span>
    </div>
  );
}

export function StudentDetailsModal({
  open,
  onClose,
  student,
  branchName,
}: {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  branchName?: string;
}) {
  if (!student) return null;

  return (
    <Modal open={open} onClose={onClose} title="Student details">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <StudentPhoto student={student} size="lg" />
        <div className="min-w-0 w-full flex-1">
          <p className="text-lg font-semibold text-cerulean">{student.name}</p>
          <div className="mt-3">
            <Row label="Roll" value={student.rollNumber} />
            <Row label="Class" value={student.class} />
            <Row label="Medium" value={formatMedium(student.medium)} />
            <Row label="Language" value={student.language} />
            <Row label="School" value={student.schoolName} />
            <Row label="Phone" value={student.phone} />
            <Row label="Address" value={student.address} />
            <Row label="Gender" value={formatGender(student.gender)} />
            <Row label="Branch" value={branchName} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
