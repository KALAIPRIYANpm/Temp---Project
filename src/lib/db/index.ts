import { supabase } from "../supabase";
import { generateQrToken } from "../qr";
import { normalizeEmail } from "../auth";
import type {
  AttendanceRecord,
  Branch,
  BranchUser,
  Manager,
  Session,
  Student,
} from "../../types";
import type { BranchInput } from "../branch";
import { fetchSessionProfile } from "../session";
import { normalizeStudentName } from "../student";
import { ROLL_NUMBER_IN_USE_MESSAGE, sanitizeRollNumber } from "../validation";
import {
  toAttendance,
  toBranch,
  toBranchUser,
  toManager,
  toStudent,
  branchToRow,
  type AttendanceRow,
  type BranchRow,
  type ProfileRow,
  type StudentRow,
} from "./mappers";
import { isDataUrl, removeStudentPhoto, uploadStudentPhoto, uploadProfilePhoto, removeProfilePhoto } from "../storage";
import { pauseAuthSync, resumeAuthSync } from "../authSync";
import { getDbErrorMessage, isMissingBranchIdColumn } from "./errors";

export { fetchSessionProfile, isCurrentProfileInactive, resolveAuthProfile } from "../session";

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: password.trim(),
  });
  if (error) return { ok: false, message: getDbErrorMessage(error) };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Supabase caps each response at 1000 rows by default — page through all. */
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/** Bootstrap only — never loads students or attendance (scale-safe). */
export async function fetchBootstrapData(): Promise<{
  branches: Branch[];
  managers: Manager[];
  users: BranchUser[];
  markerNames: Record<string, string>;
}> {
  const [branches, managers, users, adminNames] = await Promise.all([
    fetchAllPages<BranchRow>((from, to) =>
      supabase.from("branches").select("*").order("created_at").range(from, to),
    ),
    fetchAllPages<ProfileRow>((from, to) =>
      supabase.from("profiles").select("*").eq("role", "manager").order("created_at").range(from, to),
    ),
    fetchAllPages<ProfileRow>((from, to) =>
      supabase.from("profiles").select("*").eq("role", "user").order("created_at").range(from, to),
    ),
    fetchAllPages<{ id: string; name: string }>((from, to) =>
      supabase.from("profiles").select("id, name").eq("role", "admin").range(from, to),
    ),
  ]);

  const markerNames: Record<string, string> = {};
  for (const p of managers) markerNames[p.id] = p.name;
  for (const p of users) markerNames[p.id] = p.name;
  for (const p of adminNames) markerNames[p.id] = p.name;

  return {
    branches: branches.map(toBranch),
    managers: managers.map(toManager),
    users: users.map(toBranchUser),
    markerNames,
  };
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toStudent(data as StudentRow) : null;
}

export async function getStudentByQr(
  studentId: string,
  qrToken: string,
  branchId?: string,
): Promise<Student | null> {
  let q = supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("qr_token", qrToken);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ? toStudent(data as StudentRow) : null;
}

export async function getStudentByRoll(
  rollNumber: string,
  branchId?: string,
): Promise<Student | null> {
  const roll = sanitizeRollNumber(rollNumber);
  if (!roll) return null;
  let q = supabase.from("students").select("*").eq("roll_number", roll);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ? toStudent(data as StudentRow) : null;
}

/** Check roll number format and global uniqueness (students.roll_number is unique). */
export async function validateRollNumberAvailable(
  rollNumber: string,
  excludeStudentId?: string,
): Promise<string | undefined> {
  const roll = sanitizeRollNumber(rollNumber);
  if (!roll) return "Roll number is required.";
  if (!/^\d+$/.test(roll)) return "Roll number must contain numbers only.";

  const existing = await getStudentByRoll(roll);
  if (existing && existing.id !== excludeStudentId) {
    return ROLL_NUMBER_IN_USE_MESSAGE;
  }
}

export type ListStudentsParams = {
  branchId?: string;
  activeOnly?: boolean;
  search?: string;
  /** Exact class match (e.g. "5") */
  studentClass?: string;
  page?: number;
  pageSize?: number;
};

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<{ students: Student[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("students")
    .select("*", { count: "exact" })
    .order("roll_number");

  if (params.branchId) q = q.eq("branch_id", params.branchId);
  if (params.activeOnly) q = q.eq("active", true);
  if (params.studentClass) q = q.eq("class", params.studentClass);

  const search = params.search?.trim();
  if (search) {
    const digits = sanitizeRollNumber(search);
    if (digits && /^\d+$/.test(search.trim())) {
      q = q.eq("roll_number", digits);
    } else {
      const safe = search.replace(/[%_,.()"'\\]/g, "").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        q = q.or(
          `name.ilike."${pattern}",school_name.ilike."${pattern}",phone.ilike."${pattern}",class.ilike."${pattern}"`,
        );
      }
    }
  }

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return {
    students: ((data ?? []) as StudentRow[]).map(toStudent),
    total: count ?? 0,
  };
}

/** All students in a branch (paged server-side). Safe when branches stay under a few thousand. */
export async function listStudentsByBranch(
  branchId: string,
  opts?: { activeOnly?: boolean },
): Promise<Student[]> {
  const rows = await fetchAllPages<StudentRow>((from, to) => {
    let q = supabase
      .from("students")
      .select("*")
      .eq("branch_id", branchId)
      .order("roll_number")
      .range(from, to);
    if (opts?.activeOnly !== false) q = q.eq("active", true);
    return q;
  });
  return rows.map(toStudent);
}

export async function listAttendanceForBranchDate(
  branchId: string,
  date: string,
): Promise<AttendanceRecord[]> {
  const rows = await fetchAllPages<AttendanceRow>((from, to) =>
    supabase
      .from("attendance")
      .select("*")
      .eq("branch_id", branchId)
      .eq("date", date)
      .order("marked_at")
      .range(from, to),
  );
  return rows.map(toAttendance);
}

export async function listAttendanceInRange(params: {
  from: string;
  to: string;
  branchId?: string;
}): Promise<AttendanceRecord[]> {
  const rows = await fetchAllPages<AttendanceRow>((from, to) => {
    let q = supabase
      .from("attendance")
      .select("*")
      .gte("date", params.from)
      .lte("date", params.to)
      .order("date")
      .order("marked_at")
      .range(from, to);
    if (params.branchId) q = q.eq("branch_id", params.branchId);
    return q;
  });
  return rows.map(toAttendance);
}

export async function listAttendanceForStudent(
  studentId: string,
  opts?: { from?: string; to?: string },
): Promise<AttendanceRecord[]> {
  const rows = await fetchAllPages<AttendanceRow>((from, to) => {
    let q = supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .order("date")
      .range(from, to);
    if (opts?.from) q = q.gte("date", opts.from);
    if (opts?.to) q = q.lte("date", opts.to);
    return q;
  });
  return rows.map(toAttendance);
}

export async function getAttendanceForStudentDate(
  studentId: string,
  date: string,
): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? toAttendance(data as AttendanceRow) : null;
}

export async function countActiveStudents(branchId?: string): Promise<number> {
  let q = supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  if (branchId) q = q.eq("branch_id", branchId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function countPresentForDate(
  date: string,
  branchId?: string,
): Promise<number> {
  let q = supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("date", date);
  if (branchId) q = q.eq("branch_id", branchId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Present count for a branch/date, optionally limited to one class. */
export async function countPresentForBranchDate(params: {
  branchId: string;
  date: string;
  studentClass?: string;
}): Promise<number> {
  if (!params.studentClass) {
    return countPresentForDate(params.date, params.branchId);
  }

  const { count, error } = await supabase
    .from("attendance")
    .select("id, students!inner(class, active)", { count: "exact", head: true })
    .eq("branch_id", params.branchId)
    .eq("date", params.date)
    .eq("students.class", params.studentClass)
    .eq("students.active", true);

  if (!error) return count ?? 0;

  // Fallback if the embed relationship name differs
  const classIds = await fetchAllPages<{ id: string }>((from, to) =>
    supabase
      .from("students")
      .select("id")
      .eq("branch_id", params.branchId)
      .eq("class", params.studentClass!)
      .eq("active", true)
      .range(from, to),
  );
  const idSet = new Set(classIds.map((r) => r.id));
  const day = await listAttendanceForBranchDate(params.branchId, params.date);
  return day.filter((r) => idSet.has(r.studentId)).length;
}

/** Per-branch active student counts (for admin dashboards). */
export async function countActiveStudentsByBranch(): Promise<Record<string, number>> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "count_active_students_by_branch",
  );
  if (!rpcError && Array.isArray(rpcData)) {
    const counts: Record<string, number> = {};
    for (const row of rpcData as { branch_id: string; student_count: number | string }[]) {
      counts[row.branch_id] = Number(row.student_count);
    }
    return counts;
  }

  // Fallback when RPC is not installed yet
  const rows = await fetchAllPages<{ branch_id: string }>((from, to) =>
    supabase
      .from("students")
      .select("branch_id")
      .eq("active", true)
      .range(from, to),
  );
  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.branch_id] = (counts[r.branch_id] ?? 0) + 1;
  }
  return counts;
}

/** Unique present student counts per branch for a date range. */
export async function summarizeAttendanceByBranch(
  from: string,
  to: string,
): Promise<Record<string, { checkIns: number; uniquePresent: number }>> {
  const records = await listAttendanceInRange({ from, to });
  const byBranch = new Map<string, { checkIns: number; ids: Set<string> }>();
  for (const r of records) {
    let entry = byBranch.get(r.branchId);
    if (!entry) {
      entry = { checkIns: 0, ids: new Set() };
      byBranch.set(r.branchId, entry);
    }
    entry.checkIns += 1;
    entry.ids.add(r.studentId);
  }
  const out: Record<string, { checkIns: number; uniquePresent: number }> = {};
  for (const [branchId, entry] of byBranch) {
    out[branchId] = { checkIns: entry.checkIns, uniquePresent: entry.ids.size };
  }
  return out;
}

export async function getStudentsByIds(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const chunkSize = 200;
  const all: Student[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("students").select("*").in("id", chunk);
    if (error) throw error;
    all.push(...((data ?? []) as StudentRow[]).map(toStudent));
  }
  return all;
}

export async function insertBranch(data: BranchInput): Promise<Branch> {
  const { data: row, error } = await supabase
    .from("branches")
    .insert(branchToRow(data))
    .select()
    .single();
  if (error) throw error;
  return toBranch(row as BranchRow);
}

export async function patchBranch(id: string, data: Partial<BranchInput>): Promise<void> {
  const { error } = await supabase.from("branches").update(branchToRow(data)).eq("id", id);
  if (error) throw error;
}

export async function removeBranch(id: string): Promise<void> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
}

function isRateLimitError(message: string): boolean {
  return /rate limit|too many requests/i.test(message);
}

async function fetchProfileById(userId: string): Promise<ProfileRow> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return profile as ProfileRow;
}

async function createStaffAccount(input: {
  name: string;
  email: string;
  password: string;
  role: "manager" | "user";
  branchId: string;
}): Promise<ProfileRow> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password;

  const {
    data: { session: callerSession },
  } = await supabase.auth.getSession();

  pauseAuthSync();
  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: input.role,
          branch_id: input.branchId,
        },
      },
    });

    if (error) {
      if (isRateLimitError(error.message)) {
        throw new Error(
          "Too many attempts. Please wait a while and try again.",
        );
      }
      throw new Error(getDbErrorMessage(error));
    }
    if (!signUpData.user) throw new Error("Could not create account.");

    const profile = await fetchProfileById(signUpData.user.id);

    if (callerSession) {
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: callerSession.access_token,
        refresh_token: callerSession.refresh_token,
      });
      if (restoreError) throw restoreError;

      if (input.role === "user" && profile.branch_id !== input.branchId) {
        await supabase
          .from("profiles")
          .update({ branch_id: input.branchId, role: "user" })
          .eq("id", signUpData.user.id);
        return fetchProfileById(signUpData.user.id);
      }
    }

    return profile;
  } finally {
    resumeAuthSync();
  }
}

async function resolveProfilePhoto(
  profileId: string,
  photo: string | undefined,
): Promise<string | null | undefined> {
  if (photo === undefined) return undefined;
  if (!photo) {
    await removeProfilePhoto(profileId).catch(() => undefined);
    return null;
  }
  if (isDataUrl(photo)) {
    return uploadProfilePhoto(profileId, photo);
  }
  return photo;
}

async function applyProfileExtraFields(
  profileId: string,
  data: { phone?: string; address?: string; photo?: string },
): Promise<ProfileRow> {
  const payload: Record<string, unknown> = {};
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.photo !== undefined) {
    payload.photo_url = await resolveProfilePhoto(profileId, data.photo);
  }
  if (Object.keys(payload).length === 0) return fetchProfileById(profileId);

  const { data: row, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select()
    .single();
  if (error) throw error;
  return row as ProfileRow;
}

export async function createManagerAccount(input: {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone?: string;
  address?: string;
  photo?: string;
}): Promise<Manager> {
  const profile = await createStaffAccount({ ...input, role: "manager" });
  let updated = profile;

  if (!profile.branch_id && input.branchId) {
    const { error } = await supabase
      .from("profiles")
      .update({ branch_id: input.branchId })
      .eq("id", profile.id);
    if (!error) updated = { ...profile, branch_id: input.branchId };
    else if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  }

  updated = await applyProfileExtraFields(profile.id, {
    phone: input.phone ?? "",
    address: input.address ?? "",
    photo: input.photo,
  });

  return toManager(updated);
}

export async function createBranchUserAccount(input: {
  name: string;
  email: string;
  password: string;
  branchId: string;
  phone?: string;
  address?: string;
  photo?: string;
}): Promise<BranchUser> {
  const profile = await createStaffAccount({ ...input, role: "user" });
  let updated = profile;

  if (!profile.branch_id && input.branchId) {
    const { error } = await supabase
      .from("profiles")
      .update({ branch_id: input.branchId, role: "user" })
      .eq("id", profile.id);
    if (!error) updated = { ...profile, branch_id: input.branchId, role: "user" };
    else if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  } else if (profile.branch_id) {
    updated = profile;
  } else {
    updated = { ...profile, branch_id: input.branchId };
  }

  updated = await applyProfileExtraFields(profile.id, {
    phone: input.phone ?? "",
    address: input.address ?? "",
    photo: input.photo,
  });

  return toBranchUser(updated);
}

export async function fetchAdminSessionAfterManagerCreate(): Promise<Session | null> {
  return fetchSessionProfile();
}

export type PatchManagerResult = { branchAssigned: boolean };

export async function patchManager(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    branchId: string;
    phone: string;
    address: string;
    photo: string;
  }>,
): Promise<PatchManagerResult> {
  const base: Record<string, unknown> = {};
  if (data.name !== undefined) base.name = data.name;
  if (data.email !== undefined) base.email = data.email;
  if (data.phone !== undefined) base.phone = data.phone;
  if (data.address !== undefined) base.address = data.address;

  const wantsBranch = Boolean(data.branchId);

  if (wantsBranch) {
    const { error } = await supabase
      .from("profiles")
      .update({ ...base, branch_id: data.branchId })
      .eq("id", id);
    if (!error) {
      if (data.photo !== undefined) await applyProfileExtraFields(id, { photo: data.photo });
      return { branchAssigned: true };
    }
    if (!isMissingBranchIdColumn(getDbErrorMessage(error))) throw error;
  }

  if (Object.keys(base).length > 0) {
    const { error } = await supabase.from("profiles").update(base).eq("id", id);
    if (error) throw error;
  }

  if (data.photo !== undefined) {
    await applyProfileExtraFields(id, { photo: data.photo });
  }

  return { branchAssigned: !wantsBranch };
}

export async function patchBranchUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    photo: string;
  }>,
): Promise<void> {
  const base: Record<string, unknown> = {};
  if (data.name !== undefined) base.name = data.name;
  if (data.email !== undefined) base.email = data.email;
  if (data.phone !== undefined) base.phone = data.phone;
  if (data.address !== undefined) base.address = data.address;

  if (Object.keys(base).length > 0) {
    const { error } = await supabase.from("profiles").update(base).eq("id", id);
    if (error) throw error;
  }

  if (data.photo !== undefined) {
    await applyProfileExtraFields(id, { photo: data.photo });
  }
}

async function setProfileActive(
  id: string,
  active: boolean,
  label: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ active })
    .eq("id", id)
    .neq("active", active)
    .select("id");
  if (error) throw new Error(getDbErrorMessage(error));
  if (!data?.length) {
    throw new Error(
      `Couldn't update this ${label}. You may not have permission, or it is already ${active ? "active" : "inactive"}.`,
    );
  }
}

export async function setManagerActive(id: string, active: boolean): Promise<void> {
  await setProfileActive(id, active, "manager");
}

export async function setBranchUserActive(id: string, active: boolean): Promise<void> {
  await setProfileActive(id, active, "user");
}

async function resolvePhoto(
  studentId: string,
  photo: string | undefined,
): Promise<string | null | undefined> {
  if (photo === undefined) return undefined;
  if (!photo) {
    await removeStudentPhoto(studentId).catch(() => undefined);
    return null;
  }
  if (isDataUrl(photo)) {
    return uploadStudentPhoto(studentId, photo);
  }
  return photo;
}

export async function insertStudent(data: {
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
}): Promise<Student> {
  const qrToken = generateQrToken();
  const rollNumber = sanitizeRollNumber(data.rollNumber);
  const { data: row, error } = await supabase
    .from("students")
    .insert({
      branch_id: data.branchId,
      name: normalizeStudentName(data.name),
      roll_number: rollNumber,
      class: data.class,
      gender: data.gender,
      medium: data.medium ?? "na",
      language: (data.language ?? "").trim(),
      school_name: data.schoolName ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      qr_token: qrToken,
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(getDbErrorMessage(error));
  const student = toStudent(row as StudentRow);

  if (data.photo) {
    const photoUrl = await resolvePhoto(student.id, data.photo);
    if (photoUrl) {
      const { data: updated, error: upErr } = await supabase
        .from("students")
        .update({ photo_url: photoUrl })
        .eq("id", student.id)
        .select()
        .single();
      if (upErr) throw upErr;
      return toStudent(updated as StudentRow);
    }
  }

  return student;
}

export async function patchStudent(
  id: string,
  data: Partial<{
    branchId: string;
    name: string;
    rollNumber: string;
    class: string;
    gender: Student["gender"];
    medium: Student["medium"];
    language: Student["language"];
    schoolName: string;
    phone: string;
    address: string;
    active: boolean;
    photo?: string;
  }>,
): Promise<Student> {
  const payload: Record<string, unknown> = {};
  if (data.branchId !== undefined) payload.branch_id = data.branchId;
  if (data.name !== undefined) payload.name = normalizeStudentName(data.name);
  if (data.rollNumber !== undefined) payload.roll_number = sanitizeRollNumber(data.rollNumber);
  if (data.class !== undefined) payload.class = data.class;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.medium !== undefined) payload.medium = data.medium;
  if (data.language !== undefined) payload.language = data.language.trim();
  if (data.schoolName !== undefined) payload.school_name = data.schoolName;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.active !== undefined) payload.active = data.active;

  if (data.photo !== undefined) {
    payload.photo_url = await resolvePhoto(id, data.photo);
  }

  const { data: row, error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getDbErrorMessage(error));
  return toStudent(row as StudentRow);
}

export async function removeStudent(id: string): Promise<void> {
  await removeStudentPhoto(id).catch(() => undefined);
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

export async function insertAttendance(data: {
  studentId: string;
  branchId: string;
  markedById: string;
  date: string;
}): Promise<AttendanceRecord> {
  const { data: row, error } = await supabase
    .from("attendance")
    .insert({
      student_id: data.studentId,
      branch_id: data.branchId,
      manager_id: data.markedById,
      date: data.date,
    })
    .select()
    .single();
  if (error) throw error;
  return toAttendance(row as AttendanceRow);
}

const ATTENDANCE_BULK_CHUNK = 100;

/** Insert many attendance rows (skips empty input). Caller should avoid duplicates. */
export async function insertAttendanceBulk(
  rows: {
    studentId: string;
    branchId: string;
    markedById: string;
    date: string;
  }[],
): Promise<AttendanceRecord[]> {
  if (rows.length === 0) return [];
  const created: AttendanceRecord[] = [];
  for (let i = 0; i < rows.length; i += ATTENDANCE_BULK_CHUNK) {
    const chunk = rows.slice(i, i + ATTENDANCE_BULK_CHUNK);
    const { data, error } = await supabase
      .from("attendance")
      .insert(
        chunk.map((r) => ({
          student_id: r.studentId,
          branch_id: r.branchId,
          manager_id: r.markedById,
          date: r.date,
        })),
      )
      .select();
    if (error) throw error;
    for (const row of data ?? []) {
      created.push(toAttendance(row as AttendanceRow));
    }
  }
  return created;
}

/** Delete attendance rows by id (chunked). */
export async function removeAttendanceByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  let cleared = 0;
  for (let i = 0; i < ids.length; i += ATTENDANCE_BULK_CHUNK) {
    const chunk = ids.slice(i, i + ATTENDANCE_BULK_CHUNK);
    const { data, error } = await supabase
      .from("attendance")
      .delete()
      .in("id", chunk)
      .select("id");
    if (error) throw error;
    cleared += data?.length ?? 0;
  }
  return cleared;
}

/** Delete attendance for many students on one date. */
export async function removeAttendanceForStudentsOnDate(
  studentIds: string[],
  date: string,
): Promise<number> {
  if (studentIds.length === 0) return 0;
  let cleared = 0;
  for (let i = 0; i < studentIds.length; i += ATTENDANCE_BULK_CHUNK) {
    const chunk = studentIds.slice(i, i + ATTENDANCE_BULK_CHUNK);
    const { data, error } = await supabase
      .from("attendance")
      .delete()
      .eq("date", date)
      .in("student_id", chunk)
      .select("id");
    if (error) throw error;
    cleared += data?.length ?? 0;
  }
  return cleared;
}

export async function removeAttendance(id: string): Promise<void> {
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) throw error;
}

export async function markAttendanceForDate(data: {
  studentId: string;
  branchId: string;
  markedById: string;
  date: string;
}): Promise<AttendanceRecord> {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("student_id", data.studentId)
    .eq("date", data.date);
  if (error) throw error;
  return insertAttendance(data);
}
