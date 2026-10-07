import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useStoreHydrated } from "../hooks/useStoreHydrated";
import type { UserRole } from "../types";

const dashboardPath: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  user: "/user",
};

export function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const hydrated = useStoreHydrated();
  const session = useStore((s) => s.session);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <p className="text-mist">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (session.role !== role && session.role !== "admin") {
    return <Navigate to={dashboardPath[session.role]} replace />;
  }

  return children;
}
