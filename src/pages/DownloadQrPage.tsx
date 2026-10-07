import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toastError, toastSuccess } from "../lib/toast";
import { useStore } from "../store/useStore";
import { downloadStudentQrPng, downloadStudentsQrZip } from "../lib/qrExport";
import { CLASS_OPTIONS, sortStudentsByRollNumber } from "../lib/student";
import { getStudentByRoll, listStudentsByBranch } from "../lib/db";
import { validateQrDownload } from "../lib/validation";
import { useFormValidation } from "../hooks/useFormValidation";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { RollNumberInput } from "../components/ui/RollNumberInput";
import type { Student, UserRole } from "../types";

type DownloadMode = "individual" | "branch" | "class";

const MODE_OPTIONS: { value: DownloadMode; label: string; hint: string }[] = [
  { value: "individual", label: "Individual", hint: "One student" },
  { value: "branch", label: "Branch", hint: "All students in a branch" },
  { value: "class", label: "Class", hint: "All students in a class" },
];

export function DownloadQrPage({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);

  const isAdmin = role === "admin";
  const scopedBranchId =
    role === "manager" || role === "user" ? session?.branchId : undefined;

  const [mode, setMode] = useState<DownloadMode>("individual");
  const [rollNumber, setRollNumber] = useState("");
  const [branchFilter, setBranchFilter] = useState(
    () => scopedBranchId ?? branches[0]?.id ?? "",
  );
  const [classFilter, setClassFilter] = useState("");
  const [branchStudents, setBranchStudents] = useState<Student[]>([]);
  const [matchedIndividualStudent, setMatchedIndividualStudent] = useState<Student | null>(
    null,
  );
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "student" | "branch" | "class"
  >();

  useEffect(() => {
    if (!branchFilter && branches[0]?.id) {
      setBranchFilter(branches[0].id);
    }
  }, [branches, branchFilter]);

  useEffect(() => {
    if (!branchFilter || (mode !== "branch" && mode !== "class")) {
      if (mode === "individual") return;
      setBranchStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    void (async () => {
      try {
        const rows = await listStudentsByBranch(branchFilter, { activeOnly: true });
        if (!cancelled) setBranchStudents(sortStudentsByRollNumber(rows));
      } catch {
        if (!cancelled) setBranchStudents([]);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchFilter, mode]);

  useEffect(() => {
    if (mode !== "individual") {
      setMatchedIndividualStudent(null);
      return;
    }
    const roll = rollNumber.trim();
    if (!roll || !branchFilter) {
      setMatchedIndividualStudent(null);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const student = await getStudentByRoll(roll, branchFilter);
          if (cancelled) return;
          setMatchedIndividualStudent(student?.active ? student : null);
        } catch {
          if (!cancelled) setMatchedIndividualStudent(null);
        } finally {
          if (!cancelled) setLookingUp(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, rollNumber, branchFilter]);

  const targetStudents = useMemo((): Student[] => {
    if (mode === "individual") {
      return matchedIndividualStudent ? [matchedIndividualStudent] : [];
    }
    if (mode === "branch") {
      if (!branchFilter) return [];
      return branchStudents;
    }
    if (!classFilter) return [];
    return branchStudents.filter((s) => s.class === classFilter);
  }, [mode, matchedIndividualStudent, branchFilter, classFilter, branchStudents]);

  const canDownload = targetStudents.length > 0 && !downloading && !loadingStudents;

  const downloadLabel =
    mode === "individual"
      ? "Download QR"
      : `Download ${targetStudents.length} QR${targetStudents.length === 1 ? "" : "s"} (ZIP)`;

  const handleDownload = async () => {
    if (
      !validate(() =>
        validateQrDownload(mode, {
          rollNumber,
          studentFound: Boolean(matchedIndividualStudent),
          branchFilter: branchFilter || "all",
          classFilter,
        }),
      )
    ) {
      return;
    }
    if (targetStudents.length === 0) return;

    setDownloading(true);
    try {
      const getBranchName = (id: string) => getBranch(id)?.name;

      if (mode === "individual" && targetStudents[0]) {
        await downloadStudentQrPng(targetStudents[0], getBranchName(targetStudents[0].branchId));
      } else {
        const branchPart =
          mode === "branch" && branchFilter
            ? getBranch(branchFilter)?.name?.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
            : mode === "class" && classFilter
              ? `class-${classFilter.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
              : "students";
        await downloadStudentsQrZip(
          targetStudents,
          getBranchName,
          `student-qrs-${branchPart ?? "export"}`,
        );
      }

      toastSuccess(
        mode === "individual"
          ? `${targetStudents[0]?.name} QR saved.`
          : `${targetStudents.length} QR codes saved in ZIP.`,
        "Download started",
      );
    } catch {
      toastError("Could not create QR files. Try again.", "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!isAdmin && !scopedBranchId) {
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch.
      </p>
    );
  }

  if (isAdmin && branches.length === 0) {
    return (
      <p className="text-sm text-mist">
        Add a branch before downloading student QR codes.
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Download QR"
        subtitle="Save student attendance QR codes as PNG or ZIP"
      />

      <Card>
        <p className="mb-3 text-sm font-medium text-cerulean">Download by</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODE_OPTIONS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setRollNumber("");
                setClassFilter("");
                clearAll();
              }}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                mode === value
                  ? "border-cerulean bg-cerulean text-white"
                  : "border-morning bg-white text-cerulean hover:bg-morning/30"
              }`}
            >
              <span className="block text-sm font-medium">{label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  mode === value ? "text-morning" : "text-mist"
                }`}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        {mode === "individual" && (
          <>
            {isAdmin && (
              <Select
                label="Branch"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setRollNumber("");
                  clearField("student");
                }}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <RollNumberInput
              value={rollNumber}
              onChange={(value) => {
                setRollNumber(value);
                clearField("student");
              }}
              error={errors.student}
            />
            {lookingUp && <p className="text-sm text-mist">Looking up…</p>}
            {matchedIndividualStudent && (
              <div className="rounded-lg border border-morning bg-white px-4 py-3 text-sm">
                <p className="font-medium text-cerulean">{matchedIndividualStudent.name}</p>
                <p className="mt-1 text-mist">
                  Roll {matchedIndividualStudent.rollNumber} · Class {matchedIndividualStudent.class}
                  {isAdmin && (
                    <> · {getBranch(matchedIndividualStudent.branchId)?.name ?? "—"}</>
                  )}
                </p>
              </div>
            )}
          </>
        )}

        {mode === "branch" && (
          <Select
            label="Branch"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              clearField("branch");
            }}
            error={errors.branch}
            options={
              isAdmin
                ? branches.map((b) => ({ value: b.id, label: b.name }))
                : [
                    {
                      value: scopedBranchId!,
                      label: getBranch(scopedBranchId!)?.name ?? "Your branch",
                    },
                  ]
            }
          />
        )}

        {mode === "class" && (
          <>
            {isAdmin && (
              <Select
                label="Branch"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setClassFilter("");
                }}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <Select
              label="Class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                clearField("class");
              }}
              error={errors.class}
              options={[
                { value: "", label: loadingStudents ? "Loading classes…" : "Select a class" },
                ...CLASS_OPTIONS,
              ]}
            />
          </>
        )}

        <div className="rounded-lg border border-morning bg-morning/20 px-4 py-3 text-sm text-cerulean">
          {loadingStudents && mode !== "individual" ? (
            <span className="text-mist">Loading students…</span>
          ) : targetStudents.length === 0 ? (
            <span className="text-mist">
              {mode === "individual"
                ? "Enter a roll number to find the student."
                : mode === "class" && classFilter
                  ? `Class ${classFilter} currently has no students in this branch.`
                  : "Select filters above to preview how many QR codes will download."}
            </span>
          ) : (
            <span>
              <strong>{targetStudents.length}</strong> student
              {targetStudents.length === 1 ? "" : "s"} ready
              {mode !== "individual" ? " · ZIP file" : " · PNG file"}
            </span>
          )}
        </div>

        <Button
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          disabled={!canDownload}
          onClick={() => void handleDownload()}
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? "Preparing…" : downloadLabel}
        </Button>
      </Card>
    </div>
  );
}
