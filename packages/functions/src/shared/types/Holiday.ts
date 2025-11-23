export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
}

export interface YearHolidays {
  items: Holiday[];
}
