import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { isAuthSyncPaused } from "../lib/authSync";
import { resolveAuthProfile, hasAuthUser } from "../lib/session";
import { useStore } from "../store/useStore";

const INIT_TIMEOUT_MS = 8000;

/** Restore Supabase session and load app data on startup */
export function useAppInit() {
  const setReady = useStore((s) => s.setReady);
  const setSession = useStore((s) => s.setSession);
  const loadAllData = useStore((s) => s.loadAllData);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const finishInit = () => {
      if (!cancelled) setReady(true);
    };

    const timeoutId = window.setTimeout(finishInit, INIT_TIMEOUT_MS);

    /** Never wipe session on TOKEN_REFRESHED if profile fetch blips */
    const applyAuthState = async (reloadData: boolean) => {
      const resolved = await resolveAuthProfile();
      if (resolved.kind === "session") {
        setSession(resolved.session);
        if (reloadData) void loadAllData().catch(() => undefined);
        return;
      }

      if (resolved.kind === "inactive") {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }

      const stillAuthed = await hasAuthUser();
      const existing = useStore.getState().session;
      if (stillAuthed && existing) return;

      if (!stillAuthed) {
        setSession(null);
      }
    };

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error && /refresh token/i.test(error.message)) {
          await supabase.auth.signOut();
          setSession(null);
        } else if (session) {
          await applyAuthState(true);
        }
      } catch {
        if (!cancelled && !(await hasAuthUser())) setSession(null);
      } finally {
        window.clearTimeout(timeoutId);
        finishInit();
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (isAuthSyncPaused()) return;

      void (async () => {
        if (event === "SIGNED_OUT") {
          setSession(null);
          useStore.setState({
            branches: [],
            managers: [],
            users: [],
            markerNames: {},
            dataLoading: false,
          });
          return;
        }

        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION"
        ) {
          const reloadData = event === "SIGNED_IN" || event === "INITIAL_SESSION";
          await applyAuthState(reloadData);
        }
      })();
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible" || isAuthSyncPaused()) return;
      void applyAuthState(false);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setReady, setSession, loadAllData]);
}
