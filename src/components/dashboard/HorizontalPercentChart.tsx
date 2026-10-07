import type { OverviewRow } from "../../lib/dashboardAnalytics";

function barTone(value: number): string {
  if (value >= 85) return "#10b981";
  if (value >= 70) return "#dcae1d";
  return "#f87171";
}

export function HorizontalPercentChart({
  rows,
  emptyLabel,
}: {
  rows: OverviewRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-mist">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.slice(0, 8).map((row) => (
        <div key={row.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-cerulean">{row.name}</span>
            <span className="shrink-0 font-medium text-cerulean">{row.percent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-morning/50">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(row.percent, 100)}%`,
                background: barTone(row.percent),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
