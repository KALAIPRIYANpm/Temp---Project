import { useId } from "react";
import type { ChartSlice } from "../../lib/reportAnalytics";
import { REPORT_CHART_COLORS } from "../../lib/reportAnalytics";
import { ReportChartFrame } from "./ReportChartFrame";

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 96;
const INNER_R = 62;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(start: number, end: number) {
  if (end - start >= 359.99) {
    const mid = polar(CX, CY, OUTER_R, 180);
    const midInner = polar(CX, CY, INNER_R, 180);
    const startOuter = polar(CX, CY, OUTER_R, 0);
    const endOuter = polar(CX, CY, OUTER_R, 359.99);
    const startInner = polar(CX, CY, INNER_R, 359.99);
    const endInner = polar(CX, CY, INNER_R, 0);
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${OUTER_R} ${OUTER_R} 0 1 1 ${mid.x} ${mid.y}`,
      `A ${OUTER_R} ${OUTER_R} 0 1 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${INNER_R} ${INNER_R} 0 1 0 ${midInner.x} ${midInner.y}`,
      `A ${INNER_R} ${INNER_R} 0 1 0 ${endInner.x} ${endInner.y}`,
      "Z",
    ].join(" ");
  }

  const startOuter = polar(CX, CY, OUTER_R, start);
  const endOuter = polar(CX, CY, OUTER_R, end);
  const startInner = polar(CX, CY, INNER_R, end);
  const endInner = polar(CX, CY, INNER_R, start);
  const largeArc = end - start > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  data,
  emptyLabel,
}: {
  data: ChartSlice[];
  emptyLabel: string;
}) {
  const titleId = useId();
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <ReportChartFrame>
        <div className="flex h-full items-center justify-center text-sm text-mist">
          {emptyLabel}
        </div>
      </ReportChartFrame>
    );
  }

  let angle = 0;
  const slices = data.map((slice) => {
    const sweep = (slice.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...slice,
      path: donutSlicePath(start, end),
      pct: Math.round((slice.value / total) * 100),
    };
  });

  return (
    <ReportChartFrame>
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-labelledby={titleId}
          className="h-[180px] w-[180px] shrink-0 sm:h-[200px] sm:w-[200px]"
        >
          <title id={titleId}>Donut chart</title>
          {slices.map((slice) => (
            <path
              key={slice.name}
              d={slice.path}
              fill={slice.fill ?? REPORT_CHART_COLORS.cerulean}
              stroke="#fff"
              strokeWidth={2}
            >
              <title>
                {slice.name}: {slice.value} ({slice.pct}%)
              </title>
            </path>
          ))}
        </svg>

        <ul className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1">
          {slices.map((slice) => (
            <li
              key={slice.name}
              className="flex items-center gap-2 whitespace-nowrap text-xs text-cerulean sm:text-sm"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: slice.fill ?? REPORT_CHART_COLORS.cerulean }}
                aria-hidden
              />
              <span>
                {slice.name} · {slice.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ReportChartFrame>
  );
}
