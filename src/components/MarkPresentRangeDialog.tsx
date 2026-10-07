import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/useStore";
import { toastError, toastSuccess } from "../lib/toast";
import { todayKey } from "../lib/dates";
import {
  dateKeysInRange,
  formatDateRangeLabel,
  MAX_ATTENDANCE_RANGE_DAYS,
  normalizeDateRange,
} from "../lib/reportRanges";
import { DateRangeFields } from "./DateRangeFields";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { FormActions } from "./ui/FormStack";
import type { Student } from "../types";

type RangeAction = "present" | "absent";

interface MarkPresentRangeDialogProps {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  /** Called after a successful apply so parents can refresh. */
  onChanged?: () => void;
}

export function MarkPresentRangeDialog({
  open,
  student,
  onClose,
  onChanged,
}: MarkPresentRangeDialogProps) {
  const session = useStore((s) => s.session);
  const markAttendanceForDateRange = useStore((s) => s.markAttendanceForDateRange);
  const clearAttendanceInRange = useStore((s) => s.clearAttendanceInRange);

  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [action, setAction] = useState<RangeAction>("present");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = todayKey();
    setFrom(today);
    setTo(today);
    setAction("present");
    setBusy(false);
    setConfirmOpen(false);
  }, [open, student?.id]);

  const range = useMemo(() => normalizeDateRange(from, to), [from, to]);
  const dayCount = useMemo(
    () => dateKeysInRange(range.from, range.to).filter((d) => d <= todayKey()).length,
    [range.from, range.to],
  );
  const rangeTooLong = dayCount > MAX_ATTENDANCE_RANGE_DAYS;
  const rangeLabel = formatDateRangeLabel(range.from, range.to);
  const canApply = Boolean(student && dayCount > 0 && !rangeTooLong && !busy);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const apply = async () => {
    if (!student || !session || !canApply) return;

    setBusy(true);
    try {
      if (action === "present") {
        const res = await markAttendanceForDateRange(
          student.id,
          range.from,
          range.to,
          session.userId,
          student,
        );
        if (!res.ok) {
          toastError(res.message, "Couldn't mark present");
          return;
        }
        toastSuccess(res.message, "Marked present");
      } else {
        const res = await clearAttendanceInRange(
          student.id,
          range.from,
          range.to,
          student,
        );
        if (!res.ok) {
          toastError(res.message, "Couldn't mark absent");
          return;
        }
        toastSuccess(res.message, "Marked absent");
      }
      setConfirmOpen(false);
      onChanged?.();
      // Defer parent close so confirm unlock runs before the range modal unlocks.
      window.setTimeout(() => onClose(), 0);
    } finally {
      setBusy(false);
    }
  };

  if (!student) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title="Attendance for dates"
        footer={
          <FormActions>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={action === "absent" ? "danger" : "primary"}
              disabled={!canApply}
              onClick={() => {
                if (action === "absent") setConfirmOpen(true);
                else void apply();
              }}
            >
              {busy && action === "present" ? "Marking…" : "Apply"}
            </Button>
          </FormActions>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-morning bg-morning/20 px-4 py-3 text-sm">
            <p className="font-medium text-cerulean">{student.name}</p>
            <p className="mt-1 text-mist">
              Roll {student.rollNumber} · Class {student.class}
            </p>
          </div>

          <DateRangeFields
            from={from}
            to={to}
            onFromChange={(value) => setFrom(value || todayKey())}
            onToChange={(value) => setTo(value || todayKey())}
          />

          <Select
            label="Mark as"
            value={action}
            onChange={(e) => setAction(e.target.value as RangeAction)}
            options={[
              { value: "present", label: "Present" },
              { value: "absent", label: "Absent" },
            ]}
          />

          <p className="text-sm text-mist">
            {rangeTooLong
              ? `Too many days (max ${MAX_ATTENDANCE_RANGE_DAYS}). Narrow the range.`
              : dayCount === 0
                ? "Select a valid date range."
                : action === "present"
                  ? `Mark present for ${dayCount} day${dayCount === 1 ? "" : "s"}. Days already present are skipped.`
                  : `Mark absent for ${dayCount} day${dayCount === 1 ? "" : "s"}. Days already absent are skipped.`}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title={action === "present" ? "Mark present?" : "Mark absent?"}
        description={
          <>
            <p>
              Mark{" "}
              <span className="font-medium text-cerulean">{student.name}</span> as{" "}
              <span className="font-medium text-cerulean">
                {action === "present" ? "present" : "absent"}
              </span>{" "}
              for{" "}
              <span className="font-medium text-cerulean">{rangeLabel}</span>
              {" "}
              ({dayCount} day{dayCount === 1 ? "" : "s"})?
            </p>
          </>
        }
        confirmLabel={action === "present" ? "Mark present" : "Mark absent"}
        confirming={busy}
        confirmingLabel={action === "present" ? "Marking…" : "Updating…"}
        onConfirm={() => void apply()}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
      />
    </>
  );
}
