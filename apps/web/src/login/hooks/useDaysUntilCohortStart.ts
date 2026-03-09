import type { FirebaseTimestamp } from '@/shared/model/Timestamp';
import { useMemo } from 'react';

const MILLISECONDS_PER_DAY = 1000 * 3600 * 24;

function calculateDaysRemaining(firstDay: FirebaseTimestamp | undefined): number {
  if (!firstDay) return 0;
  
  const cohortStartDate = firstDay.toDate();
  const today = new Date();
  const timeDiff = cohortStartDate.getTime() - today.getTime();
  
  return Math.ceil(timeDiff / MILLISECONDS_PER_DAY);
}

export function useDaysUntilCohortStart(firstDay: FirebaseTimestamp | undefined): number {
  return useMemo(() => calculateDaysRemaining(firstDay), [firstDay]);
}