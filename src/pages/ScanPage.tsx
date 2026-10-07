import { useState } from "react";
import Swal from "sweetalert2";
import { useStore } from "../store/useStore";
import { toastError, toastSuccess, toastWarning } from "../lib/toast";
import { QrScanner } from "../components/QrScanner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { formatGender } from "../lib/student";
import { validateManualLookup } from "../lib/validation";
import { useFormValidation } from "../hooks/useFormValidation";
import { RollNumberInput } from "../components/ui/RollNumberInput";
import { getAttendanceForStudentDate, getStudentByQr, getStudentByRoll } from "../lib/db";
import { todayKey } from "../lib/dates";
import { toUserMessage } from "../lib/userError";
import type { Student } from "../types";

function studentAlertHtml(student: Student, branchName?: string, alreadyPresent?: boolean) {
  const fields: [string, string][] = [
    ["Roll", student.rollNumber],
    ["Class", student.class],
    ["Gender", formatGender(student.gender)],
  ];
  if (branchName) fields.push(["Branch", branchName]);

  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#7a9d96;font-size:14px">${label}</td><td style="padding:4px 0;font-size:14px;color:#00303f;font-weight:500">${value}</td></tr>`,
    )
    .join("");

  const presentNote = alreadyPresent
    ? `<p style="margin:12px 0 0;color:#92400e;font-size:13px">Already marked present today.</p>`
    : "";

  return `
    <div style="text-align:left;margin-top:8px">
      <table style="margin:0 auto">${rows}</table>
      ${presentNote}
    </div>
  `;
}

export function ScanPage() {
  const session = useStore((s) => s.session);
  const getBranch = useStore((s) => s.getBranch);
  const markAttendance = useStore((s) => s.markAttendance);

  const [manualId, setManualId] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const { errors, clearField, validate } = useFormValidation<"manualId">();

  const isBranchStaff = session?.role === "user" || session?.role === "manager";
  const scopeBranchId = isBranchStaff ? session?.branchId : undefined;

  if (isBranchStaff && !session?.branchId) {
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch before scanning.
      </p>
    );
  }

  const showStudentAlert = async (student: Student | null, invalidMessage?: string) => {
    if (!student) {
      toastError(invalidMessage ?? "Student not found or QR is invalid.", "Invalid QR");
      return;
    }

    if (!student.active) {
      toastWarning(`${student.name} is inactive and cannot be marked.`, "Inactive student");
      return;
    }

    // Keep camera running; `paused` blocks further scans while the dialog is open.
    // Same QR stays suppressed until it leaves the frame (see QrScanner).
    const branchName = getBranch(student.branchId)?.name;
    let alreadyPresent = false;
    try {
      alreadyPresent = Boolean(await getAttendanceForStudentDate(student.id, todayKey()));
    } catch {
      /* fall through; insert will catch duplicates */
    }

    const result = await Swal.fire({
      title: student.name,
      html: studentAlertHtml(student, branchName, alreadyPresent),
      icon: "info",
      showCancelButton: true,
      confirmButtonText: alreadyPresent ? "OK" : "Mark present",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#00303f",
      cancelButtonColor: "#7a9d96",
      reverseButtons: true,
      allowOutsideClick: false,
    });

    if (alreadyPresent || !result.isConfirmed || !session) {
      return;
    }

    try {
      const res = await markAttendance(student.id, session.userId, student);

      if (res.ok) {
        toastSuccess(res.message, "Present!");
      } else {
        toastError(res.message, "Couldn't mark");
      }
    } catch (e) {
      toastError(
        toUserMessage(e, "Couldn't mark attendance. Please try again."),
        "Couldn't mark",
      );
    }
  };

  const handleScan = (sid: string, tok: string) => {
    if (lookingUp) return;
    setLookingUp(true);
    void (async () => {
      try {
        const student = await getStudentByQr(sid, tok, scopeBranchId);
        await showStudentAlert(student);
      } catch (e) {
        toastError(
          toUserMessage(e, "Couldn't find that student. Please try again."),
          "Couldn't look up",
        );
      } finally {
        setLookingUp(false);
      }
    })();
  };

  const handleManualLookup = () => {
    if (!validate(() => {
      const err = validateManualLookup(manualId);
      return err ? { manualId: err } : {};
    })) {
      return;
    }
    const q = manualId.trim();
    setManualId("");
    clearField("manualId");
    if (lookingUp) return;
    setLookingUp(true);
    void (async () => {
      try {
        const student = await getStudentByRoll(q, scopeBranchId);
        await showStudentAlert(
          student,
          scopeBranchId
            ? "No student found with this roll number in your branch."
            : "No student found with this roll number.",
        );
      } catch (e) {
        toastError(
          toUserMessage(e, "Couldn't find that student. Please try again."),
          "Couldn't look up",
        );
      } finally {
        setLookingUp(false);
      }
    })();
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Scan attendance"
        subtitle={
          isBranchStaff
            ? `${getBranch(session!.branchId!)?.name ?? "Your branch"} — camera stays on for continuous check-in`
            : "Scan QR — camera stays on for continuous check-in"
        }
      />

      <Card className="!p-3 sm:!p-5">
        <QrScanner
          paused={lookingUp}
          onScan={({ sid, tok }) => handleScan(sid, tok)}
          onInvalidScan={() =>
            toastError("Not a valid student QR from this app.", "Invalid QR")
          }
        />
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-cerulean">Manual entry</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RollNumberInput
            label=""
            placeholder="Roll number"
            value={manualId}
            onChange={(value) => {
              setManualId(value);
              clearField("manualId");
            }}
            error={errors.manualId}
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            disabled={lookingUp}
            onClick={handleManualLookup}
          >
            {lookingUp ? "Looking up…" : "Find student"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
