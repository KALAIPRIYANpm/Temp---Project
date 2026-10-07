import type { LucideIcon } from "lucide-react";

const toneStyles = {
  cerulean: {
    card: "border-cerulean/15 bg-gradient-to-br from-white via-white to-cerulean/10",
    icon: "text-cerulean",
  },
  success: {
    card: "border-emerald-200/60 bg-gradient-to-br from-white via-white to-emerald-50",
    icon: "text-emerald-700",
  },
  danger: {
    card: "border-red-200/60 bg-gradient-to-br from-white via-white to-red-50",
    icon: "text-red-600",
  },
  honey: {
    card: "border-amber-200/60 bg-gradient-to-br from-white via-white to-amber-50",
    icon: "text-amber-700",
  },
  sage: {
    card: "border-teal-200/60 bg-gradient-to-br from-white via-white to-teal-50",
    icon: "text-teal-700",
  },
  mist: {
    card: "border-morning bg-gradient-to-br from-white via-morning/30 to-morning/60",
    icon: "text-mist",
  },
} as const;

export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  tone = "cerulean",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof toneStyles;
}) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`flex min-h-[6.5rem] flex-col justify-between rounded-2xl border p-4 shadow-sm ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-mist">{label}</p>
        <Icon className={`h-5 w-5 shrink-0 ${styles.icon}`} aria-hidden />
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight text-cerulean sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
