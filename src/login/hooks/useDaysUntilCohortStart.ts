import { Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';

const MILLISECONDS_PER_DAY = 1000 * 3600 * 24;

function calculateDaysRemaining(firstDay: Timestamp | undefined): number {
  if (!firstDay) return 0;
  
  const cohortStartDate = firstDay.toDate();
  const today = new Date();
  const timeDiff = cohortStartDate.getTime() - today.getTime();
  
  return Math.ceil(timeDiff / MILLISECONDS_PER_DAY);
}

export function useDaysUntilCohortStart(firstDay: Timestamp | undefined): number {
  return useMemo(() => calculateDaysRemaining(firstDay), [firstDay]);
}