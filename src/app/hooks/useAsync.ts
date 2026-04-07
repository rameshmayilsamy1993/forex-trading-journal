import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseAsyncOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
): AsyncState<T> & { execute: () => Promise<void>; reset: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, isLoading: true, error: null });
    
    try {
      const result = await asyncFn();
      setState({ data: result, isLoading: false, error: null });
      options.onSuccess?.(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ data: null, isLoading: false, error: err });
      options.onError?.(err);
    }
  }, [asyncFn, options.onSuccess, options.onError]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  useEffect(() => {
    if (options.enabled !== false) {
      execute();
    }
  }, [execute, options.enabled]);

  return { ...state, execute, reset };
}

export function useSafeState<T>(initialValue: T): [T, (value: T | ((prev: T) => T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (initialValue === null || initialValue === undefined) {
      console.warn('useSafeState: Initial value is null or undefined');
      return initialValue as T;
    }
    return initialValue;
  });

  const safeSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      
      if (resolved === null || resolved === undefined) {
        console.warn('useSafeState: Attempting to set null/undefined value');
        return prev;
      }
      
      return resolved;
    });
  }, []);

  return [value, safeSetValue];
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export default useAsync;
