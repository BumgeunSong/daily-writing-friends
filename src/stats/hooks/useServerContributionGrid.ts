import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  ContributionGrid,
  ContributionGridData,
  ActivityType,
} from '@/stats/model/ContributionGrid';

/**
 * React hook to fetch and subscribe to server-calculated contribution grids
 *
 * @returns ContributionGridData with posting and commenting grids, maxValue, loading, and error states
 */
export function useServerContributionGrid(): ContributionGridData {
  const { currentUser } = useAuth();
  const [postingGrid, setPostingGrid] = useState<ContributionGrid | null>(null);
  const [commentingGrid, setCommentingGrid] = useState<ContributionGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate maxValue across both grids
  const maxValue = useMemo(() => {
    const postingMax = postingGrid?.maxValue || 0;
    const commentingMax = commentingGrid?.maxValue || 0;
    return Math.max(postingMax, commentingMax);
  }, [postingGrid?.maxValue, commentingGrid?.maxValue]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      setPostingGrid(null);
      setCommentingGrid(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Create document references
    const postingGridRef = doc(
      firestore,
      'contributionGrids',
      `${currentUser.uid}_${ActivityType.POSTING}`,
    );
    const commentingGridRef = doc(
      firestore,
      'contributionGrids',
      `${currentUser.uid}_${ActivityType.COMMENTING}`,
    );

    // Set up real-time listeners for both grids
    const unsubscribePosting = onSnapshot(
      postingGridRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setPostingGrid({
            contributions: data.contributions || [],
            maxValue: data.maxValue || 0,
            lastUpdated: data.lastUpdated as Timestamp,
            timeRange: data.timeRange || { startDate: '', endDate: '' },
          });
        } else {
          setPostingGrid(null);
        }
      },
      (err) => {
        console.error('Error fetching posting contribution grid:', err);
        setError(err);
        setPostingGrid(null);
      },
    );

    const unsubscribeCommenting = onSnapshot(
      commentingGridRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCommentingGrid({
            contributions: data.contributions || [],
            maxValue: data.maxValue || 0,
            lastUpdated: data.lastUpdated as Timestamp,
            timeRange: data.timeRange || { startDate: '', endDate: '' },
          });
        } else {
          setCommentingGrid(null);
        }
      },
      (err) => {
        console.error('Error fetching commenting contribution grid:', err);
        setError(err);
        setCommentingGrid(null);
      },
    );

    // Set loading to false after initial fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    // Cleanup function
    return () => {
      unsubscribePosting();
      unsubscribeCommenting();
      clearTimeout(timer);
    };
  }, [currentUser?.uid]);

  return {
    postingGrid,
    commentingGrid,
    maxValue,
    loading,
    error,
  };
}
