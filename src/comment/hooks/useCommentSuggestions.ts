import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateCommentSuggestions } from '../api/commentSuggestions';
import type { CommentSuggestion } from '../model/CommentSuggestion';
import { useEffect } from 'react';


interface UseCommentSuggestionsParams {
  postId: string;
  boardId: string;
  enabled?: boolean;
}

// Simple localStorage persistence for comment suggestions
const CACHE_KEY = 'comment-suggestions-cache';
const CACHE_VERSION = 'v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: CommentSuggestion[];
  timestamp: number;
  version: string;
}

const saveToCache = (key: string, data: CommentSuggestion[]) => {
  try {
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(`${CACHE_KEY}-${key}`, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to save comment suggestions to cache:', error);
  }
};

const loadFromCache = (key: string): CommentSuggestion[] | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}-${key}`);
    if (!cached) return null;

    const cacheEntry: CacheEntry = JSON.parse(cached);
    
    // Check version and TTL
    if (cacheEntry.version !== CACHE_VERSION || 
        Date.now() - cacheEntry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_KEY}-${key}`);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.warn('Failed to load comment suggestions from cache:', error);
    return null;
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
  
  const cacheKey = `${currentUser?.uid}-${postId}-${boardId}`;
  
  const queryFn = async (): Promise<CommentSuggestion[]> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    // Try loading from localStorage first
    const cachedData = loadFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If no cache, make API call
    const suggestions = await generateCommentSuggestions({
      userId: currentUser.uid,
      postId,
      boardId,
    });
    
    // Save successful response to localStorage
    saveToCache(cacheKey, suggestions);
    
    return suggestions;
  };

  const queryEnabled = enabled && !!currentUser?.uid && !!postId && !!boardId;
  
  const query = useQuery({
    queryKey: ['commentSuggestions', currentUser?.uid, postId, boardId],
    queryFn,
    enabled: queryEnabled,
    staleTime: 30 * 60 * 1000, // 30 minutes - much longer cache
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory longer
    retry: 1, // Reduce retries for LLM calls
    retryDelay: 2000, // Simple 2 second delay
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (queryEnabled && !query.data && !query.isLoading) {
      const cachedData = loadFromCache(cacheKey);
      if (cachedData) {
        queryClient.setQueryData(
          ['commentSuggestions', currentUser?.uid, postId, boardId], 
          cachedData
        );
      }
    }
  }, [queryEnabled, query.data, query.isLoading, queryClient, currentUser?.uid, postId, boardId, cacheKey]);

  return query;
}