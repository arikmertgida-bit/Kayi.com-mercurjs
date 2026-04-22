import { useContext, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiltersContext } from '@/providers/FiltersProvider';

const useFilters = (key: string) => {
  // Always call all hooks unconditionally (React rules of hooks)
  const ctx            = useContext(FiltersContext);
  const router         = useRouter();
  const pathname       = usePathname();
  const searchParams   = useSearchParams();
  const [, startTransition] = useTransition();

  // Local state for fallback path (non-Meili, router-based pages)
  const [localFilters, setLocalFilters] = useState<Set<string>>(() =>
    new Set((searchParams.get(key) || '').split(',').filter(Boolean))
  );
  const localRef = useRef(localFilters);
  localRef.current = localFilters;

  // Sync local state from URL on external navigation (fallback path only)
  const prevUrl = useRef(searchParams.get(key) || '');
  useEffect(() => {
    if (ctx) return;
    const current = searchParams.get(key) || '';
    if (current !== prevUrl.current) {
      prevUrl.current = current;
      setLocalFilters(new Set(current.split(',').filter(Boolean)));
    }
  }, [ctx, searchParams, key]);

  // ── Context path: instant, no router navigation ──────────────────────────
  if (ctx) {
    return {
      filters: ctx.filterMap[key] ?? [],
      isFilterActive: (value: string) => ctx.isFilterActive(key, value),
      updateFilters:  (value: string) => ctx.toggleFilter(key, value),
      clearAllFilters: ctx.clearAllFilters,
    };
  }

  // ── Fallback path: router-based (server-rendered product pages) ───────────
  const updateFilters = (value: string) => {
    const next = new Set(localRef.current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setLocalFilters(next);

    const sp = new URLSearchParams(searchParams.toString());
    if (next.size === 0) sp.delete(key);
    else sp.set(key, Array.from(next).join(','));
    startTransition(() => {
      router.replace(`${pathname}?${sp}`, { scroll: false });
    });
  };

  const isFilterActive   = (value: string) => localFilters.has(value);
  const clearAllFilters  = () => {
    setLocalFilters(new Set());
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  return {
    updateFilters,
    filters: Array.from(localFilters),
    isFilterActive,
    clearAllFilters,
  };
};

export default useFilters;
