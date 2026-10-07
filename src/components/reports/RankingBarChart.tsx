import { REPORT_CHART_COLORS } from "../../lib/reportAnalytics";
import { ReportChartFrame } from "./ReportChartFrame";

export type RankRow = { name: string; value: number };

const BAR_COLORS = [
  REPORT_CHART_COLORS.cerulean,
  REPORT_CHART_COLORS.sage,
  REPORT_CHART_COLORS.mist,
  REPORT_CHART_COLORS.honey,
  REPORT_CHART_COLORS.deep,
];

export function RankingBarChart({
  data,
  emptyLabel,
  accent = REPORT_CHART_COLORS.cerulean,
}: {
  data: RankRow[];
  emptyLabel: string;
  accent?: string;
}) {
  if (data.length === 0) {
    return (
      <ReportChartFrame height={220}>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  const peak = Math.max(...data.map((d) => d.value), 1);

  return (
    <ReportChartFrame height={220}>
      <div className="flex h-full flex-col justify-center gap-3">
        {data.map((row, index) => (
          <div key={`${row.name}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-cerulean">{row.name}</span>
                <span className="shrink-0 font-medium text-cerulean">{row.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-morning/50">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((row.value / peak) * 100, row.value > 0 ? 8 : 0)}%`,
                    background: BAR_COLORS[index % BAR_COLORS.length] ?? accent,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ReportChartFrame>
  );
}

export function MetricBarChart({
  data,
  emptyLabel,
}: {
  data: RankRow[];
  emptyLabel: string;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <ReportChartFrame>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  const peak = Math.max(...data.map((d) => d.value), 1);
  const colors = [
    REPORT_CHART_COLORS.cerulean,
    REPORT_CHART_COLORS.sage,
    REPORT_CHART_COLORS.honey,
  ];

  return (
    <ReportChartFrame>
      <div className="flex h-[220px] items-end justify-center gap-4 sm:gap-6">
        {data.map((row, index) => {
          const height = Math.max((row.value / peak) * 100, row.value > 0 ? 8 : 0);
          return (
            <div
              key={row.name}
              className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2"
            >
              <span className="text-sm font-semibold text-cerulean">{row.value}</span>
              <div className="flex h-[160px] w-full items-end justify-center">
                <div
                  className="w-10 max-w-full rounded-t-lg sm:w-12"
                  style={{
                    height: `${height}%`,
                    background: colors[index % colors.length],
                  }}
                  title={`${row.name}: ${row.value}`}
                />
              </div>
              <span className="text-center text-xs text-mist">{row.name}</span>
            </div>
          );
        })}
      </div>
    </ReportChartFrame>
  );
}

export function SchoolBarChart({
  data,
  emptyLabel,
}: {
  data: RankRow[];
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return (
      <ReportChartFrame height={280}>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  const peak = Math.max(...data.map((d) => d.value), 1);

  return (
    <ReportChartFrame height={280}>
      <div className="flex h-full items-end gap-2 overflow-x-auto pb-1">
        {data.map((row, index) => {
          const height = Math.max((row.value / peak) * 100, row.value > 0 ? 6 : 0);
          return (
            <div
              key={`${row.name}-${index}`}
              className="flex min-w-[3.5rem] flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-[200px] w-full items-end justify-center">
                <div
                  className="w-8 rounded-t sm:w-10"
                  style={{
                    height: `${height}%`,
                    background: BAR_COLORS[index % BAR_COLORS.length],
                  }}
                  title={`${row.name}: ${row.value}`}
                />
              </div>
              <span className="max-w-full truncate text-center text-[10px] text-mist sm:text-xs">
                {row.name}
              </span>
            </div>
          );
        })}
      </div>
    </ReportChartFrame>
  );
}
