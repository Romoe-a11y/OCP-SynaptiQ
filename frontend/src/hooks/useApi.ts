import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  /** Re-fetch the data */
  reload: () => void;
}

/**
 * Lightweight data-fetching hook.
 *
 * Usage:
 * ```ts
 * const { data, loading, error, reload } = useApi(getDashboardData);
 * ```
 *
 * For multiple parallel requests:
 * ```ts
 * const { data, loading, error, reload } = useApi(
 *   () => Promise.all([getDashboardData(), getDashboardStats()]),
 * );
 * ```
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  /** Auto-refresh interval in milliseconds (0 = disabled). */
  refreshInterval: number = 0,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const execute = useCallback(() => {
    setState((prev) => ({ ...prev, loading: prev.data === null, error: null }));
    fetcher()
      .then((data) => {
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          const message =
            err?.response?.data?.message ??
            err?.response?.data ??
            err?.message ??
            "An unexpected error occurred";
          setState((prev) => ({
            data: prev.data,
            loading: false,
            error: String(message),
          }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  // Auto-refresh polling
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const id = setInterval(execute, refreshInterval);
    return () => clearInterval(id);
  }, [execute, refreshInterval]);

  return { ...state, reload: execute };
}
