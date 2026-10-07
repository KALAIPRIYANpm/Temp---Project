import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-3 sm:p-4",
  md: "p-3 sm:p-5",
  lg: "p-4 sm:p-6",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded border border-morning bg-white shadow-sm ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Horizontal card: content left, actions right on sm+ */
export function CardRow({
  children,
  actions,
  className = "",
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex w-full shrink-0 flex-row flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-2.5 [&>button]:min-h-[44px]">
          {actions}
        </div>
      )}
    </Card>
  );
}
