"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CacheEntry<T> = {
  data: T;
  fetchedAt: number; // ms since epoch
};

/**
 * Stale-while-revalidate localStorage cache.
 * Returns cached data immediately if available, then revalidates in the background.
 *
 * @param key - localStorage key
 * @param fetcher - async function to fetch fresh data
 * @param maxAgeMs - max age before data is considered stale and revalidated
 */
export function useLocalCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAgeMs: number
): { data: T | null; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(data === null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const persist = useCallback(
    (value: T) => {
      const entry: CacheEntry<T> = { data: value, fetchedAt: Date.now() };
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Storage full — silently ignore
      }
    },
    [key]
  );

  const doFetch = useCallback(async () => {
    const fresh = await fetcherRef.current();
    setData(fresh);
    persist(fresh);
    return fresh;
  }, [persist]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await doFetch();
    } finally {
      setLoading(false);
    }
  }, [doFetch]);

  // On mount: if no cached data, fetch immediately. If stale, revalidate in background.
  useEffect(() => {
    let stale = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry: CacheEntry<T> = JSON.parse(raw);
        stale = Date.now() - entry.fetchedAt > maxAgeMs;
      }
    } catch {
      // treat as stale
    }

    if (data === null) {
      // Cold cache — blocking fetch
      setLoading(true);
      doFetch().finally(() => setLoading(false));
    } else if (stale) {
      // Stale — background revalidate (no loading state)
      doFetch().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, refresh };
}
