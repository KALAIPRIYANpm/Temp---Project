import { User } from "lucide-react";
import { ProfileAvatar } from "../ProfileAvatar";
import { Button } from "../ui/Button";
import type { Session, UserRole } from "../../types";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
};

export function SidebarProfile({
  session,
  onSignOut,
  compact = false,
}: {
  session: Session | null;
  onSignOut: () => void;
  compact?: boolean;
}) {
  if (!session) return null;

  return (
    <div className={compact ? "space-y-3" : "space-y-3 border-t border-mist/30 p-4"}>
      <div className="flex items-center gap-3">
        <ProfileAvatar name={session.name} photo={session.photo} size={compact ? "sm" : "md"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{session.name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-morning">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{roleLabels[session.role]}</span>
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full !border-cerulean !bg-white !text-cerulean hover:!bg-morning min-h-[44px]"
        onClick={onSignOut}
      >
        Sign out
      </Button>
    </div>
  );
}
