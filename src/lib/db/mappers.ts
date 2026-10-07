import type { AttendanceRecord, Branch, BranchUser, Manager, Student } from "../../types";
import { normalizeLanguage, normalizeStudentName, parseGender, parseMedium } from "../student";
import { sanitizeRollNumber } from "../validation";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "user";
  branch_id: string | null;
  phone?: string;
  photo_url?: string | null;
  address?: string;
  active?: boolean;
  created_at: string;
};

export type BranchRow = {
  id: string;
  name: string;
  location?: string;
  branch_name?: string;
  city?: string;
  country?: string;
  address?: string;
  map_location?: string;
  contact1_name?: string;
  contact1_phone?: string;
  contact2_name?: string;
  contact2_phone?: string;
  created_at: string;
};

export type StudentRow = {
  id: string;
  branch_id: string;
  name: string;
  roll_number: string;
  class: string;
  gender: Student["gender"];
  medium?: string;
  language?: string;
  school_name?: string;
  phone?: string;
  address?: string;
  photo_url: string | null;
  qr_token: string;
  active: boolean;
  created_at: string;
};

export type AttendanceRow = {
  id: string;
  student_id: string;
  branch_id: string;
  manager_id: string | null;
  date: string;
  marked_at: string;
};

export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    branchName: row.branch_name ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    address: row.address ?? row.location ?? "",
    mapLocation: row.map_location ?? "",
    contact1Name: row.contact1_name ?? "",
    contact1Phone: row.contact1_phone ?? "",
    contact2Name: row.contact2_name ?? "",
    contact2Phone: row.contact2_phone ?? "",
    createdAt: row.created_at,
  };
}

export function branchToRow(data: {
  name?: string;
  branchName?: string;
  city?: string;
  country?: string;
  address?: string;
  mapLocation?: string;
  contact1Name?: string;
  contact1Phone?: string;
  contact2Name?: string;
  contact2Phone?: string;
}): Record<string, string> {
  const row: Record<string, string> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.branchName !== undefined) row.branch_name = data.branchName;
  if (data.city !== undefined) row.city = data.city;
  if (data.country !== undefined) row.country = data.country;
  if (data.address !== undefined) row.address = data.address;
  if (data.mapLocation !== undefined) row.map_location = data.mapLocation;
  if (data.contact1Name !== undefined) row.contact1_name = data.contact1Name;
  if (data.contact1Phone !== undefined) row.contact1_phone = data.contact1Phone;
  if (data.contact2Name !== undefined) row.contact2_name = data.contact2Name;
  if (data.contact2Phone !== undefined) row.contact2_phone = data.contact2Phone;
  return row;
}

export function toManager(row: ProfileRow): Manager {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    branchId: row.branch_id ?? "",
    phone: row.phone ?? "",
    photo: row.photo_url ?? undefined,
    address: row.address ?? "",
    active: row.active !== false,
    createdAt: row.created_at,
  };
}

export function toBranchUser(row: ProfileRow): BranchUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    branchId: row.branch_id ?? "",
    phone: row.phone ?? "",
    photo: row.photo_url ?? undefined,
    address: row.address ?? "",
    active: row.active !== false,
    createdAt: row.created_at,
  };
}

export function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    branchId: row.branch_id,
    name: normalizeStudentName(row.name),
    rollNumber: sanitizeRollNumber(row.roll_number) || row.roll_number,
    class: row.class,
    gender: parseGender(row.gender),
    medium: parseMedium(row.medium),
    language: normalizeLanguage(row.language),
    schoolName: row.school_name ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    photo: row.photo_url ?? undefined,
    qrToken: row.qr_token,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function toAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    branchId: row.branch_id,
    markedById: row.manager_id ?? "",
    date: row.date,
    markedAt: row.marked_at,
  };
}
