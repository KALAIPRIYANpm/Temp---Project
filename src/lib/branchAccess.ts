import type { Session } from "../types";

/** Admin sees all branches; manager/user only their own. */
export function canAccessBranch(session: Session | null, branchId: string): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return Boolean(session.branchId && session.branchId === branchId);
}

export function branchAccessError(session: Session | null, branchId: string): string | null {
  if (!session) return "Not signed in.";
  if (session.role === "admin") return null;
  if (!session.branchId) return "No branch assigned to your account. Contact admin.";
  if (session.branchId !== branchId) {
    return "This student belongs to a different branch.";
  }
  return null;
}
