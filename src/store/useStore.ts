import { create } from "zustand";
import type {
  AttendanceRecord,
  Branch,
  BranchUser,
  LoginResult,
  Manager,
  Session,
  Student,
} from "../types";
import { branchAccessError } from "../lib/branchAccess";
import { pauseAuthSync, resumeAuthSync } from "../lib/authSync";
import { todayKey } from "../lib/dates";
import {
  dateKeysInRange,
  formatDateRangeLabel,
  MAX_ATTENDANCE_RANGE_DAYS,
  normalizeDateRange,
} from "../lib/reportRanges";
import { isSupabaseConfigured } from "../lib/supabase";
import { toUserMessage } from "../lib/userError";
import * as db from "../lib/db";

function rawErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

interface AppState {
  ready: boolean;
  dataLoading: boolean;
  actionError: string | null;

  branches: Branch[];
  managers: Manager[];
  users: BranchUser[];
  markerNames: Record<string, string>;
  session: Session | null;

  setReady: (ready: boolean) => void;
  setSession: (session: Session | null) => void;
  loadAllData: () => Promise<void>;
  clearActionError: () => void;

  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;

  addBranch: (data: Omit<Branch, "id" | "createdAt">) => Promise<Branch>;
  updateBranch: (id: string, data: Partial<Omit<Branch, "id" | "createdAt">>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  addManager: (data: {
    name: string;
    email: string;
    password: string;
    branchId: string;
    phone?: string;
    address?: string;
    photo?: string;
  }) => Promise<Manager>;
  updateManager: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      branchId: string;
      phone: string;
      address: string;
      photo: string;
    }>,
  ) => Promise<{ branchAssigned: boolean }>;
  deleteManager: (id: string) => Promise<void>;
  setManagerActive: (id: string, active: boolean) => Promise<void>;

  addBranchUser: (data: {
    name: string;
    email: string;
    password: string;
    branchId: string;
    phone?: string;
    address?: string;
    photo?: string;
  }) => Promise<BranchUser>;
  updateBranchUser: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      photo: string;
    }>,
  ) => Promise<void>;
  deleteBranchUser: (id: string) => Promise<void>;
  setBranchUserActive: (id: string, active: boolean) => Promise<void>;

  addStudent: (data: {
    branchId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
    medium?: Student["medium"];
    language?: Student["language"];
    schoolName?: string;
    phone?: string;
    address?: string;
    photo?: string;
  }) => Promise<Student>;
  updateStudent: (
    id: string,
    data: Partial<
      Pick<
        Student,
        | "name"
        | "rollNumber"
        | "class"
        | "gender"
        | "medium"
        | "language"
        | "schoolName"
        | "phone"
        | "address"
        | "active"
        | "branchId"
        | "photo"
      >
    >,
  ) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  markAttendance: (
    studentId: string,
    markedById: string,
    studentHint?: Student,
  ) => Promise<{
    ok: boolean;
    message: string;
    record?: AttendanceRecord;
  }>;
  markAttendanceForDate: (
    studentId: string,
    date: string,
    markedById: string,
    studentHint?: Student,
  ) => Promise<{ ok: boolean; message: string; record?: AttendanceRecord }>;
  markAttendanceForDateRange: (
    studentId: string,
    from: string,
    to: string,
    markedById: string,
    studentHint?: Student,
  ) => Promise<{
    ok: boolean;
    message: string;
    marked: number;
    skipped: number;
    createdIds: string[];
  }>;
  markAttendanceBulkForClassDate: (params: {
    branchId: string;
    className: string;
    from: string;
    to: string;
    markedById: string;
  }) => Promise<{
    ok: boolean;
    message: string;
    marked: number;
    skipped: number;
    records: AttendanceRecord[];
  }>;
  clearAttendanceBulkForClassDate: (params: {
    branchId: string;
    className: string;
    from: string;
    to: string;
  }) => Promise<{
    ok: boolean;
    message: string;
    cleared: number;
  }>;
  clearAttendanceInRange: (
    studentId: string,
    from: string,
    to: string,
    studentHint?: Student,
  ) => Promise<{
    ok: boolean;
    message: string;
    cleared: number;
  }>;
  deleteAttendance: (id: string, branchId?: string) => Promise<void>;

  getBranch: (id: string) => Branch | undefined;
  getManager: (id: string) => Manager | undefined;
  getBranchUser: (id: string) => BranchUser | undefined;
  getMarkedByName: (id: string) => string;
}

function requireSupabase(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "The app isn't set up correctly. Please contact an administrator.",
    );
  }
}

function getActionErrorMessage(e: unknown): string {
  return toUserMessage(e);
}

async function runAction<T>(fn: () => Promise<T>): Promise<T> {
  requireSupabase();
  try {
    const result = await fn();
    useStore.setState({ actionError: null });
    return result;
  } catch (e) {
    useStore.setState({ actionError: getActionErrorMessage(e) });
    throw e;
  }
}

export const useStore = create<AppState>()((set, get) => ({
  ready: false,
  dataLoading: false,
  actionError: null,

  branches: [],
  managers: [],
  users: [],
  markerNames: {},
  session: null,

  setReady: (ready) => set({ ready }),
  setSession: (session) => set({ session }),
  clearActionError: () => set({ actionError: null }),

  loadAllData: async () => {
    requireSupabase();
    set({ dataLoading: true });
    try {
      const data = await db.fetchBootstrapData();
      set({
        ...data,
        dataLoading: false,
        actionError: null,
      });
    } catch (e) {
      set({
        dataLoading: false,
        actionError: toUserMessage(e, "Couldn't load data. Please try again."),
      });
      throw e;
    } finally {
      set((s) => (s.dataLoading ? { dataLoading: false } : {}));
    }
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: "The app isn't set up correctly. Please contact an administrator.",
      };
    }
    pauseAuthSync();
    try {
      const result = await db.signIn(email, password);
      if (!result.ok) return result;

      let resolved = await db.resolveAuthProfile();
      if (resolved.kind === "none") {
        await new Promise((r) => setTimeout(r, 400));
        resolved = await db.resolveAuthProfile();
      }

      if (resolved.kind === "inactive") {
        await db.signOut();
        return {
          ok: false,
          message: "This account has been deactivated. Contact an admin.",
        };
      }

      if (resolved.kind !== "session") {
        await db.signOut();
        return {
          ok: false,
          message:
            "Your account isn't fully set up. Please contact an administrator.",
        };
      }

      set({ session: resolved.session });
      void get().loadAllData().catch(() => undefined);
      return { ok: true, role: resolved.session.role };
    } catch (e) {
      return {
        ok: false,
        message: toUserMessage(e, "Couldn't sign in. Please try again."),
      };
    } finally {
      resumeAuthSync();
    }
  },

  logout: async () => {
    await db.signOut();
    set({
      session: null,
      branches: [],
      managers: [],
      users: [],
      markerNames: {},
    });
  },

  addBranch: (data) =>
    runAction(async () => {
      const branch = await db.insertBranch(data);
      set((s) => ({ branches: [...s.branches, branch] }));
      return branch;
    }),

  updateBranch: (id, data) =>
    runAction(async () => {
      await db.patchBranch(id, data);
      set((s) => ({
        branches: s.branches.map((b) => (b.id === id ? { ...b, ...data } : b)),
      }));
    }),

  deleteBranch: (id) =>
    runAction(async () => {
      await db.removeBranch(id);
      set((s) => ({
        branches: s.branches.filter((b) => b.id !== id),
      }));
    }),

  addManager: (data) =>
    runAction(async () => {
      const manager = await db.createManagerAccount(data);
      const adminSession = await db.fetchAdminSessionAfterManagerCreate();
      set((s) => ({
        managers: [...s.managers, manager],
        markerNames: { ...s.markerNames, [manager.id]: manager.name },
        session: adminSession ?? s.session,
      }));
      return manager;
    }),

  updateManager: (id, data) =>
    runAction(async () => {
      const result = await db.patchManager(id, data);
      set((s) => ({
        managers: s.managers.map((m) =>
          m.id === id
            ? {
                ...m,
                ...data,
                branchId: result.branchAssigned ? (data.branchId ?? m.branchId) : m.branchId,
              }
            : m,
        ),
        markerNames:
          data.name !== undefined
            ? { ...s.markerNames, [id]: data.name }
            : s.markerNames,
      }));
      return result;
    }),

  deleteManager: (id) =>
    runAction(async () => {
      await db.setManagerActive(id, false);
      set((s) => ({
        managers: s.managers.map((m) => (m.id === id ? { ...m, active: false } : m)),
      }));
    }),

  setManagerActive: (id, active) =>
    runAction(async () => {
      await db.setManagerActive(id, active);
      set((s) => ({
        managers: s.managers.map((m) => (m.id === id ? { ...m, active } : m)),
      }));
    }),

  addBranchUser: (data) =>
    runAction(async () => {
      const user = await db.createBranchUserAccount(data);
      set((s) => ({
        users: [...s.users, user],
        markerNames: { ...s.markerNames, [user.id]: user.name },
      }));
      return user;
    }),

  updateBranchUser: (id, data) =>
    runAction(async () => {
      await db.patchBranchUser(id, data);
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        markerNames:
          data.name !== undefined
            ? { ...s.markerNames, [id]: data.name }
            : s.markerNames,
      }));
    }),

  deleteBranchUser: (id) =>
    runAction(async () => {
      await db.setBranchUserActive(id, false);
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, active: false } : u)),
      }));
    }),

  setBranchUserActive: (id, active) =>
    runAction(async () => {
      await db.setBranchUserActive(id, active);
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, active } : u)),
      }));
    }),

  addStudent: (data) =>
    runAction(async () => {
      const session = get().session;
      const branchErr = branchAccessError(session, data.branchId);
      if (branchErr) throw new Error(branchErr);

      const rollErr = await db.validateRollNumberAvailable(data.rollNumber);
      if (rollErr) throw new Error(rollErr);

      return db.insertStudent(data);
    }),

  updateStudent: (id, data) =>
    runAction(async () => {
      const session = get().session;
      const existing = await db.getStudentById(id);
      if (!existing) throw new Error("Student not found.");

      const targetBranch = data.branchId ?? existing.branchId;
      const branchErr = branchAccessError(session, targetBranch);
      if (branchErr) throw new Error(branchErr);

      if (data.rollNumber !== undefined) {
        const rollErr = await db.validateRollNumberAvailable(data.rollNumber, id);
        if (rollErr) throw new Error(rollErr);
      }

      return db.patchStudent(id, data);
    }),

  deleteStudent: (id) =>
    runAction(async () => {
      const session = get().session;
      const student = await db.getStudentById(id);
      if (!student) throw new Error("Student not found.");

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) throw new Error(branchErr);

      await db.removeStudent(id);
    }),

  markAttendance: (studentId, markedById, studentHint) =>
    runAction(async () => {
      const session = get().session;
      const student = studentHint ?? (await db.getStudentById(studentId));
      if (!student) return { ok: false, message: "Student not found." };
      if (!student.active) return { ok: false, message: "This student is inactive and can't be marked." };

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) return { ok: false, message: branchErr };

      const date = todayKey();
      const existing = await db.getAttendanceForStudentDate(studentId, date);
      if (existing) {
        return { ok: false, message: "Already marked present today." };
      }

      try {
        const record = await db.insertAttendance({
          studentId,
          branchId: student.branchId,
          markedById,
          date,
        });
        return { ok: true, message: `${student.name} marked present.`, record };
      } catch (e) {
        const msg = toUserMessage(e, "Couldn't mark attendance. Please try again.");
        if (/already|duplicate|unique/i.test(rawErrorText(e))) {
          return { ok: false, message: "Already marked present today." };
        }
        return { ok: false, message: msg };
      }
    }),

  markAttendanceForDate: (studentId, date, markedById, studentHint) =>
    runAction(async () => {
      const session = get().session;
      const student = studentHint ?? (await db.getStudentById(studentId));
      if (!student) return { ok: false, message: "Student not found." };
      if (!student.active) return { ok: false, message: "This student is inactive and can't be marked." };

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) return { ok: false, message: branchErr };

      try {
        const record = await db.markAttendanceForDate({
          studentId,
          branchId: student.branchId,
          markedById,
          date,
        });
        return { ok: true, message: `${student.name} marked for ${date}.`, record };
      } catch (e) {
        const msg = toUserMessage(e, "Couldn't mark attendance. Please try again.");
        if (/already|duplicate|unique/i.test(rawErrorText(e))) {
          return { ok: false, message: "Already marked present for this date." };
        }
        return { ok: false, message: msg };
      }
    }),

  markAttendanceForDateRange: (studentId, from, to, markedById, studentHint) =>
    runAction(async () => {
      const session = get().session;
      const student = studentHint ?? (await db.getStudentById(studentId));
      if (!student) {
        return { ok: false, message: "Student not found.", marked: 0, skipped: 0, createdIds: [] };
      }
      if (!student.active) {
        return {
          ok: false,
          message: "This student is inactive and can't be marked.",
          marked: 0,
          skipped: 0,
          createdIds: [],
        };
      }

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) {
        return { ok: false, message: branchErr, marked: 0, skipped: 0, createdIds: [] };
      }

      const range = normalizeDateRange(from, to);
      const today = todayKey();
      if (range.to > today) {
        return {
          ok: false,
          message: "Future dates cannot be marked present.",
          marked: 0,
          skipped: 0,
          createdIds: [],
        };
      }

      const keys = dateKeysInRange(range.from, range.to).filter((d) => d <= today);
      if (keys.length === 0) {
        return {
          ok: false,
          message: "Select a valid date range.",
          marked: 0,
          skipped: 0,
          createdIds: [],
        };
      }
      if (keys.length > MAX_ATTENDANCE_RANGE_DAYS) {
        return {
          ok: false,
          message: `Choose at most ${MAX_ATTENDANCE_RANGE_DAYS} days at a time.`,
          marked: 0,
          skipped: 0,
          createdIds: [],
        };
      }

      const existing = await db.listAttendanceForStudent(studentId, {
        from: keys[0],
        to: keys[keys.length - 1],
      });
      const presentDates = new Set(existing.map((r) => r.date));
      const missing = keys.filter((d) => !presentDates.has(d));
      const skipped = keys.length - missing.length;

      const createdIds: string[] = [];
      try {
        for (const date of missing) {
          const record = await db.insertAttendance({
            studentId,
            branchId: student.branchId,
            markedById,
            date,
          });
          createdIds.push(record.id);
        }
      } catch (e) {
        const msg = toUserMessage(e, "Couldn't mark attendance. Please try again.");
        if (createdIds.length > 0) {
          return {
            ok: true,
            message: `Marked ${createdIds.length} day${createdIds.length === 1 ? "" : "s"}, then stopped: ${msg}`,
            marked: createdIds.length,
            skipped,
            createdIds,
          };
        }
        return { ok: false, message: msg, marked: 0, skipped, createdIds: [] };
      }

      const label = formatDateRangeLabel(range.from, range.to);
      const parts = [
        `${createdIds.length} marked present`,
        skipped > 0 ? `${skipped} already present` : null,
      ].filter(Boolean);
      return {
        ok: true,
        message: `${student.name}: ${parts.join(", ")} · ${label}`,
        marked: createdIds.length,
        skipped,
        createdIds,
      };
    }),

  markAttendanceBulkForClassDate: ({ branchId, className, from, to, markedById }) =>
    runAction(async () => {
      const session = get().session;
      const branchErr = branchAccessError(session, branchId);
      if (branchErr) {
        return { ok: false, message: branchErr, marked: 0, skipped: 0, records: [] };
      }

      const trimmedClass = className.trim();
      if (!trimmedClass || trimmedClass === "all") {
        return {
          ok: false,
          message: "Select a class before bulk marking.",
          marked: 0,
          skipped: 0,
          records: [],
        };
      }

      const range = normalizeDateRange(from, to);
      const today = todayKey();
      if (range.from > today) {
        return {
          ok: false,
          message: "Future dates cannot be marked present.",
          marked: 0,
          skipped: 0,
          records: [],
        };
      }

      const keys = dateKeysInRange(range.from, range.to).filter((d) => d <= today);
      if (keys.length === 0) {
        return {
          ok: false,
          message: "Select a valid date range.",
          marked: 0,
          skipped: 0,
          records: [],
        };
      }
      if (keys.length > MAX_ATTENDANCE_RANGE_DAYS) {
        return {
          ok: false,
          message: `Choose at most ${MAX_ATTENDANCE_RANGE_DAYS} days at a time.`,
          marked: 0,
          skipped: 0,
          records: [],
        };
      }

      const students = await db.listStudentsByBranch(branchId, { activeOnly: true });
      const inClass = students.filter((s) => s.class === trimmedClass);
      if (inClass.length === 0) {
        return {
          ok: false,
          message: `No active students in class ${trimmedClass}.`,
          marked: 0,
          skipped: 0,
          records: [],
        };
      }

      const existing = await db.listAttendanceInRange({
        from: keys[0]!,
        to: keys[keys.length - 1]!,
        branchId,
      });
      const presentSet = new Set(existing.map((r) => `${r.studentId}|${r.date}`));
      const rows: {
        studentId: string;
        branchId: string;
        markedById: string;
        date: string;
      }[] = [];
      let skipped = 0;
      for (const student of inClass) {
        for (const date of keys) {
          if (presentSet.has(`${student.id}|${date}`)) {
            skipped += 1;
          } else {
            rows.push({
              studentId: student.id,
              branchId,
              markedById,
              date,
            });
          }
        }
      }

      if (rows.length === 0) {
        return {
          ok: true,
          message: `Class ${trimmedClass}: all attendance already marked for ${formatDateRangeLabel(keys[0]!, keys[keys.length - 1]!)}.`,
          marked: 0,
          skipped,
          records: [],
        };
      }

      try {
        const records = await db.insertAttendanceBulk(rows);
        const parts = [
          `${records.length} marked present`,
          skipped > 0 ? `${skipped} already present` : null,
        ].filter(Boolean);
        return {
          ok: true,
          message: `Class ${trimmedClass}: ${parts.join(", ")} · ${formatDateRangeLabel(keys[0]!, keys[keys.length - 1]!)}.`,
          marked: records.length,
          skipped,
          records,
        };
      } catch (e) {
        return {
          ok: false,
          message: toUserMessage(e, "Couldn't mark attendance. Please try again."),
          marked: 0,
          skipped,
          records: [],
        };
      }
    }),

  clearAttendanceBulkForClassDate: ({ branchId, className, from, to }) =>
    runAction(async () => {
      const session = get().session;
      const branchErr = branchAccessError(session, branchId);
      if (branchErr) return { ok: false, message: branchErr, cleared: 0 };

      const trimmedClass = className.trim();
      if (!trimmedClass || trimmedClass === "all") {
        return {
          ok: false,
          message: "Select a class before bulk clearing.",
          cleared: 0,
        };
      }

      const range = normalizeDateRange(from, to);
      const keys = dateKeysInRange(range.from, range.to);
      if (keys.length === 0) {
        return { ok: false, message: "Select a valid date range.", cleared: 0 };
      }
      if (keys.length > MAX_ATTENDANCE_RANGE_DAYS) {
        return {
          ok: false,
          message: `Choose at most ${MAX_ATTENDANCE_RANGE_DAYS} days at a time.`,
          cleared: 0,
        };
      }

      const students = await db.listStudentsByBranch(branchId, { activeOnly: true });
      const inClassIds = new Set(
        students.filter((s) => s.class === trimmedClass).map((s) => s.id),
      );
      if (inClassIds.size === 0) {
        return {
          ok: false,
          message: `No active students in class ${trimmedClass}.`,
          cleared: 0,
        };
      }

      const existing = await db.listAttendanceInRange({
        from: keys[0]!,
        to: keys[keys.length - 1]!,
        branchId,
      });
      const toClearIds = existing
        .filter((r) => inClassIds.has(r.studentId))
        .map((r) => r.id);
      if (toClearIds.length === 0) {
        return {
          ok: true,
          message: `No attendance to clear in class ${trimmedClass} for ${formatDateRangeLabel(keys[0]!, keys[keys.length - 1]!)}.`,
          cleared: 0,
        };
      }

      try {
        const cleared = await db.removeAttendanceByIds(toClearIds);
        return {
          ok: true,
          message: `Class ${trimmedClass}: ${cleared} attendance record${cleared === 1 ? "" : "s"} cleared · ${formatDateRangeLabel(keys[0]!, keys[keys.length - 1]!)}.`,
          cleared,
        };
      } catch (e) {
        return {
          ok: false,
          message: toUserMessage(e, "Couldn't update attendance. Please try again."),
          cleared: 0,
        };
      }
    }),

  clearAttendanceInRange: (studentId, from, to, studentHint) =>
    runAction(async () => {
      const session = get().session;
      const student = studentHint ?? (await db.getStudentById(studentId));
      if (!student) return { ok: false, message: "Student not found.", cleared: 0 };

      const branchErr = branchAccessError(session, student.branchId);
      if (branchErr) return { ok: false, message: branchErr, cleared: 0 };

      const range = normalizeDateRange(from, to);
      const keys = dateKeysInRange(range.from, range.to);
      if (keys.length === 0) {
        return { ok: false, message: "Select a valid date range.", cleared: 0 };
      }
      if (keys.length > MAX_ATTENDANCE_RANGE_DAYS) {
        return {
          ok: false,
          message: `Choose at most ${MAX_ATTENDANCE_RANGE_DAYS} days at a time.`,
          cleared: 0,
        };
      }

      const existing = await db.listAttendanceForStudent(studentId, {
        from: range.from,
        to: range.to,
      });
      if (existing.length === 0) {
        return {
          ok: true,
          message: `${student.name} was already absent for that range.`,
          cleared: 0,
        };
      }

      let cleared = 0;
      try {
        for (const record of existing) {
          await db.removeAttendance(record.id);
          cleared += 1;
        }
      } catch (e) {
        const msg = toUserMessage(e, "Couldn't mark absent. Please try again.");
        if (cleared > 0) {
          return {
            ok: true,
            message: `Marked ${cleared} day${cleared === 1 ? "" : "s"} absent, then stopped: ${msg}`,
            cleared,
          };
        }
        return { ok: false, message: msg, cleared: 0 };
      }

      const label = formatDateRangeLabel(range.from, range.to);
      const skipped = keys.length - cleared;
      const parts = [
        `${cleared} marked absent`,
        skipped > 0 ? `${skipped} already absent` : null,
      ].filter(Boolean);
      return {
        ok: true,
        message: `${student.name}: ${parts.join(", ")} · ${label}`,
        cleared,
      };
    }),

  deleteAttendance: (id, branchId) =>
    runAction(async () => {
      const session = get().session;
      if (branchId) {
        const branchErr = branchAccessError(session, branchId);
        if (branchErr) throw new Error(branchErr);
      }
      await db.removeAttendance(id);
    }),

  getBranch: (id) => get().branches.find((b) => b.id === id),
  getManager: (id) => get().managers.find((m) => m.id === id),
  getBranchUser: (id) => get().users.find((u) => u.id === id),
  getMarkedByName: (id) => {
    const named = get().markerNames[id];
    if (named) return named;
    const m = get().getManager(id);
    if (m) return m.name;
    const u = get().getBranchUser(id);
    if (u) return u.name;
    const session = get().session;
    if (session?.userId === id) return session.name;
    return "—";
  },
}));
