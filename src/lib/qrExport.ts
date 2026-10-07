import JSZip from "jszip";
import QRCode from "qrcode";
import { buildQrPayload } from "./qr";
import type { Student } from "../types";

const QR_SIZE = 280;
const PADDING = 24;
const LINE_HEIGHT = 22;

function safeFileName(student: Student): string {
  const slug = student.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${student.rollNumber}-${slug || "student"}-qr.png`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function renderStudentQrPng(
  student: Student,
  branchName?: string,
): Promise<Blob> {
  const payload = buildQrPayload(student);
  const lines = [
    student.name,
    `Roll ${student.rollNumber} · Class ${student.class}`,
    ...(branchName ? [branchName] : []),
  ];

  const canvas = document.createElement("canvas");
  const textHeight = lines.length * LINE_HEIGHT + 20;
  canvas.width = QR_SIZE + PADDING * 2;
  canvas.height = QR_SIZE + PADDING * 2 + textHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create image.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, payload, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: "H",
  });
  ctx.drawImage(qrCanvas, PADDING, PADDING);

  let y = QR_SIZE + PADDING + 28;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    ctx.fillStyle = i === 0 ? "#00303f" : "#7a9d96";
    ctx.font = i === 0 ? "bold 16px system-ui, sans-serif" : "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(line, canvas.width / 2, y);
    y += LINE_HEIGHT;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create QR image."));
    }, "image/png");
  });
}

export async function downloadStudentQrPng(
  student: Student,
  branchName?: string,
): Promise<void> {
  const blob = await renderStudentQrPng(student, branchName);
  triggerBlobDownload(blob, safeFileName(student));
}

export async function downloadStudentsQrZip(
  students: Student[],
  getBranchName: (branchId: string) => string | undefined,
  zipFilename: string,
): Promise<void> {
  if (students.length === 0) return;

  const zip = new JSZip();
  for (const student of students) {
    const blob = await renderStudentQrPng(student, getBranchName(student.branchId));
    zip.file(safeFileName(student), blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(content, zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`);
}
