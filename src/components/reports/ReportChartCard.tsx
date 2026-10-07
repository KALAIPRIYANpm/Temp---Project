import type { ReactNode } from "react";

export function ReportChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-morning/60 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="font-medium text-cerulean">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-mist">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
