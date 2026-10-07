import type { BranchInput } from "./branch";

export type FormErrors<T extends string> = Partial<Record<T, string>>;

export function hasFormErrors<T extends string>(errors: FormErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

const NAME_MIN = 2;
const NAME_MAX = 80;
const BRANCH_NAME_MAX = 100;
const EMAIL_MAX = 254;
const EMAIL_LOCAL_MAX = 64;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignores anything past 72 bytes
const ROLL_MAX_DIGITS = 10;
const MAP_MAX = 500;

/* ------------------------------------------------------------------ */
/* Generic                                                             */
/* ------------------------------------------------------------------ */

export function validateRequired(value: string, fieldLabel: string): string | undefined {
  if (!value.trim()) return `${fieldLabel} is required.`;
}

/** Collapses repeated whitespace so "Ravi   Kumar " and "Ravi Kumar" compare equal. */
export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (email.length > EMAIL_MAX) return `Email must be at most ${EMAIL_MAX} characters.`;
  if (/\s/.test(email)) return "Email cannot contain spaces.";
  const [local = "", domain = ""] = email.split("@");
  if (email.split("@").length !== 2 || !local || !domain) {
    return "Enter a valid email address.";
  }
  if (local.length > EMAIL_LOCAL_MAX) return "The part before @ is too long.";
  if (local.startsWith(".") || local.endsWith(".") || email.includes("..")) {
    return "Enter a valid email address.";
  }
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || /\d/.test(tld)) return "Enter a valid email address.";
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "admin123",
  "welcome1",
  "abc12345",
  "letmein123",
]);

export function validatePassword(value: string, minLength = PASSWORD_MIN): string | undefined {
  if (!value || !value.trim()) return "Password is required.";
  if (value !== value.trim()) return "Password cannot start or end with a space.";
  if (value.length < minLength) return `Password must be at least ${minLength} characters.`;
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[A-Za-z]/.test(value)) return "Password must include at least one letter.";
  if (!/\d/.test(value)) return "Password must include at least one number.";
  if (/^(.)\1+$/.test(value)) return "Password cannot be a single repeated character.";
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return "This password is too common. Choose a different one.";
  }
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

// Letters from any script (Kannada, Marathi/Devanagari, English...) + marks,
// spaces, dots, apostrophes and hyphens. No digits or symbols.
const PERSON_NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;

export function validateName(value: string): string | undefined {
  const name = normalizeSpaces(value);
  if (!name) return "Name is required.";
  if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
  if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
  if (/\d/.test(name)) return "Name cannot contain numbers.";
  if (!PERSON_NAME_RE.test(name)) {
    return "Name can only contain letters, spaces, dots, apostrophes and hyphens.";
  }
  if (!/[\p{L}]{2,}/u.test(name.replace(/[\s.'’-]/g, ""))) {
    return "Enter a valid name.";
  }
}

/* ------------------------------------------------------------------ */
/* Phone                                                               */
/* ------------------------------------------------------------------ */

/**
 * Optional phone number.
 * - Indian numbers: 10 digits starting 6-9, optional 0 / 91 / +91 prefix.
 * - International: must start with "+" and have 8-15 digits.
 */
export function validatePhoneOptional(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  if (!/^\+?[\d\s\-()]+$/.test(raw) || (raw.includes("+") && !raw.startsWith("+"))) {
    return "Phone number can only contain digits, spaces, + , - and brackets.";
  }

  const digits = raw.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(digits)) return "Enter a valid phone number.";

  if (raw.startsWith("+") && !raw.startsWith("+91")) {
    if (digits.length < 8 || digits.length > 15) return "Enter a valid phone number.";
    return undefined;
  }

  let national = digits;
  if (raw.startsWith("+91") || (national.length === 12 && national.startsWith("91"))) {
    national = national.slice(2);
  } else if (national.length === 11 && national.startsWith("0")) {
    national = national.slice(1);
  }
  if (national.length !== 10) return "Enter a valid 10-digit mobile number.";
  if (!/^[6-9]/.test(national)) return "Mobile number must start with 6, 7, 8 or 9.";
}

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/* ------------------------------------------------------------------ */
/* Roll number                                                         */
/* ------------------------------------------------------------------ */

export function sanitizeRollNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export const ROLL_NUMBER_IN_USE_MESSAGE =
  "This roll number is already assigned to another student.";

export function isRollNumberInUseMessage(message?: string | null): boolean {
  if (!message) return false;
  return /already assigned to another student|roll number is already in use/i.test(
    message,
  );
}

/** "007" and "7" are the same roll number. */
function canonicalRoll(value: string): string {
  return sanitizeRollNumber(value).replace(/^0+(?=\d)/, "");
}

export function validateRollNumber(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return "Roll number is required.";
  // Validate the raw input — sanitising first would silently hide "12ab".
  if (!/^\d+$/.test(raw)) return "Roll number must contain numbers only.";
  if (raw.length > ROLL_MAX_DIGITS) {
    return `Roll number must be at most ${ROLL_MAX_DIGITS} digits.`;
  }
  if (/^0+$/.test(raw)) return "Roll number must be greater than zero.";
}

export function validateRollNumberUnique(
  rollNumber: string,
  students: { id: string; rollNumber: string }[],
  excludeStudentId?: string,
): string | undefined {
  const formatErr = validateRollNumber(rollNumber);
  if (formatErr) return formatErr;

  const normalized = canonicalRoll(rollNumber);
  const duplicate = students.find(
    (s) => canonicalRoll(s.rollNumber) === normalized && s.id !== excludeStudentId,
  );
  if (duplicate) return ROLL_NUMBER_IN_USE_MESSAGE;
}

/* ------------------------------------------------------------------ */
/* Class / medium / branch                                             */
/* ------------------------------------------------------------------ */

export function validateClass(value: string): string | undefined {
  const cls = value.trim();
  if (!cls) return "Class is required.";
  if (/^na$/i.test(cls)) return undefined;
  if (!/^(?:[1-9]|1[0-2])$/.test(cls)) {
    return "Select a class from 1 to 12, or NA.";
  }
}

const MEDIUMS = ["english", "kannada", "marathi", "na"] as const;

export function validateMedium(value: string): string | undefined {
  if (!value.trim()) return "Medium is required.";
  if (!(MEDIUMS as readonly string[]).includes(value)) {
    return "Select English, Kannada, Marathi, or NA.";
  }
}

export function validateBranchSelection(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Branch is required.";
  if (v === "all") return "Select a specific branch.";
}

export function validateManualLookup(value: string): string | undefined {
  const err = validateRollNumber(value);
  if (!err) return undefined;
  return err === "Roll number is required." ? "Enter a roll number." : err;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export type LoginFormFields = "email" | "password";

export function validateLoginFields(
  email: string,
  password: string,
): FormErrors<LoginFormFields> {
  const errors: FormErrors<LoginFormFields> = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  // Login only checks presence/length so older, shorter passwords still work.
  if (!password.trim()) errors.password = "Password is required.";
  else if (password.length > PASSWORD_MAX) {
    errors.password = `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export type StudentFormFields =
  | "name"
  | "rollNumber"
  | "studentClass"
  | "medium"
  | "phone"
  | "branchId";

export function validateStudentFields(
  fields: {
    name: string;
    rollNumber: string;
    studentClass: string;
    medium: string;
    phone: string;
    branchId?: string;
  },
  options?: {
    students?: { id: string; rollNumber: string }[];
    excludeStudentId?: string;
  },
): FormErrors<StudentFormFields> {
  const errors: FormErrors<StudentFormFields> = {};
  const nameErr = validateName(fields.name);
  if (nameErr) errors.name = nameErr;
  const rollErr = options?.students
    ? validateRollNumberUnique(
        fields.rollNumber,
        options.students,
        options.excludeStudentId,
      )
    : validateRollNumber(fields.rollNumber);
  if (rollErr) errors.rollNumber = rollErr;
  const classErr = validateClass(fields.studentClass);
  if (classErr) errors.studentClass = classErr;
  const mediumErr = validateMedium(fields.medium);
  if (mediumErr) errors.medium = mediumErr;
  const phoneErr = validatePhoneOptional(fields.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (fields.branchId !== undefined) {
    const branchErr = validateBranchSelection(fields.branchId);
    if (branchErr) errors.branchId = branchErr;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* User                                                                */
/* ------------------------------------------------------------------ */

export type UserFormFields = "name" | "email" | "password" | "phone" | "branchId";

export function validateUserFields(
  fields: {
    name: string;
    email: string;
    password: string;
    phone: string;
    branchId?: string;
  },
  options: { requirePassword: boolean },
): FormErrors<UserFormFields> {
  const errors: FormErrors<UserFormFields> = {};
  const nameErr = validateName(fields.name);
  if (nameErr) errors.name = nameErr;
  const emailErr = validateEmail(fields.email);
  if (emailErr) errors.email = emailErr;
  // When editing, a blank password means "keep the current one", but a typed one must be strong.
  if (options.requirePassword || fields.password) {
    const passwordErr = validatePassword(fields.password);
    if (passwordErr) errors.password = passwordErr;
  }
  const phoneErr = validatePhoneOptional(fields.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (fields.branchId !== undefined) {
    const branchErr = validateBranchSelection(fields.branchId);
    if (branchErr) errors.branchId = branchErr;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Branch                                                              */
/* ------------------------------------------------------------------ */

export type BranchFormFields = "name" | "contact1Phone" | "contact2Phone" | "mapLocation";

export function validateMapLocation(value: string): string | undefined {
  const map = value.trim();
  if (!map) return undefined;
  if (map.length > MAP_MAX) return `Map location must be at most ${MAP_MAX} characters.`;

  const coords = map.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coords) {
    const lat = Number(coords[1]);
    const lng = Number(coords[2]);
    if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
    if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180.";
    return undefined;
  }

  try {
    const url = new URL(map);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Map link must start with http:// or https://.";
    }
    if (!url.hostname.includes(".")) return "Enter a valid map URL.";
  } catch {
    return "Enter a valid URL or coordinates (lat, lng).";
  }
}

export function validateBranchFields(form: BranchInput): FormErrors<BranchFormFields> {
  const errors: FormErrors<BranchFormFields> = {};

  const name = normalizeSpaces(form.name);
  const nameErr = validateRequired(form.name, "Name");
  if (nameErr) errors.name = nameErr;
  else if (name.length < NAME_MIN) errors.name = `Name must be at least ${NAME_MIN} characters.`;
  else if (name.length > BRANCH_NAME_MAX) {
    errors.name = `Name must be at most ${BRANCH_NAME_MAX} characters.`;
  } else if (!/[\p{L}\p{N}]/u.test(name)) {
    errors.name = "Name must contain letters or numbers.";
  }

  const phone1Err = validatePhoneOptional(form.contact1Phone);
  if (phone1Err) errors.contact1Phone = phone1Err;
  const phone2Err = validatePhoneOptional(form.contact2Phone);
  if (phone2Err) errors.contact2Phone = phone2Err;
  if (
    !phone1Err &&
    !phone2Err &&
    form.contact1Phone.trim() &&
    form.contact2Phone.trim() &&
    phoneDigits(form.contact1Phone) === phoneDigits(form.contact2Phone)
  ) {
    errors.contact2Phone = "Contact 2 must be different from Contact 1.";
  }

  const mapErr = validateMapLocation(form.mapLocation);
  if (mapErr) errors.mapLocation = mapErr;
  return errors;
}

/* ------------------------------------------------------------------ */
/* QR download                                                         */
/* ------------------------------------------------------------------ */

export type QrDownloadFormFields = "student" | "branch" | "class";

export function validateQrDownload(
  mode: "individual" | "branch" | "class" | "all",
  fields: {
    rollNumber: string;
    studentFound: boolean;
    branchFilter: string;
    classFilter: string;
  },
): FormErrors<QrDownloadFormFields> {
  const errors: FormErrors<QrDownloadFormFields> = {};
  if (mode === "individual") {
    const rollErr = validateRollNumber(fields.rollNumber);
    if (rollErr) {
      errors.student = rollErr === "Roll number is required." ? "Enter a roll number." : rollErr;
    } else if (!fields.studentFound) {
      errors.student = "No student found with this roll number.";
    }
  }
  if (mode === "branch") {
    if (!fields.branchFilter.trim() || fields.branchFilter === "all") {
      errors.branch = "Select a branch.";
    }
  }
  if (mode === "class") {
    const classErr = validateClass(fields.classFilter);
    if (classErr) {
      errors.class = classErr === "Class is required." ? "Select a class." : classErr;
    }
  }
  return errors;
}