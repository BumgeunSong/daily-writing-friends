import { z } from 'zod';

export const HolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  name: z.string().min(1, 'Holiday name is required'),
});

export const YearHolidaysSchema = z.object({
  items: z.array(HolidaySchema),
});

export type Holiday = z.infer<typeof HolidaySchema>;
export type YearHolidays = z.infer<typeof YearHolidaysSchema>;
