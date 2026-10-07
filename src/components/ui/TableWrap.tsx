import type { ReactNode } from "react";

export function TableWrap({ children, hint }: { children: ReactNode; hint?: boolean }) {
  return (
    <div className="space-y-2">
      {hint !== false && (
        <p className="text-xs text-mist md:hidden">Swipe sideways to see all columns →</p>
      )}
      <div className="table-scroll -mx-1 scroll-hint px-1 pb-1">{children}</div>
    </div>
  );
}

export const tableHeadCell = "px-3 py-3 align-middle font-medium text-mist";
export const tableCell = "px-3 py-3 align-middle text-cerulean";
export const tableCellMuted = "px-3 py-3 align-middle text-mist";
export const tableActionsCell = "px-3 py-3 align-middle text-right whitespace-nowrap";
