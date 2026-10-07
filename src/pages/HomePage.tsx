import { useStore } from "../store/useStore";
import { APP_NAME } from "../lib/branding";
import { homeQuickLinks } from "../lib/navConfig";
import { HomeHeaderBanner } from "../components/HomeHeaderBanner";
import { HomeQuickLinks } from "../components/HomeQuickLinks";
import type { UserRole } from "../types";

export function HomePage({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const links = homeQuickLinks(role);

  return (
    <div className="space-y-5 sm:space-y-6">
      <HomeHeaderBanner className="!mb-0 rounded-2xl border border-morning/60 shadow-sm" />

      <div className="text-center sm:text-left">
        <h1 className="text-xl font-semibold text-cerulean sm:text-2xl">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-mist">
          Welcome{session?.name ? `, ${session.name}` : ""}. Choose a section below.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-mist">
          Quick access
        </h2>
        <HomeQuickLinks items={links} />
      </div>
    </div>
  );
}
