## ADDED Requirements

### Requirement: Holiday Data Read from Supabase

`fetchHolidaysForRange` in `src/shared/api/holidays.ts` SHALL read holiday data from the Supabase `holidays` table. It SHALL NOT import or call any Firebase Firestore API (`doc`, `getDoc`).

#### Scenario: fetchHolidaysForRange uses Supabase client

WHEN `fetchHolidaysForRange` is called with a start and end date
THEN it SHALL query the Supabase `holidays` table and SHALL NOT call any Firestore read function

#### Scenario: fetchHolidays delegates to the Supabase-backed fetchHolidaysForRange

WHEN `fetchHolidays` is called
THEN it SHALL delegate to `fetchHolidaysForRange` using the Supabase-backed implementation

---

### Requirement: Year-Boundary Query Preserves Full-Year Coverage

`fetchHolidaysForRange` SHALL query the Supabase `holidays` table using year boundaries: from `YYYY-01-01` of the start year to `YYYY-12-31` of the end year. It SHALL NOT filter by exact start/end dates, preserving the same behavior as the Firestore implementation which returned all holidays for each covered year.

#### Scenario: Query includes all holidays for the start year

WHEN `fetchHolidaysForRange` is called with a startDate in mid-year (e.g., March)
THEN the query SHALL include holidays from January 1 of that year, not from the exact startDate

#### Scenario: Query includes all holidays for the end year

WHEN `fetchHolidaysForRange` is called with an endDate in mid-year
THEN the query SHALL include holidays through December 31 of that year, not only through the exact endDate

#### Scenario: Query spans multiple years

WHEN `fetchHolidaysForRange` is called with a start and end date covering two calendar years
THEN the returned holidays SHALL include entries from both years

---

### Requirement: Error Handling Returns Empty Array

WHEN the Supabase query in `fetchHolidaysForRange` fails (network error, RLS rejection, table not found), the function SHALL return an empty array and SHALL log the error with `console.error`. It SHALL NOT throw or propagate the error to the caller.

#### Scenario: Supabase query error produces empty result

WHEN the Supabase client returns an error for the holidays query
THEN `fetchHolidaysForRange` SHALL return `[]` and SHALL log the error

#### Scenario: Missing holidays table produces empty result without crash

WHEN the Supabase `holidays` table does not exist
THEN `fetchHolidaysForRange` SHALL return `[]` without throwing

---

### Requirement: Return Type Contract Is Preserved

`fetchHolidaysForRange` SHALL return `Promise<Holiday[]>`. Each returned item SHALL conform to the `HolidaySchema` (date string and name string). The function signature SHALL be unchanged from before the migration.

#### Scenario: Valid holidays table returns Holiday array

WHEN `fetchHolidaysForRange` is called and the Supabase query succeeds with rows
THEN the returned array SHALL contain `Holiday` objects with `date` and `name` fields

#### Scenario: Empty holidays table returns empty array

WHEN `fetchHolidaysForRange` is called and the Supabase table has no rows for the queried range
THEN the function SHALL return `[]` without error

---

### Requirement: Supabase holidays Table Precondition

The `holidays-supabase-read` capability SHALL only be deployed after ALL of the following preconditions are confirmed:
1. The Supabase `holidays` table exists with complete holiday data for all years present in Firestore
2. The table has an RLS policy that permits unauthenticated (`anon` role) SELECT access

#### Scenario: Unauthenticated client can SELECT from holidays table

WHEN an unauthenticated Supabase client queries the `holidays` table
THEN the query SHALL succeed and return data (not be rejected by RLS)

#### Scenario: Authenticated writes are restricted

WHEN a write operation (INSERT, UPDATE, DELETE) is attempted on the `holidays` table via the `anon` role
THEN the operation SHALL be rejected by RLS

---

### Requirement: Legacy Firestore Helpers Are Removed

After the Supabase migration ships, `fetchHolidaysForYear` and `getYearsInRange` SHALL be deleted from `holidays.ts`. The Firebase `doc`, `getDoc` imports and the `firestore` import from `@/firebase` SHALL be removed from `holidays.ts`.

#### Scenario: No Firestore imports remain in holidays.ts

WHEN `holidays.ts` is inspected after the migration
THEN it SHALL contain no imports from `firebase/firestore` and no import of `firestore` from `@/firebase`

#### Scenario: fetchHolidaysForYear is no longer accessible

WHEN external code attempts to import `fetchHolidaysForYear` from `holidays.ts`
THEN the import SHALL fail because the function no longer exists
