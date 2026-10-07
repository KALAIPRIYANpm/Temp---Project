import type { BranchTrendPoint, DailyTrendPoint } from "../../lib/reportAnalytics";
import { REPORT_CHART_COLORS } from "../../lib/reportAnalytics";
import { ReportChartFrame } from "./ReportChartFrame";

type BarSeries = {
  key: string;
  label: string;
  color: string;
};

function maxValue(rows: Record<string, string | number>[], keys: string[]) {
  let max = 0;
  for (const row of rows) {
    for (const key of keys) {
      const value = Number(row[key]) || 0;
      if (value > max) max = value;
    }
  }
  return Math.max(max, 1);
}

function ChartLegend({ series }: { series: BarSeries[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-4">
      {series.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-sm text-cerulean">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function GroupedBars({
  rows,
  labelKey,
  series,
}: {
  rows: Record<string, string | number>[];
  labelKey: string;
  series: BarSeries[];
}) {
  const peak = maxValue(rows, series.map((s) => s.key));

  return (
    <div className="flex h-[220px] items-end gap-2 overflow-x-auto pb-1">
      {rows.map((row, index) => (
        <div
          key={`${String(row[labelKey])}-${index}`}
          className="flex min-w-[2.5rem] flex-1 flex-col items-center gap-2"
        >
          <div className="flex h-[180px] w-full items-end justify-center gap-1">
            {series.map((item) => {
              const value = Number(row[item.key]) || 0;
              const height = Math.max((value / peak) * 100, value > 0 ? 6 : 0);
              return (
                <div
                  key={item.key}
                  className="w-3 rounded-t sm:w-3.5"
                  style={{
                    height: `${height}%`,
                    background: item.color,
                  }}
                  title={`${item.label}: ${value}`}
                />
              );
            })}
          </div>
          <span className="max-w-full truncate text-center text-[10px] text-mist sm:text-xs">
            {String(row[labelKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DailyBarChart({
  data,
  emptyLabel,
}: {
  data: DailyTrendPoint[];
  emptyLabel: string;
}) {
  const series: BarSeries[] = [
    { key: "present", label: "Present", color: REPORT_CHART_COLORS.cerulean },
    { key: "absent", label: "Absent", color: REPORT_CHART_COLORS.morning },
  ];

  if (data.length === 0) {
    return (
      <ReportChartFrame>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  const points = data.filter((point) => point.present > 0);
  if (points.length === 0) {
    return (
      <ReportChartFrame>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  return (
    <ReportChartFrame>
      <GroupedBars rows={points} labelKey="label" series={series} />
      <ChartLegend series={series} />
    </ReportChartFrame>
  );
}

export function BranchBarChart({ data }: { data: BranchTrendPoint[] }) {
  const series: BarSeries[] = [
    { key: "present", label: "Present", color: REPORT_CHART_COLORS.cerulean },
    { key: "absent", label: "Absent", color: REPORT_CHART_COLORS.honey },
  ];

  return (
    <ReportChartFrame>
      <GroupedBars rows={data} labelKey="name" series={series} />
      <ChartLegend series={series} />
    </ReportChartFrame>
  );
}
