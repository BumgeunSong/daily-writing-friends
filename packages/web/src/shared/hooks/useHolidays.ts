import { useQuery } from '@tanstack/react-query';
import { fetchHolidays } from '@/shared/api/holidays';
import { useMemo } from 'react';

/**
 * Hook to fetch and cache configurable holidays
 * Returns a Map for O(1) date lookups and the raw holiday array
 */
export function useHolidays() {
  const { data: holidays = [], isLoading, error } = useQuery({
    queryKey: ['holidays'],
    queryFn: fetchHolidays,
    staleTime: 1000 * 60 * 60, // 1 hour - holidays don't change frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach((holiday) => {
      map.set(holiday.date, holiday.name);
    });
    return map;
  }, [holidays]);

  return {
    holidays,
    holidayMap,
    isLoading,
    error,
  };
}
