import type { QrPayload, Student } from "../types";

const PREFIX = "TSK";

/** Compact format — easier for cameras to read than JSON */
export function buildQrPayload(student: Student): string {
  return `${PREFIX}|${student.id}|${student.qrToken}`;
}

export function parseQrPayload(raw: string): QrPayload | null {
  const text = raw.trim();

  // TSK|studentId|token
  const pipe = text.match(/^TSK\|([^|]+)\|([^|]+)$/i);
  if (pipe) {
    return { v: 1, sid: pipe[1]!, tok: pipe[2]! };
  }

  // JSON (legacy)
  try {
    const data = JSON.parse(text) as Partial<QrPayload> & { sid?: string; tok?: string };
    if (typeof data.sid === "string" && typeof data.tok === "string") {
      return { v: 1, sid: data.sid, tok: data.tok };
    }
  } catch {
    /* not JSON */
  }

  return null;
}

export function generateQrToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
