/** Quick QR payload tests — run: node scripts/test-qr.mjs */

const PREFIX = "TSK";

function buildQrPayload(student) {
  return `${PREFIX}|${student.id}|${student.qrToken}`;
}

function parseQrPayload(raw) {
  const text = raw.trim();
  const pipe = text.match(/^TSK\|([^|]+)\|([^|]+)$/i);
  if (pipe) return { v: 1, sid: pipe[1], tok: pipe[2] };
  try {
    const data = JSON.parse(text);
    if (typeof data.sid === "string" && typeof data.tok === "string") {
      return { v: 1, sid: data.sid, tok: data.tok };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const student = { id: "stu-1", qrToken: "a1b2c3d4e5f67890" };
const payload = buildQrPayload(student);
const parsed = parseQrPayload(payload);
const legacy = parseQrPayload(
  JSON.stringify({ v: 1, sid: "stu-1", tok: "a1b2c3d4e5f67890" }),
);

console.log("New format:", payload);
console.log("Parse new:", parsed?.sid === "stu-1" ? "OK" : "FAIL");
console.log("Parse legacy JSON:", legacy?.sid === "stu-1" ? "OK" : "FAIL");

if (!parsed || !legacy) process.exit(1);
console.log("All QR parser tests passed.");
