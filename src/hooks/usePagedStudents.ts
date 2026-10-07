import { useCallback, useEffect, useState } from "react";
import { listAttendanceForBranchDate, listStudents } from "../lib/db";
import { todayKey } from "../lib/dates";
import { toUserMessage } from "../lib/userError";
import type { Student } from "../types";

const DEFAULT_PAGE_SIZE = 50;

export function usePagedStudents(opts: {
  branchId?: string;
  search: string;
  page: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = opts.enabled !== false;
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentTodayIds, setPresentTodayIds] = useState<Set<string>>(new Set());
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !opts.branchId) {
      setStudents([]);
      setTotal(0);
      setPresentTodayIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const branchId = opts.branchId;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ students: rows, total: count }, dayAttendance] = await Promise.all([
            listStudents({
              branchId,
              search: opts.search,
              page: opts.page,
              pageSize,
            }),
            listAttendanceForBranchDate(branchId, todayKey()),
          ]);
          if (cancelled) return;
          setStudents(rows);
          setTotal(count);
          setPresentTodayIds(new Set(dayAttendance.map((a) => a.studentId)));
        } catch (e) {
          if (!cancelled) {
            setError(toUserMessage(e, "Couldn't load students. Please try again."));
            setStudents([]);
            setTotal(0);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, opts.search ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, opts.branchId, opts.search, opts.page, pageSize, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    students,
    total,
    totalPages,
    pageSize,
    loading,
    error,
    presentTodayIds,
    reload,
  };
}
