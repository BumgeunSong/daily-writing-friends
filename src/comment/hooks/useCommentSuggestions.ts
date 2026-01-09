import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateCommentSuggestions } from '../api/commentSuggestions';
import type { CommentSuggestion } from '../model/CommentSuggestion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCacheKey,
  createCacheEntry,
  isCacheValid,
  parseCacheEntry,
  serializeCacheEntry,
  type CacheEntry,
} from '../utils/cacheUtils';

// Hook parameter types
interface UseCommentSuggestionsParams {
  postId: string;
  boardId: string;
  enabled?: boolean;
}

// Cache configuration constants
const CACHE_KEY_PREFIX = 'comment-suggestions-cache';
const CACHE_VERSION = 'v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Imperative shell - handles side effects (localStorage)
type CacheOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

const saveToCache = (key: string, data: CommentSuggestion[]): CacheOperationResult<void> => {
  try {
    const cacheKey = createCacheKey(CACHE_KEY_PREFIX, key);
    const cacheEntry = createCacheEntry(data, Date.now(), CACHE_VERSION);
    localStorage.setItem(cacheKey, serializeCacheEntry(cacheEntry));
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown cache save error');
    console.warn('Failed to save comment suggestions to cache:', err);
    return { success: false, error: err };
  }
};

const loadFromCache = (key: string): CacheOperationResult<CommentSuggestion[]> => {
  try {
    const cacheKey = createCacheKey(CACHE_KEY_PREFIX, key);
    const cached = localStorage.getItem(cacheKey);
    const cacheEntry = parseCacheEntry<CommentSuggestion[]>(cached);

    if (!cacheEntry) {
      return { success: true, data: undefined };
    }

    if (!isCacheValid(cacheEntry, Date.now(), CACHE_TTL, CACHE_VERSION)) {
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
    const cacheKey = createCacheKey(CACHE_KEY_PREFIX, key);
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