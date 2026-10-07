import type { ReactNode } from "react";

/** Stacked label/value block for small screens instead of wide tables */
export function MobileCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-morning bg-page/50 p-4 ${className}`}
    >
      <p className="font-medium text-cerulean">{title}</p>
      {subtitle && <p className="mt-0.5 text-sm text-mist">{subtitle}</p>}
      {children && <div className="mt-3 space-y-2 text-sm">{children}</div>}
    </div>
  );
}

export function MobileCardRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-mist">{label}</span>
      <span className="text-cerulean">{value}</span>
    </div>
  );
}
