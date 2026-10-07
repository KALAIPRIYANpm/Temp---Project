import type { Branch } from "../types";

export type BranchInput = Omit<Branch, "id" | "createdAt">;

export function emptyBranchInput(): BranchInput {
  return {
    name: "",
    branchName: "",
    city: "",
    country: "",
    address: "",
    mapLocation: "",
    contact1Name: "",
    contact1Phone: "",
    contact2Name: "",
    contact2Phone: "",
  };
}

export function branchFromRecord(branch: Branch): BranchInput {
  return {
    name: branch.name,
    branchName: branch.branchName,
    city: branch.city,
    country: branch.country,
    address: branch.address,
    mapLocation: branch.mapLocation,
    contact1Name: branch.contact1Name,
    contact1Phone: branch.contact1Phone,
    contact2Name: branch.contact2Name,
    contact2Phone: branch.contact2Phone,
  };
}

export function formatBranchFullLocation(branch: Branch): string {
  const parts: string[] = [];
  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (parts.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;
    parts.push(trimmed);
  };
  add(branch.city);
  add(branch.country);
  add(branch.address);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function formatBranchLocation(branch: Branch): string {
  const parts = [branch.city, branch.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (branch.address) return branch.address;
  return "—";
}

export function branchListTitle(branch: Branch): string {
  return branch.branchName.trim() || branch.name;
}
