import type { Gender, Medium, Student } from "../types";
import { sanitizeRollNumber } from "./validation";
import { buildQrPayload, parseQrPayload } from "./qr";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "na", label: "NA" },
];

export function parseGender(value: string | undefined): Gender {
  if (value === "male" || value === "female" || value === "other" || value === "na") {
    return value;
  }
  return "na";
}

export const CLASS_OPTIONS = [
  ...Array.from({ length: 12 }, (_, i) => {
    const value = String(i + 1);
    return { value, label: `Class ${value}` };
  }),
  { value: "NA", label: "NA" },
];

/** Numeric class order (1…12), then NA, then other labels. */
export function compareClass(a: string, b: string): number {
  const normalize = (value: string) => value.trim();
  const left = normalize(a);
  const right = normalize(b);
  const leftNa = /^na$/i.test(left);
  const rightNa = /^na$/i.test(right);
  if (leftNa && rightNa) return 0;
  if (leftNa) return 1;
  if (rightNa) return -1;

  const na = Number.parseInt(left, 10);
  const nb = Number.parseInt(right, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export const MEDIUM_OPTIONS: { value: Medium; label: string }[] = [
  { value: "english", label: "English" },
  { value: "kannada", label: "Kannada" },
  { value: "marathi", label: "Marathi" },
  { value: "na", label: "NA" },
];

export function parseMedium(value: string | undefined): Medium {
  if (value === "english" || value === "kannada" || value === "marathi" || value === "na") {
    return value;
  }
  return "na";
}

export function formatMedium(medium: Medium): string {
  return MEDIUM_OPTIONS.find((m) => m.value === medium)?.label ?? medium;
}

export function normalizeLanguage(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.toLowerCase() === "na") return "";
  return trimmed;
}

/** Map stored class to 1–12 or NA when possible (handles legacy values like "10-A"). */
export function parseStudentClass(value: string): string {
  const trimmed = value.trim();
  if (/^na$/i.test(trimmed)) return "NA";
  if (/^(?:[1-9]|1[0-2])$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(?:[1-9]|1[0-2])(?!\d)/);
  return match?.[0] ?? "";
}

export function formatGender(gender: Gender): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
}

export function normalizeStudentName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") return trimmed || "—";
  return trimmed.toUpperCase();
}

export function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** Numeric-aware roll number comparison (2 before 10). */
export function compareRollNumber(a: string, b: string): number {
  const aTrim = a.trim();
  const bTrim = b.trim();
  const aNum = /^\d+$/.test(aTrim) ? Number(aTrim) : NaN;
  const bNum = /^\d+$/.test(bTrim) ? Number(bTrim) : NaN;
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
  return aTrim.localeCompare(bTrim, undefined, { numeric: true, sensitivity: "base" });
}

export function sortStudentsByRollNumber(students: Student[]): Student[] {
  return [...students].sort((a, b) => compareRollNumber(a.rollNumber, b.rollNumber));
}

export function findStudentByRollNumber(
  students: Student[],
  rollNumber: string,
): Student | undefined {
  const target = sanitizeRollNumber(rollNumber);
  if (!target) return undefined;
  return students.find((s) => sanitizeRollNumber(s.rollNumber) === target);
}

export function filterStudents(students: Student[], query: string): Student[] {
  const sorted = sortStudentsByRollNumber(students);
  const q = query.trim();
  if (!q) return sorted;

  const parsed = parseQrPayload(q);
  if (parsed) {
    return sorted.filter((s) => s.id === parsed.sid && s.qrToken === parsed.tok);
  }

  const lower = q.toLowerCase();
  return sorted.filter((s) => {
    const qrText = buildQrPayload(s).toLowerCase();
    return (
      s.name.toLowerCase().includes(lower) ||
      s.rollNumber.toLowerCase().includes(lower) ||
      s.phone.toLowerCase().includes(lower) ||
      s.schoolName.toLowerCase().includes(lower) ||
      s.address.toLowerCase().includes(lower) ||
      formatMedium(s.medium).toLowerCase().includes(lower) ||
      s.language.toLowerCase().includes(lower) ||
      s.qrToken.toLowerCase().includes(lower) ||
      s.id.toLowerCase().includes(lower) ||
      qrText.includes(lower)
    );
  });
}

export function normalizeStudentFields(student: Partial<Student> & { id: string }): Student {
  const raw = student as Student & { templeId?: string };
  const gender = parseGender(raw.gender);

  return {
    id: raw.id,
    branchId: raw.branchId ?? raw.templeId ?? "",
    name: normalizeStudentName(raw.name?.trim() || "—"),
    rollNumber: sanitizeRollNumber(raw.rollNumber?.trim() || "") || "—",
    class: raw.class?.trim() || "—",
    gender,
    medium: parseMedium(raw.medium),
    language: normalizeLanguage(raw.language),
    schoolName: raw.schoolName?.trim() || "",
    phone: raw.phone?.trim() || "",
    address: raw.address?.trim() || "",
    photo: raw.photo || undefined,
    qrToken: raw.qrToken ?? "",
    active: raw.active !== false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}
