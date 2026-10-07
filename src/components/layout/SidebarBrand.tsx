import { User } from "lucide-react";
import { APP_NAME } from "../../lib/branding";

export function SidebarBrand({
  roleLabel,
  className = "items-center text-center",
}: {
  roleLabel: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <p className="text-sm font-semibold leading-snug tracking-wide text-white">
        {APP_NAME}
      </p>
      <p className="flex items-center gap-1.5 text-xs text-morning">
        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{roleLabel}</span>
      </p>
    </div>
  );
}
