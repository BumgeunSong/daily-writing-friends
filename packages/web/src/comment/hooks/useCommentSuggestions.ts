import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateCommentSuggestions } from '../api/commentSuggestions';
import type { CommentSuggestion } from '../model/CommentSuggestion';
import { useCallback, useEffect, useMemo, useState } from 'react';


// Hook parameter types
interface UseCommentSuggestionsParams {
  postId: string;
  boardId: string;
  enabled?: boolean;
}

// Hook return type
interface UseCommentSuggestionsReturn {
  data: CommentSuggestion[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

// Constants
const CACHE_KEY = 'comment-suggestions-cache';
const CACHE_VERSION = 'v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Types
interface CacheEntry {
  data: CommentSuggestion[];
  timestamp: number;
  version: string;
}

type CacheOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

// Cache utilities - pure functions
const createCacheKey = (key: string): string => `${CACHE_KEY}-${key}`;

const createCacheEntry = (data: CommentSuggestion[]): CacheEntry => ({
  data,
  timestamp: Date.now(),
  version: CACHE_VERSION,
});

const isCacheValid = (entry: CacheEntry): boolean => {
  return entry.version === CACHE_VERSION && 
         Date.now() - entry.timestamp <= CACHE_TTL;
};

const saveToCache = (key: string, data: CommentSuggestion[]): CacheOperationResult<void> => {
  try {
    const cacheKey = createCacheKey(key);
    const cacheEntry = createCacheEntry(data);
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown cache save error');
    console.warn('Failed to save comment suggestions to cache:', err);
    return { success: false, error: err };
  }
};

const loadFromCache = (key: string): CacheOperationResult<CommentSuggestion[]> => {
  try {
    const cacheKey = createCacheKey(key);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return { success: true, data: undefined };
    }

    const cacheEntry: CacheEntry = JSON.parse(cached);
    
    if (!isCacheValid(cacheEntry)) {
      localStorage.removeItem(cacheKey);
      return { success: true, data: undefined };
    }

    return { success: true, data: cacheEntry.data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown cache load error');
    console.warn('Failed to load comment suggestions from cache:', err);
    return { success: false, error: err };
  }
};

const clearCache = (key: string): CacheOperationResult<void> => {
  try {
    const cacheKey = createCacheKey(key);
    localStorage.removeItem(cacheKey);
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown cache clear error');
    console.warn('Failed to clear comment suggestions cache:', err);
    return { success: false, error: err };
  }
};

/**
 * Custom hook to generate comment suggestions using TanStack Query
 * Based on comment_assistant_prd.md specifications
 * Includes localStorage persistence for 24-hour cross-session caching
 */
export function useCommentSuggestions({ 
  postId, 
  boardId, 
  enabled = true 
}: UseCommentSuggestionsParams) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Memoize cache key to prevent unnecessary recalculations
  const cacheKey = useMemo(() => 
    `${currentUser?.uid}-${postId}-${boardId}`, 
    [currentUser?.uid, postId, boardId]
  );

  // Memoize query key to ensure referential equality
  const queryKey = useMemo(() => 
    ['commentSuggestions', currentUser?.uid, postId, boardId],
    [currentUser?.uid, postId, boardId]
  );

  // Memoize query enabled condition
  const queryEnabled = useMemo(() => 
    enabled && Boolean(currentUser?.uid) && Boolean(postId) && Boolean(boardId),
    [enabled, currentUser?.uid, postId, boardId]
  );
  
  // Memoized query function with proper error handling
  const queryFn = useCallback(async (): Promise<CommentSuggestion[]> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    // Try loading from localStorage first
    const cacheResult = loadFromCache(cacheKey);
    if (cacheResult.success && cacheResult.data) {
      return cacheResult.data;
    }

    // If cache fails or no data, make API call
    try {
      const suggestions = await generateCommentSuggestions({
        userId: currentUser.uid,
        postId,
        boardId,
      });
      
      // Save successful response to localStorage
      saveToCache(cacheKey, suggestions);
      
      return suggestions;
    } catch (apiError) {
      // If API fails but we have cached data (even if stale), use it as fallback
      if (cacheResult.success && cacheResult.data) {
        console.warn('API failed, using stale cache data:', apiError);
        return cacheResult.data;
      }
      throw apiError;
    }
  }, [currentUser?.uid, postId, boardId, cacheKey]);

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: queryEnabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1, // Reduce retries for LLM calls
    retryDelay: 2000,
    // Prevent background refetching to save API costs
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized cache hydration effect
  useEffect(() => {
    if (!queryEnabled || query.data || query.isLoading) {
      return;
    }

    const hydrateCacheData = async () => {
      const cacheResult = loadFromCache(cacheKey);
      if (cacheResult.success && cacheResult.data) {
        queryClient.setQueryData(queryKey, cacheResult.data);
      }
    };

    hydrateCacheData();
  }, [queryEnabled, query.data, query.isLoading, queryClient, queryKey, cacheKey]);

  // Memoized refresh function with proper error handling
  const refresh = useCallback(async (): Promise<void> => {
    if (!queryEnabled) {
      return;
    }

    setIsRefreshing(true);
    
    try {
      // Clear localStorage cache
      clearCache(cacheKey);
      
      // Clear current data immediately to show skeleton
      queryClient.setQueryData(queryKey, undefined);
      
      // Force refetch
      await query.refetch();
    } catch (error) {
      console.error('Failed to refresh comment suggestions:', error);
      // Re-throw to let the component handle the error
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [queryEnabled, cacheKey, queryClient, queryKey, query]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    data: query.data,
    isLoading: query.isLoading || isRefreshing,
    isError: query.isError,
    error: query.error,
    refresh,
  }), [query.data, query.isLoading, query.isError, query.error, isRefreshing, refresh]);
}