import type { ReactNode } from "react";

export function ReportChartFrame({
  children,
  height = 300,
}: {
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      {children}
    </div>
  );
}
