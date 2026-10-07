import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const ORG_NAME = "Harimandir Balopasana";

export interface BranchSummary {
  name: string;
  present: number;
  absent: number;
}

export interface AttendancePdfInput {
  periodLabel: string;
  fromLabel: string;
  toLabel: string;
  branches: BranchSummary[];
  // Flat report rows (same as the CSV). Grouped by the column whose key contains "branch".
  rows: Record<string, unknown>[];
}

const FONT = "times";
const BLACK: [number, number, number] = [20, 20, 20];
const GREY: [number, number, number] = [95, 95, 95];
const LIGHT: [number, number, number] = [236, 236, 236];
const RULE: [number, number, number] = [170, 170, 170];

const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

function drawHeader(doc: jsPDF, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setTextColor(...BLACK);
  doc.setFont(FONT, "bold");
  doc.setFontSize(16);
  doc.text(ORG_NAME.toUpperCase(), 14, 14);
  doc.setFont(FONT, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(subtitle, w - 14, 14, { align: "right" });
  // double rule
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(14, 18, w - 14, 18);
  doc.setLineWidth(0.2);
  doc.line(14, 19.4, w - 14, 19.4);
}

/** Four-column summary strip drawn as a bordered table. */
function summaryStrip(
  doc: jsPDF,
  y: number,
  enrolled: number,
  present: number,
  absent: number,
) {
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["Enrolled", "Present", "Absent", "Attendance"]],
    body: [[String(enrolled), String(present), String(absent), `${pct(present, enrolled)}%`]],
    styles: {
      font: FONT,
      halign: "center",
      lineColor: RULE,
      lineWidth: 0.25,
      textColor: BLACK,
    },
    headStyles: { fillColor: LIGHT, textColor: BLACK, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 15, fontStyle: "bold", cellPadding: 4 },
  });
}

export function downloadAttendancePdf(input: AttendancePdfInput, fileName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const range = `${input.fromLabel}${
    input.fromLabel !== input.toLabel ? ` to ${input.toLabel}` : ""
  }`;
  const subtitle = `Attendance Report  |  ${range}`;

  doc.setProperties({ title: `${ORG_NAME} - Attendance Report`, author: ORG_NAME });

  const branchKey = input.rows.length
    ? Object.keys(input.rows[0]).find((k) => /branch/i.test(k))
    : undefined;
  const columns = input.rows.length
    ? Object.keys(input.rows[0]).filter((k) => k !== branchKey)
    : [];
  const rowsFor = (name: string) =>
    branchKey ? input.rows.filter((r) => String(r[branchKey]) === name) : input.rows;

  const startPage: Record<string, number> = {};

  // ---- Department pages (page 1 reserved for the summary) ----
  input.branches.forEach((b) => {
    doc.addPage();
    startPage[b.name] = doc.getNumberOfPages();
    doc.outline.add(null, b.name, { pageNumber: startPage[b.name] });
    const total = b.present + b.absent;

    doc.setTextColor(...BLACK);
    doc.setFont(FONT, "bold");
    doc.setFontSize(18);
    doc.text(b.name, 14, 34);
    doc.setFont(FONT, "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...GREY);
    doc.text(`Department attendance  |  ${input.periodLabel}  |  ${range}`, 14, 40);

    summaryStrip(doc, 46, total, b.present, b.absent);

    const body = rowsFor(b.name).map((r) => columns.map((c) => String(r[c] ?? "")));
    if (body.length === 0) {
      doc.setFont(FONT, "italic");
      doc.setFontSize(11);
      doc.setTextColor(...GREY);
      doc.text("No attendance was recorded for this department in the selected period.", 14, 82);
    } else {
      doc.setFont(FONT, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...BLACK);
      doc.text("Attendance Register", 14, 80);
      autoTable(doc, {
        startY: 83,
        margin: { top: 26, left: 14, right: 14, bottom: 18 },
        theme: "grid",
        head: [columns],
        body,
        styles: {
          font: FONT,
          fontSize: 9.5,
          cellPadding: 2,
          textColor: BLACK,
          lineColor: RULE,
          lineWidth: 0.2,
        },
        headStyles: { fillColor: LIGHT, textColor: BLACK, fontStyle: "bold" },
        didDrawPage: () => drawHeader(doc, subtitle),
      });
    }
  });

  // ---- Summary page ----
  doc.setPage(1);
  drawHeader(doc, subtitle);
  const totalPresent = input.branches.reduce((s, b) => s + b.present, 0);
  const totalAbsent = input.branches.reduce((s, b) => s + b.absent, 0);
  const grand = totalPresent + totalAbsent;

  doc.setTextColor(...BLACK);
  doc.setFont(FONT, "bold");
  doc.setFontSize(24);
  doc.text("Attendance Report", pageW / 2, 40, { align: "center" });
  doc.setFont(FONT, "italic");
  doc.setFontSize(11.5);
  doc.setTextColor(...GREY);
  doc.text(`${input.periodLabel}  |  ${range}`, pageW / 2, 47, { align: "center" });

  summaryStrip(doc, 56, grand, totalPresent, totalAbsent);

  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BLACK);
  doc.text("Department Summary", 14, 92);
  doc.setFont(FONT, "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  doc.text("Select a department name to go to its page.", 14, 97);

  autoTable(doc, {
    startY: 101,
    margin: { left: 14, right: 14, bottom: 18 },
    theme: "grid",
    head: [["Department", "Enrolled", "Present", "Absent", "Attendance"]],
    body: input.branches.map((b) => {
      const t = b.present + b.absent;
      return [b.name, String(t), String(b.present), String(b.absent), `${pct(b.present, t)}%`];
    }),
    styles: {
      font: FONT,
      fontSize: 10.5,
      cellPadding: 2.5,
      textColor: BLACK,
      lineColor: RULE,
      lineWidth: 0.2,
    },
    headStyles: { fillColor: LIGHT, textColor: BLACK, fontStyle: "bold" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    // clickable department names
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const name = input.branches[data.row.index]?.name;
        const page = name ? startPage[name] : undefined;
        if (page) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            pageNumber: page,
          });
        }
      }
    },
  });

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  const h = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(14, h - 13, pageW - 14, h - 13);
    doc.setFont(FONT, "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(
      `${ORG_NAME}  |  Generated on ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      14,
      h - 8,
    );
    doc.text(`Page ${p} of ${pages}`, pageW - 14, h - 8, { align: "right" });
  }

  doc.save(fileName);
}