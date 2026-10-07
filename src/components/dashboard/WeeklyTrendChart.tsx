import type { DailyTrendPoint } from "../../lib/reportAnalytics";
import { REPORT_CHART_COLORS } from "../../lib/reportAnalytics";

export function WeeklyTrendChart({
  data,
  emptyLabel,
}: {
  data: DailyTrendPoint[];
  emptyLabel: string;
}) {
  const points = data.filter((point) => point.present > 0);

  if (points.length === 0) {
    return <p className="text-sm text-mist">{emptyLabel}</p>;
  }

  const width = 420;
  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const peak = Math.max(...points.map((d) => d.present), 1);
  const step = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const barWidth = Math.min(28, Math.max(8, chartW / points.length - 6));

  const linePoints = points
    .map((point, index) => {
      const x = pad.left + (points.length > 1 ? index * step : chartW / 2);
      const y = pad.top + chartH - (point.present / peak) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" aria-hidden>
        {points.map((point, index) => {
          const xCenter = pad.left + (points.length > 1 ? index * step : chartW / 2);
          const barH = (point.present / peak) * chartH;
          return (
            <rect
              key={point.date}
              x={xCenter - barWidth / 2}
              y={pad.top + chartH - barH}
              width={barWidth}
              height={barH}
              rx={4}
              fill={REPORT_CHART_COLORS.sage}
              opacity={0.85}
            />
          );
        })}
        <polyline
          fill="none"
          stroke={REPORT_CHART_COLORS.cerulean}
          strokeWidth={2.5}
          points={linePoints}
        />
        {points.map((point, index) => {
          const x = pad.left + (points.length > 1 ? index * step : chartW / 2);
          return (
            <text
              key={`${point.date}-label`}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-mist text-[9px]"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-mist">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#5a8f87]" />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-cerulean" />
          Trend
        </span>
      </div>
    </div>
  );
}
