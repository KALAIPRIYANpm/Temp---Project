import { useEffect, useRef } from "react";

type Options = {
  /** When true, defer scroll until this flag goes true then false (e.g. fetch loading). */
  busy?: boolean;
};

/** Scrolls the returned element into view when `value` changes (skips first mount). */
export function useScrollIntoViewOnChange<T extends HTMLElement>(
  value: unknown,
  options?: Options,
) {
  const ref = useRef<T | null>(null);
  const isFirst = useRef(true);
  const pending = useRef(false);
  const sawBusy = useRef(false);
  const busy = options?.busy;

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    pending.current = true;
    sawBusy.current = false;
  }, [value]);

  useEffect(() => {
    if (!pending.current) return;

    if (busy === undefined) {
      pending.current = false;
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (busy) {
      sawBusy.current = true;
      return;
    }

    // Still on the pre-fetch render (busy hasn't flipped true yet).
    if (!sawBusy.current) return;

    pending.current = false;
    sawBusy.current = false;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [value, busy]);

  return ref;
}
