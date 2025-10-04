# Holiday Configuration Guide

## Overview

Admins can configure custom holidays that will be displayed as grayed-out cells in the contribution graph. This allows for region-specific or organization-specific holidays to be marked.

Holidays are organized by **year** for better scalability and performance.

## How to Configure Holidays

### 1. Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**

### 2. Create or Update Year-Based Holiday Documents

Holidays are organized by year in the `holidays` collection.

#### Structure Overview

```
holidays/ (collection)
  ├── 2024 (document)
  ├── 2025 (document)
  └── 2026 (document)
```

### Document Structure

**Collection**: `holidays`
**Document ID**: Year (e.g., `2025`, `2026`)

**Document Data**:
```json
{
  "items": [
    {
      "date": "2025-03-01",
      "name": "삼일절"
    },
    {
      "date": "2025-05-05",
      "name": "어린이날"
    },
    {
      "date": "2025-12-25",
      "name": "Christmas"
    }
  ]
}
```

### Field Specifications

- **items**: Array of holiday objects
  - **date**: String in `YYYY-MM-DD` format (e.g., "2025-03-01")
  - **name**: String, the name of the holiday (e.g., "삼일절", "New Year")

## Step-by-Step: Adding Holidays for a New Year

### Example: Adding 2025 Holidays

1. Navigate to Firestore → `holidays` collection
2. Click **Add Document**
3. Set **Document ID** to `2025`
4. Add field `items` as an **array**
5. Add holiday objects to the array:

```json
{
  "items": [
    { "date": "2025-01-01", "name": "New Year's Day" },
    { "date": "2025-03-01", "name": "삼일절" },
    { "date": "2025-05-05", "name": "어린이날" }
  ]
}
```

6. Click **Save**

## Example: Editing Existing Year

To add a holiday to 2025:

1. Open `holidays/2025` document
2. Find the `items` array
3. Add new holiday object:
   ```json
   {
     "date": "2025-06-06",
     "name": "현충일"
   }
   ```
4. Save the document
5. Users will see updates after cache refresh (within 1 hour)

## How Holidays Appear

- **In Contribution Graph**: Holiday weekdays appear as **gray cells** with a tooltip showing "(공휴일)"
- **Grid Layout**: Holidays maintain the 4×5 grid layout (they are grayed out, not hidden)
- **Weekends**: Only weekday holidays are shown in the grid (weekends are excluded from the grid entirely)

## Complete Example: 2025 Korean Holidays

```json
{
  "items": [
    { "date": "2025-01-01", "name": "New Year's Day" },
    { "date": "2025-01-28", "name": "Lunar New Year's Eve" },
    { "date": "2025-01-29", "name": "Lunar New Year" },
    { "date": "2025-01-30", "name": "Lunar New Year Holiday" },
    { "date": "2025-03-01", "name": "삼일절" },
    { "date": "2025-05-05", "name": "어린이날" },
    { "date": "2025-06-06", "name": "현충일" },
    { "date": "2025-08-15", "name": "광복절" },
    { "date": "2025-10-03", "name": "개천절" },
    { "date": "2025-10-09", "name": "한글날" },
    { "date": "2025-12-25", "name": "Christmas" }
  ]
}
```

## Benefits of Year-Based Structure

✅ **Scalable**: Each year can hold 10,000+ holidays
✅ **Efficient**: Only fetches relevant years (current ± 1)
✅ **Fast queries**: 1-2 reads instead of reading all years
✅ **Better organization**: Easy to manage holidays by year
✅ **Concurrent edits**: Different years can be edited simultaneously

## Notes

- **Caching**: Holidays are cached for 1 hour on both frontend and backend
- **Auto-fetch**: System automatically fetches current year ± 1 year
- **Manual Refresh**: Users need to refresh browser to see updates
- **Korean Holidays**: System includes hardcoded Korean holidays (these extend configurable holidays)
- **Date Format**: Always use `YYYY-MM-DD` format

## Troubleshooting

**Holidays not showing up?**
- Check date format is exactly `YYYY-MM-DD`
- Verify document path is `holidays/{year}`
- Check field name is `items` (not `holidays`)
- Verify year matches the dates (2025 holidays in `2025` document)
- Wait up to 1 hour for cache refresh, or refresh browser

**Holiday shows on wrong date?**
- Verify timezone - dates are interpreted in Asia/Seoul timezone
- Check for typos in the date string
- Ensure year in path matches year in date

## Technical Details

- **Frontend API**: `fetchHolidaysForRange()` in `src/shared/api/holidays.ts`
- **Frontend Hook**: `useHolidays()` in `src/shared/hooks/useHolidays.ts`
- **Backend Function**: `isSeoulWorkingDayAsync()` in `functions/src/shared/calendar.ts`
- **Cache Duration**: 1 hour (frontend and backend)
- **Data Validation**: Zod schema validates date format and required fields
