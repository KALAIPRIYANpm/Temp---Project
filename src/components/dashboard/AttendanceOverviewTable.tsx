import type { OverviewRow } from "../../lib/dashboardAnalytics";

function percentTone(value: number): string {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-honey";
  return "bg-red-400";
}

export function AttendanceOverviewTable({
  rows,
  nameLabel,
  metaLabel,
  emptyLabel,
}: {
  rows: OverviewRow[];
  nameLabel: string;
  metaLabel?: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-mist">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-morning text-left text-xs font-medium uppercase tracking-wide text-mist">
            <th className="px-2 py-2">{nameLabel}</th>
            {metaLabel && <th className="px-2 py-2">{metaLabel}</th>}
            <th className="px-2 py-2 text-right">Students</th>
            <th className="px-2 py-2 text-right">Present</th>
            <th className="px-2 py-2 text-right">Absent</th>
            <th className="px-2 py-2">Attendance %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-morning/60 last:border-0">
              <td className="px-2 py-2.5 font-medium text-cerulean">{row.name}</td>
              {metaLabel && (
                <td className="px-2 py-2.5 text-mist">{row.meta ?? "—"}</td>
              )}
              <td className="px-2 py-2.5 text-right text-cerulean">{row.total}</td>
              <td className="px-2 py-2.5 text-right text-emerald-700">{row.present}</td>
              <td className="px-2 py-2.5 text-right text-red-600">{row.absent}</td>
              <td className="px-2 py-2.5">
                <div className="flex min-w-[7rem] items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-morning/50">
                    <div
                      className={`h-full rounded-full ${percentTone(row.percent)}`}
                      style={{ width: `${Math.min(row.percent, 100)}%` }}
                 />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-cerulean">
                    {row.percent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
