import type {
  GenderStackRow,
  NamedValue,
  WeeklySeries,
} from "../../lib/attendanceAnalysis";

export const ANALYSIS_COLORS = {
  male: "#2f5270",
  female: "#7fb8ad",
  other: "#dcae1d",
  grid: "#e5ecea",
  axis: "#7a9d96",
};

export const ANALYSIS_PALETTE = ["#5b8db3", "#7fb8ad", "#2e7f80", "#7aab86", "#2f5270"];

const LINE_COLORS = ["#2f7fc1", "#f28e2b", "#3a9d3a"];

function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const nice = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10;
  return nice * mag;
}

function niceScale(max: number, ticks = 4): { max: number; step: number } {
  const step = niceStep(Math.max(max, 1) / ticks);
  return { max: Math.ceil(Math.max(max, 1) / step) * step, step };
}

function shortLabel(label: string, max = 12): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-mist">{label}</div>
  );
}

function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-cerulean">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={item.line ? "h-0.5 w-4" : "h-2.5 w-2.5 rounded-sm"}
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function genderLegend(rows: GenderStackRow[]) {
  const items = [
    { label: "Male", color: ANALYSIS_COLORS.male },
    { label: "Female", color: ANALYSIS_COLORS.female },
  ];
  if (rows.some((r) => r.other > 0)) {
    items.push({ label: "Other / not set", color: ANALYSIS_COLORS.other });
  }
  return items;
}

export function GenderStackedColumns({
  rows,
  emptyLabel,
}: {
  rows: GenderStackRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <Empty label={emptyLabel} />;

  const width = 440;
  const height = 230;
  const pad = { top: 12, right: 8, bottom: 30, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const scale = niceScale(Math.max(...rows.map((r) => r.male + r.female + r.other)));
  const slot = chartW / rows.length;
  const barW = Math.min(46, slot * 0.55);
  const y = (v: number) => pad.top + chartH - (v / scale.max) * chartH;

  const ticks: number[] = [];
  for (let t = 0; t <= scale.max; t += scale.step) ticks.push(t);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={ANALYSIS_COLORS.grid} />
            <text x={pad.left - 6} y={y(t) + 3} textAnchor="end" className="fill-mist text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {rows.map((row, i) => {
          const x = pad.left + slot * i + (slot - barW) / 2;
          const segments = [
            { value: row.male, color: ANALYSIS_COLORS.male, label: "Male" },
            { value: row.female, color: ANALYSIS_COLORS.female, label: "Female" },
            { value: row.other, color: ANALYSIS_COLORS.other, label: "Other" },
          ];
          let base = 0;
          return (
            <g key={row.name}>
              {segments.map((seg) => {
                if (seg.value === 0) return null;
                const top = y(base + seg.value);
                const h = y(base) - top;
                base += seg.value;
                return (
                  <rect key={seg.label} x={x} y={top} width={barW} height={h} fill={seg.color}>
                    <title>{`${row.name} · ${seg.label}: ${seg.value}`}</title>
                  </rect>
                );
              })}
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-cerulean text-[10px]"
              >
                {shortLabel(row.name)}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend items={genderLegend(rows)} />
    </div>
  );
}

export function WeeklyLineChart({
  series,
  emptyLabel,
}: {
  series: WeeklySeries[];
  emptyLabel: string;
}) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (all.length === 0) return <Empty label={emptyLabel} />;

  const width = 440;
  const height = 230;
  const pad = { top: 12, right: 16, bottom: 30, left: 36 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  let lo = Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10);
  let hi = Math.min(100, Math.ceil((Math.max(...all) + 2) / 10) * 10);
  if (hi - lo < 10) {
    if (hi < 100) hi = lo + 10;
    else lo = hi - 10;
  }
  const step = hi - lo <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);

  const x = (i: number) => pad.left + (chartW / 4) * i;
  const y = (v: number) => pad.top + chartH - ((v - lo) / (hi - lo)) * chartH;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={ANALYSIS_COLORS.grid} />
            <text x={pad.left - 6} y={y(t) + 3} textAnchor="end" className="fill-mist text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <text key={i} x={x(i)} y={height - 10} textAnchor="middle" className="fill-mist text-[10px]">
            W{i + 1}
          </text>
        ))}
        {series.map((s, si) => {
          const color = LINE_COLORS[si % LINE_COLORS.length];
          const segments: string[][] = [];
          let current: string[] = [];
          s.values.forEach((v, i) => {
            if (v === null) {
              if (current.length) segments.push(current);
              current = [];
            } else {
              current.push(`${x(i)},${y(v)}`);
            }
          });
          if (current.length) segments.push(current);
          return (
            <g key={s.label}>
              {segments
                .filter((seg) => seg.length > 1)
                .map((seg, k) => (
                  <polyline key={k} fill="none" stroke={color} strokeWidth={2.5} points={seg.join(" ")} />
                ))}
              {s.values.map((v, i) =>
                v === null ? null : (
                  <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={color}>
                    <title>{`${s.label} · W${i + 1}: ${v}%`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
      </svg>
      <Legend
        items={series.map((s, si) => ({
          label: s.label,
          color: LINE_COLORS[si % LINE_COLORS.length]!,
          line: true,
        }))}
      />
    </div>
  );
}

export function PercentBars({
  rows,
  emptyLabel,
  limit = 8,
}: {
  rows: NamedValue[];
  emptyLabel: string;
  limit?: number;
}) {
  if (rows.length === 0) return <Empty label={emptyLabel} />;

  return (
    <div className="space-y-3">
      {rows.slice(0, limit).map((row, i) => (
        <div key={row.name} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate text-right text-cerulean sm:w-36" title={row.name}>
            {row.name}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-morning/40">
            <div
              className="h-full rounded"
              style={{
                width: `${Math.min(row.value, 100)}%`,
                background: ANALYSIS_PALETTE[i % ANALYSIS_PALETTE.length],
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-medium tabular-nums text-cerulean">
            {row.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function GenderStackedBars({
  rows,
  emptyLabel,
}: {
  rows: GenderStackRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <Empty label={emptyLabel} />;

  const max = Math.max(...rows.map((r) => r.male + r.female + r.other), 1);

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => {
          const total = row.male + row.female + row.other;
          return (
            <div key={row.name} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 truncate text-right text-cerulean">{row.name}</span>
              <div className="flex h-6 flex-1 overflow-hidden rounded bg-morning/30">
                <div className="flex h-full" style={{ width: `${(total / max) * 100}%` }}>
                  {[
                    { value: row.male, color: ANALYSIS_COLORS.male, label: "Male" },
                    { value: row.female, color: ANALYSIS_COLORS.female, label: "Female" },
                    { value: row.other, color: ANALYSIS_COLORS.other, label: "Other" },
                  ].map((seg) =>
                    seg.value > 0 ? (
                      <div
                        key={seg.label}
                        className="h-full"
                        style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
                        title={`${seg.label}: ${seg.value}`}
                      />
                    ) : null,
                  )}
                </div>
              </div>
              <span className="w-24 shrink-0 tabular-nums text-mist">
                M {row.male} · F {row.female}
              </span>
            </div>
          );
        })}
      </div>
      <Legend items={genderLegend(rows)} />
    </div>
  );
}

export function ValueColumns({
  rows,
  emptyLabel,
  limit = 8,
}: {
  rows: NamedValue[];
  emptyLabel: string;
  limit?: number;
}) {
  const data = rows.slice(0, limit);
  if (data.length === 0) return <Empty label={emptyLabel} />;

  const width = 440;
  const height = 230;
  const pad = { top: 18, right: 8, bottom: 30, left: 36 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const scale = niceScale(Math.max(...data.map((r) => r.value)));
  const slot = chartW / data.length;
  const barW = Math.min(44, slot * 0.6);
  const y = (v: number) => pad.top + chartH - (v / scale.max) * chartH;

  const ticks: number[] = [];
  for (let t = 0; t <= scale.max; t += scale.step) ticks.push(t);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={ANALYSIS_COLORS.grid} />
          <text x={pad.left - 6} y={y(t) + 3} textAnchor="end" className="fill-mist text-[10px]">
            {t}
          </text>
        </g>
      ))}
      {data.map((row, i) => {
        const x = pad.left + slot * i + (slot - barW) / 2;
        return (
          <g key={row.name}>
            <rect
              x={x}
              y={y(row.value)}
              width={barW}
              height={y(0) - y(row.value)}
              fill={ANALYSIS_PALETTE[i % ANALYSIS_PALETTE.length]}
            >
              <title>{`${row.name}: ${row.value}`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={y(row.value) - 4}
              textAnchor="middle"
              className="fill-cerulean text-[10px] font-medium"
            >
              {row.value}
            </text>
            <text x={x + barW / 2} y={height - 10} textAnchor="middle" className="fill-cerulean text-[10px]">
              {shortLabel(row.name, 11)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DistributionBlocks({
  rows,
  emptyLabel,
  unit,
}: {
  rows: NamedValue[];
  emptyLabel: string;
  unit: string;
}) {
  if (rows.length === 0) return <Empty label={emptyLabel} />;

  return (
    <div className="flex min-h-48 items-center justify-center">
      <div className="flex w-full max-w-md flex-wrap gap-1 rounded-lg border border-morning bg-morning/20 p-1">
        {rows.map((row, i) => (
          <div
            key={row.name}
            className="min-w-[7rem] rounded px-3 py-2 text-white"
            style={{
              flexGrow: row.value,
              flexBasis: 0,
              background: ANALYSIS_PALETTE[(i + 2) % ANALYSIS_PALETTE.length],
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide">{row.name}</p>
            <p className="text-[11px] opacity-90">
              {row.value.toLocaleString()} {unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
