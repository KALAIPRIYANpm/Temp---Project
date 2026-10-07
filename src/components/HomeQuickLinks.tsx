import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "../lib/navConfig";

export function HomeQuickLinks({ items }: { items: NavItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3">
      {items.map(({ to, label, icon: Icon, description }, index) => {
        const isLast = index === items.length - 1;
        return (
          <Link
            key={to}
            to={to}
            className={`group flex items-center gap-4 rounded-2xl border border-morning/60 bg-white p-4 shadow-sm transition-colors hover:border-cerulean/30 hover:bg-morning/20 ${
              isLast ? "col-span-full" : ""
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cerulean text-white">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-cerulean">{label}</p>
              {description && (
                <p className="mt-0.5 text-sm text-mist">{description}</p>
              )}
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-mist transition-transform group-hover:translate-x-0.5 group-hover:text-cerulean"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
