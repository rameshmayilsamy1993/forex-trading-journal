import { useState, useCallback } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface PaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: (initialItems?: T[]) => void;
}

export function useCursorPagination<T>(
  fetchFn: (cursor: string | null) => Promise<PaginatedResponse<T>>
): PaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const result = await fetchFn(cursor);
      setItems(prev => [...prev, ...result.data]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Pagination load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, fetchFn]);

  const reset = useCallback((initialItems?: T[]) => {
    setItems(initialItems || []);
    setCursor(null);
    setHasMore(true);
  }, []);

  return { items, isLoading, hasMore, loadMore, reset };
}
