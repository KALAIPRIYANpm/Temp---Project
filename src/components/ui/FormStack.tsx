import type { ReactNode } from "react";

/** Consistent vertical spacing for modal and page forms */
export function FormStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

/** Primary actions row for modal footers */
export function FormActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid w-full grid-cols-2 gap-3 [&>button]:min-h-[44px] [&>button]:w-full [&>button]:min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}
