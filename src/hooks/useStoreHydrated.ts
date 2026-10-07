import { useStore } from "../store/useStore";

/** True after initial Supabase session check completes */
export function useStoreHydrated() {
  return useStore((s) => s.ready);
}
