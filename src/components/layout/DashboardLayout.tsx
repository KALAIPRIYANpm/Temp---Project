import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import { APP_NAME } from "../../lib/branding";
import { navItemsForRole, type NavItem } from "../../lib/navConfig";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarProfile } from "./SidebarProfile";
import type { UserRole } from "../../types";

function NavItems({
  items,
  onNavigate,
  className,
  showIcons,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className: string;
  showIcons?: boolean;
}) {
  return (
    <>
      {items.map(({ to, label, end, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${className} ${isActive ? "bg-white/15 font-medium text-honey" : ""}`
          }
        >
          {showIcons && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function DashboardLayout({ role }: { role: UserRole }) {

  const session = useStore((s) => s.session);
  const managers = useStore((s) => s.managers);
  const users = useStore((s) => s.users);
  const dataLoading = useStore((s) => s.dataLoading);
  const actionError = useStore((s) => s.actionError);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = navItemsForRole(role);
  const roleLabel =
    role === "admin" ? "Admin" : role === "manager" ? "Manager" : "User";

  const sessionWithPhoto = useMemo(() => {
    if (!session) return null;
    const photo =
      session.photo ??
      managers.find((m) => m.id === session.userId)?.photo ??
      users.find((u) => u.id === session.userId)?.photo;
    return photo && photo !== session.photo ? { ...session, photo } : session;
  }, [session, managers, users]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);


  const signOut = () => {
    void logout().then(() => navigate("/"));
  };


const sideLinkClass =
    "flex items-center gap-3 rounded px-3 py-2.5 text-sm text-morning hover:bg-white/10 min-h-[44px]";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <header className="sticky top-0 z-30 border-b border-mist/30 bg-cerulean text-white pt-safe lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight tracking-wide sm:text-base">
              {APP_NAME}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-none text-morning sm:text-xs">
              <User className="h-3 w-3 shrink-0" aria-hidden />
              <span>{roleLabel}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Open menu"
            className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white/10 hover:bg-white/20"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-cerulean/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(100%,300px)] flex-col bg-cerulean text-white shadow-xl lg:hidden">
            <div className="border-b border-mist/30 pt-safe">
              <div className="flex items-center justify-between gap-2 px-4 py-4">
                <SidebarBrand
                  roleLabel={roleLabel}
                  className="min-w-0 flex-1 items-start text-left"
                />
                <button
                  type="button"
                  aria-label="Close"
                  className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/10 hover:bg-white/20"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="border-b border-mist/30 px-4 py-4">
              <SidebarProfile session={sessionWithPhoto} onSignOut={signOut} compact />
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
              <NavItems
                items={nav}
                onNavigate={() => setMenuOpen(false)}
                className={sideLinkClass}
                showIcons
              />
            </nav>
          </aside>
        </>
      )}

      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-52 flex-col bg-cerulean text-white lg:flex">
        <div className="shrink-0 border-b border-mist/30 px-4 py-5">
          <SidebarBrand roleLabel={roleLabel} />
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2">
          <NavItems items={nav} className={sideLinkClass} showIcons />
        </nav>
        <div className="shrink-0 pb-safe">
          <SidebarProfile session={sessionWithPhoto} onSignOut={signOut} />
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-page px-3 py-3 pb-safe pt-1 sm:px-4 sm:py-4 lg:ml-52 lg:min-h-dvh lg:p-6">
        <div className="mx-auto w-full max-w-6xl min-w-0 space-y-3 sm:space-y-4">
          {dataLoading && (
            <p className="mb-3 rounded border border-morning bg-white px-3 py-2 text-sm text-mist sm:mb-4">
              Syncing data…
            </p>
          )}
          {actionError && !dataLoading && (
            <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mb-4">
              {actionError}
            </p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
