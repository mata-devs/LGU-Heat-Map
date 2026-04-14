/**
 * useSheetData Hook
 * 
 * React hook for fetching and managing Google Sheets data
 * Supports caching, auto-refresh, and manual refresh
 * 
 * Usage:
 *   const { data, loading, error, refresh } = useSheetData(sheetUrl);
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchSheetData,
  sheetDataToRecord,
  getDataRange,
  isCacheValid,
  SheetRow,
  SHEET_CONFIG,
} from '@/lib/google-sheets';

export interface SheetDataState {
  data: Record<string, number>;
  min: number;
  max: number;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

interface CachedData {
  data: Record<string, number>;
  min: number;
  max: number;
  timestamp: number;
  lastUpdated: string;
}

/**
 * Hook to fetch data from Google Sheets
 * @param sheetUrl - The public Google Sheet URL
 * @param sheetName - Optional sheet/tab name to fetch
 * @param autoRefresh - Enable auto-refresh (default: true)
 */
export function useSheetData(sheetUrl: string | null, sheetName?: string, autoRefresh = true) {
  const [state, setState] = useState<SheetDataState>({
    data: {},
    min: 0,
    max: 100,
    lastUpdated: '',
    loading: false,
    error: null,
  });
  
  const intervalRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!showLoading && fetchInFlightRef.current) {
      return;
    }

    const requestId = ++requestIdRef.current;
    fetchInFlightRef.current = true;
    const isStale = () => !isMountedRef.current || requestId !== requestIdRef.current;

    if (!sheetUrl) {
      if (!isStale()) {
        setState(prev => ({ ...prev, error: 'No sheet URL configured', loading: false }));
      }
      return;
    }

    console.log('%c📡 FETCH: Starting', 'color: orange', { sheetName, showLoading });
    
    if (showLoading) {
      if (!isStale()) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }
    }

    try {
      // Check localStorage cache first - include sheetName in cache key
      const cacheKey = `${SHEET_CONFIG.CACHE_KEY}-${new URL(sheetUrl).pathname}-${sheetName || 'default'}`;
      const cachedStr = localStorage.getItem(cacheKey);
      
      if (cachedStr) {
        try {
          const cached: CachedData = JSON.parse(cachedStr);
          if (isCacheValid(cached)) {
            if (!isStale()) {
              setState({
                data: cached.data,
                min: cached.min,
                max: cached.max,
                lastUpdated: cached.lastUpdated,
                loading: false,
                error: null,
              });
            }

            // Still fetch fresh data in background
            try {
              const result = await fetchSheetData(sheetUrl, sheetName);
              const data = sheetDataToRecord(result.rows);
              const { min, max } = getDataRange(data);
              const newCached: CachedData = {
                data,
                min,
                max,
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString(),
              };
              localStorage.setItem(cacheKey, JSON.stringify(newCached));

              if (isStale()) {
                return;
              }

              setState({
                data,
                min,
                max,
                lastUpdated: newCached.lastUpdated,
                loading: false,
                error: null,
              });
            } catch {
              // Silently fail - we have cached data
            }

            return;
          }
        } catch {
          // Invalid cache, proceed to fetch
        }
      }

      // Fetch fresh data
      const result = await fetchSheetData(sheetUrl, sheetName);
      const data = sheetDataToRecord(result.rows);
      console.log('%c📡 FETCH: Got data', 'color: green', { sheetName, rowCount: result.rows.length, sampleData: data['Cebu City'] });

      if (isStale()) {
        return;
      }
      
      const { min, max } = getDataRange(data);
      const timestamp = Date.now();
      const lastUpdated = new Date().toISOString();

      // Cache the result
      const newCached: CachedData = {
        data,
        min,
        max,
        timestamp,
        lastUpdated,
      };
      localStorage.setItem(cacheKey, JSON.stringify(newCached));

      setState({
        data,
        min,
        max,
        lastUpdated,
        loading: false,
        error: null,
      });
    } catch (err) {
      if (isStale()) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sheet data';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      if (requestId === requestIdRef.current) {
        fetchInFlightRef.current = false;
      }
    }
  }, [sheetUrl, sheetName]);

  // Initial fetch - also triggers when sheetName changes
  useEffect(() => {
    if (sheetUrl) {
      fetchData(true);
    }
  }, [sheetUrl, sheetName, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && SHEET_CONFIG.REFRESH_INTERVAL > 0 && sheetUrl) {
      intervalRef.current = window.setInterval(() => {
        fetchData(false);
      }, SHEET_CONFIG.REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, sheetUrl, sheetName, fetchData]);

  // Refresh function exposed to caller
  const refresh = useCallback(() => {
    // Clear cache before refetching
    if (sheetUrl) {
      const cacheKey = `${SHEET_CONFIG.CACHE_KEY}-${new URL(sheetUrl).pathname}-${sheetName || 'default'}`;
      localStorage.removeItem(cacheKey);
    }
    return fetchData(true);
  }, [sheetUrl, sheetName, fetchData]);

  return {
    ...state,
    refresh,
  };
}

/**
 * Hook for managing multiple dataset sheets
 */
export function useMultiDatasetSheets(sheetUrls: Record<string, string>) {
  const [datasets, setDatasets] = useState<Record<string, SheetDataState>>({});
  const [isAnyLoading, setIsAnyLoading] = useState(true);
  const sheetUrlsKey = useMemo(() => JSON.stringify(sheetUrls), [sheetUrls]);
  const sheetEntries = useMemo(
    () => Object.entries(JSON.parse(sheetUrlsKey) as Record<string, string>),
    [sheetUrlsKey]
  );
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const requestId = ++requestIdRef.current;
      if (isMountedRef.current) {
        setIsAnyLoading(true);
      }
      
      const results: Record<string, SheetDataState> = {};
      
      await Promise.all(
        sheetEntries.map(async ([id, url]) => {
          try {
            const result = await fetchSheetData(url);
            const data = sheetDataToRecord(result.rows);
            const { min, max } = getDataRange(data);
            results[id] = {
              data,
              min,
              max,
              lastUpdated: new Date().toISOString(),
              loading: false,
              error: null,
            };
          } catch (err) {
            results[id] = {
              data: {},
              min: 0,
              max: 100,
              lastUpdated: '',
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load',
            };
          }
        })
      );

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      
      setDatasets(results);
      setIsAnyLoading(false);
    };

    fetchAll();
  }, [sheetEntries]);

  const refreshAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setIsAnyLoading(true);
    }
    
    const results: Record<string, SheetDataState> = {};
    
    await Promise.all(
      sheetEntries.map(async ([id, url]) => {
        const cacheKey = `${SHEET_CONFIG.CACHE_KEY}-${new URL(url).pathname}`;
        localStorage.removeItem(cacheKey);
        
        try {
          const result = await fetchSheetData(url);
          const data = sheetDataToRecord(result.rows);
          const { min, max } = getDataRange(data);
          results[id] = {
            data,
            min,
            max,
            lastUpdated: new Date().toISOString(),
            loading: false,
            error: null,
          };
        } catch (err) {
          results[id] = {
            data: {},
            min: 0,
            max: 100,
            lastUpdated: '',
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load',
          };
        }
      })
    );

    if (!isMountedRef.current || requestId !== requestIdRef.current) {
      return;
    }
    
    setDatasets(results);
    setIsAnyLoading(false);
  }, [sheetEntries]);

  return {
    datasets,
    isAnyLoading,
    refreshAll,
  };
}