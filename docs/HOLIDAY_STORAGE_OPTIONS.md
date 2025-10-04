# Holiday Storage Options Analysis

## Current Implementation

**Structure**: Single document with array
```
config/holidays (document)
  └── holidays: [
        { date: "2025-03-01", name: "삼일절" },
        { date: "2025-05-05", name: "어린이날" }
      ]
```

**Pros:**
- ✅ Simple to implement
- ✅ Single read operation
- ✅ Easy to cache entirely
- ✅ Good for small datasets (< 100 holidays)

**Cons:**
- ❌ **Not scalable** - Firestore has 1MB document limit
- ❌ Entire document must be read/written for any update
- ❌ No querying capability (can't filter by year/date range)
- ❌ Risk of concurrent write conflicts if multiple admins edit
- ❌ No pagination support
- ❌ Array operations require reading entire document

**Estimated Capacity**: ~10,000 holidays (assuming 100 bytes per entry) before hitting 1MB limit

---

## Option 1: Root Collection by Year (Recommended)

**Structure**: Year-based document sharding
```
holidays/ (collection)
  ├── 2024 (document)
  │   └── items: [{ date: "2024-03-01", name: "삼일절" }, ...]
  ├── 2025 (document)
  │   └── items: [{ date: "2025-03-01", name: "삼일절" }, ...]
  └── 2026 (document)
      └── items: [{ date: "2026-03-01", name: "삼일절" }, ...]
```

**Pros:**
- ✅ **Scalable**: Each year is separate document (10,000+ holidays per year capacity)
- ✅ **Efficient queries**: Fetch only relevant year(s)
- ✅ **Natural partitioning**: Historical years rarely change
- ✅ **Better caching**: Cache only active years (current + next)
- ✅ **Reduced read costs**: Only fetch needed years
- ✅ **Concurrent edits**: Different years can be edited simultaneously

**Cons:**
- ⚠️ Slightly more complex querying (need to know year)
- ⚠️ Multi-year ranges require multiple reads (2-3 max typically)
- ⚠️ Requires year extraction from date strings

**Query Pattern:**
```typescript
// Fetch holidays for 2025
const docRef = doc(firestore, 'holidays', '2025');
const snapshot = await getDoc(docRef);
const holidays2025 = snapshot.data()?.items || [];

// Fetch multiple years (for year boundaries)
const years = ['2024', '2025'];
const promises = years.map(year =>
  getDoc(doc(firestore, 'holidays', year))
);
const docs = await Promise.all(promises);
const allHolidays = docs.flatMap(d => d.data()?.items || []);
```

**Estimated Capacity**: ~10,000 holidays per year

**Use Case Fit**: ✅ Perfect for contribution graph (typically shows last 4-8 weeks)

---

## Option 2: Individual Holiday Documents

**Structure**: Each holiday as separate document
```
holidays/ (collection)
  ├── 2024-03-01 (document)
  │   └── { date: "2024-03-01", name: "삼일절" }
  ├── 2025-05-05 (document)
  │   └── { date: "2025-05-05", name: "어린이날" }
  └── ...
```

**Pros:**
- ✅ **Maximum scalability**: Unlimited holidays
- ✅ **Granular updates**: Update single holiday without affecting others
- ✅ **No document size limits**: Each holiday is tiny
- ✅ **Efficient single-date lookups**: Direct document access by date
- ✅ **Range queries supported**: Can query by date field
- ✅ **No concurrent write conflicts**: Each holiday independent

**Cons:**
- ❌ **Expensive for bulk reads**: N reads for N holidays
- ❌ **Poor caching strategy**: Must cache hundreds of tiny documents
- ❌ **Higher read costs**: Each holiday = 1 read
- ❌ **Complex querying**: Need date range queries
- ❌ **Overhead**: More metadata per document

**Query Pattern:**
```typescript
// Fetch holidays in date range
const q = query(
  collection(firestore, 'holidays'),
  where('date', '>=', '2025-01-01'),
  where('date', '<=', '2025-12-31')
);
const snapshot = await getDocs(q);
const holidays = snapshot.docs.map(doc => doc.data());
```

**Estimated Capacity**: Unlimited

**Use Case Fit**: ⚠️ Overkill for our use case (4 weeks of data)

---

## Option 3: Month-Based Documents

**Structure**: Documents grouped by year-month
```
holidays/ (collection)
  ├── 2024-03 (document)
  │   └── items: [{ date: "2024-03-01", name: "삼일절" }, ...]
  ├── 2025-05 (document)
  │   └── items: [{ date: "2025-05-05", name: "어린이날" }, ...]
  └── ...
```

**Pros:**
- ✅ **Fine-grained partitioning**: Better than yearly, not as granular as daily
- ✅ **Efficient for month queries**: Perfect for contribution grid (4 weeks ≈ 1-2 months)
- ✅ **Scalable**: ~800 holidays per month capacity
- ✅ **Reduced reads**: Typically 1-2 documents for 4-week window

**Cons:**
- ⚠️ More documents than yearly approach
- ⚠️ Requires year-month extraction
- ⚠️ Overkill for our typical holiday density (< 10 per month)

**Query Pattern:**
```typescript
// Fetch holidays for March-April 2025
const months = ['2025-03', '2025-04'];
const promises = months.map(month =>
  getDoc(doc(firestore, 'holidays', month))
);
const docs = await Promise.all(promises);
const holidays = docs.flatMap(d => d.data()?.items || []);
```

**Estimated Capacity**: ~800 holidays per month

**Use Case Fit**: ⚠️ Over-engineered for typical holiday density

---

## Option 4: Rolling Window (Current + Future)

**Structure**: Two documents - current year and future years
```
holidays/ (collection)
  ├── current (document)
  │   └── items: [{ date: "2025-03-01", name: "삼일절" }, ...]
  └── future (document)
      └── items: [{ date: "2026-05-05", name: "어린이날" }, ...]
```

**Pros:**
- ✅ **Simple**: Only 2 documents to manage
- ✅ **Efficient caching**: Cache both documents indefinitely
- ✅ **Low read cost**: Maximum 2 reads
- ✅ **Good for small datasets**: Perfect for < 500 total holidays

**Cons:**
- ❌ **Requires manual migration**: Must move future → current at year boundary
- ❌ **No historical data**: Past years lost unless archived
- ❌ **Complex admin workflow**: Which document to edit?
- ❌ **Potential inconsistency**: During year transitions

**Use Case Fit**: ⚠️ Requires too much maintenance

---

## Option 5: Single Document with Map (Alternative to Array)

**Structure**: Map instead of array
```
config/holidays (document)
  └── holidays: {
        "2025-03-01": "삼일절",
        "2025-05-05": "어린이날",
        ...
      }
```

**Pros:**
- ✅ **O(1) date lookups**: Direct key access
- ✅ **Simple structure**: Single document
- ✅ **No duplicate dates**: Map keys are unique
- ✅ **Easy to update single holiday**: Partial update possible

**Cons:**
- ❌ **Same 1MB limit**: Not more scalable than array
- ❌ **Lost metadata potential**: Can only store name as value
- ❌ **No sorting/filtering**: Must convert to array for queries
- ❌ **Harder to iterate**: Need Object.entries()

**Estimated Capacity**: ~10,000 holidays

**Use Case Fit**: ⚠️ Slightly better than array but same scalability issues

---

## Comparison Matrix

| Option | Scalability | Query Efficiency | Read Cost | Complexity | Caching | Admin UX |
|--------|-------------|------------------|-----------|------------|---------|----------|
| **Current (Array)** | ❌ Poor | ✅ Excellent | ✅ 1 read | ✅ Simple | ✅ Easy | ✅ Simple |
| **Year Sharding** | ✅ Good | ✅ Excellent | ✅ 1-2 reads | ⚠️ Medium | ✅ Easy | ✅ Simple |
| **Individual Docs** | ✅ Excellent | ❌ Poor | ❌ N reads | ❌ Complex | ❌ Hard | ⚠️ Medium |
| **Month Sharding** | ✅ Good | ✅ Good | ✅ 1-3 reads | ⚠️ Medium | ✅ Easy | ⚠️ Medium |
| **Rolling Window** | ⚠️ Medium | ✅ Excellent | ✅ 2 reads | ❌ Complex | ✅ Easy | ❌ Complex |
| **Map** | ❌ Poor | ⚠️ Medium | ✅ 1 read | ✅ Simple | ✅ Easy | ✅ Simple |

---

## Recommendation: **Option 1 (Year Sharding)**

### Why Year Sharding Wins

1. **Perfect for our use case**: Contribution graph shows 4 weeks (typically within same year, max 2 years at year boundary)
2. **Optimal read cost**: 1 read for 90% of cases, 2 reads at year boundaries
3. **Future-proof**: Can store 10,000+ holidays per year
4. **Natural partitioning**: Years are stable (2024 holidays never change after 2024)
5. **Simple admin workflow**: Edit current year or next year
6. **Excellent caching**: Cache current + next year (updates infrequent)

### Implementation Strategy

```typescript
// Firestore structure
config/
  └── holidays/
        └── {year}/
              └── items: Holiday[]

// Client query (for 4-week contribution grid)
async function fetchHolidaysForRange(startDate: Date, endDate: Date) {
  const startYear = startDate.getFullYear().toString();
  const endYear = endDate.getFullYear().toString();

  const years = startYear === endYear
    ? [startYear]
    : [startYear, endYear];

  const promises = years.map(year =>
    getDoc(doc(firestore, `config/holidays/${year}`))
  );

  const docs = await Promise.all(promises);
  return docs.flatMap(d => d.data()?.items || []);
}
```

### Migration Path

1. **Phase 1**: Migrate current array to year-based structure
2. **Phase 2**: Update frontend to query by year
3. **Phase 3**: Update backend calendar module
4. **Phase 4**: Remove old single-document structure

---

## Alternative Recommendation: Keep Current for Now

### When to Stay with Current Implementation

**Keep current structure if:**
- ✅ Total holidays expected < 100
- ✅ Holidays rarely updated (< once per month)
- ✅ Admin team is small (1-2 people)
- ✅ No concurrent edits expected

**Migrate to Year Sharding when:**
- ❌ Approaching 50+ holidays
- ❌ Need to manage multiple years
- ❌ Performance issues arise
- ❌ Multiple admins need concurrent access

### Pragmatic Decision

**Current scope**: Small Korean writing community with ~15-20 Korean national holidays per year

**Verdict**: Current implementation is fine, but **plan migration to Year Sharding** when:
- Adding 2026 holidays (to avoid mixing 3+ years)
- Total holidays > 50
- Need historical holiday data

---

## Estimated Costs (Firestore Pricing)

### Current Implementation
- **Reads**: 1 read per user session (cached 1 hour)
- **Writes**: ~10-20 per year (admin updates)
- **Monthly cost (1000 users)**: ~$0.01

### Year Sharding
- **Reads**: 1-2 reads per user session
- **Writes**: ~10-20 per year per year-document
- **Monthly cost (1000 users)**: ~$0.01-0.02

### Individual Documents
- **Reads**: 20-50 reads per user session (one per holiday)
- **Writes**: 1 per holiday edit
- **Monthly cost (1000 users)**: ~$0.20-0.50 ⚠️ 10-20x more expensive

**Conclusion**: Year sharding has negligible cost increase while providing significant scalability benefits.

---

## Final Recommendation

### Immediate Action
**Keep current implementation** - it's working fine for current scale

### Planned Migration (when needed)
**Migrate to Year Sharding** when:
1. Adding 2026 holidays (December 2025)
2. Total holidays exceed 50
3. Need to support multiple years actively

### Migration Complexity
- **Effort**: 2-3 hours
- **Risk**: Low (backward compatible with caching)
- **Breaking changes**: None (API stays same)
