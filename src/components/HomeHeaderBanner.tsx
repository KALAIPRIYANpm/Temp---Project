import { HEADER_BANNER_URL } from "../lib/branding";

export function HomeHeaderBanner({ className = "" }: { className?: string }) {
  return (
    <img
      src={HEADER_BANNER_URL}
      alt="Shri Harimandiram"
      className={`mb-3 block h-auto w-full max-w-full sm:mb-4 ${className}`}
    />
  );
}
