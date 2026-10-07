import type { ReactNode } from "react";

export function DashboardPanel({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-morning/50 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-morning/40 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-semibold text-cerulean">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-mist sm:text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 p-4 sm:p-5">{children}</div>
    </section>
  );
}
