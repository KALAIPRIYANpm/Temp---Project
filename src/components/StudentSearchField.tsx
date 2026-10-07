import { lazy, Suspense, useRef, useState } from "react";
import { toastError } from "../lib/toast";
import { ScanLine } from "lucide-react";
import type { QrScannerHandle } from "./QrScanner";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { getStudentByQr } from "../lib/db";
import { sanitizeRollNumber } from "../lib/validation";
import { toUserMessage } from "../lib/userError";

const LazyQrScanner = lazy(() =>
  import("./QrScanner").then((m) => ({ default: m.QrScanner })),
);

interface StudentSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Limit QR lookup to this branch (managers/users). */
  branchId?: string;
}

export function StudentSearchField({
  value,
  onChange,
  label = "Search",
  placeholder = "Name, phone, roll number, or QR code",
  branchId,
}: StudentSearchFieldProps) {
  const scannerRef = useRef<QrScannerHandle>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const closeScan = async () => {
    if (scannerRef.current?.isActive()) {
      await scannerRef.current.stop();
    }
    setScanOpen(false);
  };

  const handleScan = async ({ sid, tok }: { sid: string; tok: string }) => {
    try {
      const student = await getStudentByQr(sid, tok, branchId);
      if (!student) {
        toastError("This QR isn't linked to a student you can access.", "Student not found");
        return;
      }

      if (scannerRef.current?.isActive()) {
        await scannerRef.current.stop();
      }

      onChange(sanitizeRollNumber(student.rollNumber) || student.name);
      setScanOpen(false);
    } catch (e) {
      toastError(
        toUserMessage(e, "Couldn't find that student. Please try again."),
        "Couldn't look up",
      );
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-2 text-left">
        <span className="text-sm font-medium text-cerulean">{label}</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 gap-1.5 sm:w-auto"
            onClick={() => setScanOpen(true)}
          >
            <ScanLine className="h-4 w-4" aria-hidden />
            Scan QR
          </Button>
        </div>
      </div>

      <Modal
        open={scanOpen}
        onClose={() => void closeScan()}
        title="Scan student QR"
        wide
      >
        <p className="mb-4 text-sm text-mist">
          Point the camera at a student QR code to find them in the list.
        </p>
        <Suspense fallback={<p className="text-sm text-mist">Loading scanner…</p>}>
          <LazyQrScanner
            ref={scannerRef}
            onScan={(payload) => void handleScan(payload)}
            onInvalidScan={() =>
              toastError("Not a valid student QR from this app.", "Invalid QR")
            }
          />
        </Suspense>
      </Modal>
    </>
  );
}
