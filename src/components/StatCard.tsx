import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl p-4 shadow-md sm:p-5 ${
        featured
          ? "bg-gradient-to-br from-cerulean via-[#1a5563] to-mist text-white"
          : "border border-morning/60 bg-white"
      }`}
    >
      <div className="min-w-0">
        <p
          className={`flex items-center gap-1.5 text-sm font-medium leading-snug ${
            featured ? "text-morning" : "text-mist"
          }`}
        >
          {Icon && (
            <Icon
              className={`h-4 w-4 shrink-0 ${featured ? "text-white" : "text-mist"}`}
              aria-hidden
            />
          )}
          <span>{label}</span>
        </p>
        {detail && (
          <p
            className={`mt-1 pl-5 text-xs leading-snug sm:text-sm ${
              featured ? "text-morning/90" : "text-mist"
            }`}
          >
            {detail}
          </p>
        )}
      </div>

      <p
        className={`mt-4 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
          featured ? "text-white" : "text-cerulean"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
