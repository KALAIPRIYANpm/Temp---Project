import type { ReactNode } from "react";

type Tone = "success" | "warning" | "neutral" | "accent";

const tones: Record<Tone, string> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  neutral: "bg-morning/60 text-cerulean",
  accent: "bg-honey/25 text-cerulean ring-1 ring-honey/40",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium leading-none ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
