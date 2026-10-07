import { format } from "date-fns";
import { CalendarDays, LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";
import { APP_NAME } from "../lib/branding";
import { homeQuickLinks } from "../lib/navConfig";
import { HomeQuickLinks } from "../components/HomeQuickLinks";
import type { UserRole } from "../types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Branch Manager",
  user: "Staff",
} as Record<UserRole, string>;

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const links = homeQuickLinks(role);

  const now = new Date();
  const firstName = session?.name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cerulean via-cerulean to-cerulean/70 p-6 text-white shadow-lg sm:p-8 lg:p-10">
        {/* decorative layers */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-honey/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 top-8 hidden h-24 w-24 rotate-12 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm sm:block lg:right-14 lg:top-10 lg:h-32 lg:w-32"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 right-24 hidden h-14 w-14 -rotate-6 rounded-2xl border border-white/20 bg-honey/40 backdrop-blur-sm md:block"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {/* chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                {ROLE_LABEL[role] ?? "Member"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(now, "EEEE, d MMMM yyyy")}
              </span>
            </div>

            {/* greeting */}
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-white/80">
              <Sparkles className="h-4 w-4 text-honey" />
              {greeting(now.getHours())}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {firstName ? (
                <>
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-white to-honey bg-clip-text text-transparent">
                    {firstName}
                  </span>
                </>
              ) : (
                "Welcome back"
              )}
            </h1>
            <p className="mt-3 text-sm text-white/80 sm:text-base">
              You’re in{" "}
              <span className="font-semibold text-white">{APP_NAME}</span>. Pick a section
              below to take attendance, check reports or manage your records.
            </p>
          </div>

          {/* glass stat */}
          <div className="flex w-full items-center gap-4 rounded-2xl bg-white/12 p-4 ring-1 ring-white/25 backdrop-blur-md sm:w-auto lg:min-w-[220px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-semibold leading-none">{links.length}</p>
              <p className="mt-1 text-xs text-white/75">sections ready for you</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Quick access ============ */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-cerulean to-honey" />
          <div>
            <h2 className="text-lg font-semibold leading-tight text-cerulean">
              Quick access
            </h2>
            <p className="text-xs text-mist">Jump straight to what you need</p>
          </div>
          <span className="ml-auto rounded-full border border-morning bg-white px-2.5 py-1 text-xs font-medium text-cerulean">
            {links.length} shortcuts
          </span>
        </div>
        <HomeQuickLinks items={links} />
      </section>
    </div>
  );
}
