export type UserRole = "admin" | "manager" | "user";

export type Gender = "male" | "female" | "other" | "na";

export type Medium = "english" | "kannada" | "marathi" | "na";

export interface Branch {
  id: string;
  name: string;
  branchName: string;
  city: string;
  country: string;
  address: string;
  mapLocation: string;
  contact1Name: string;
  contact1Phone: string;
  contact2Name: string;
  contact2Phone: string;
  createdAt: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  branchId: string;
  phone: string;
  photo?: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface BranchUser {
  id: string;
  name: string;
  email: string;
  branchId: string;
  phone: string;
  photo?: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export type LoginResult =
  | { ok: true; role: UserRole }
  | { ok: false; message: string };

export interface Student {
  id: string;
  branchId: string;
  name: string;
  rollNumber: string;
  class: string;
  gender: Gender;
  medium: Medium;
  language: string;
  schoolName: string;
  phone: string;
  address: string;
  photo?: string;
  qrToken: string;
  active: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  branchId: string;
  markedById: string;
  date: string;
  markedAt: string;
}

export interface Session {
  role: UserRole;
  userId: string;
  name: string;
  branchId?: string;
  photo?: string;
}

export interface QrPayload {
  v: 1;
  sid: string;
  tok: string;
}
