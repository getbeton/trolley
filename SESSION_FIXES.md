# Session Fixes Summary

## Issues Fixed

### 1. Twenty API Entity Fetching
**Problem**: Field name mismatch - API returns `nameSingular`/`namePlural`/`labelSingular`/`labelPlural`, code expected `name`/`label`

**Solution**:
- Updated `TwentyEntity` interface in `twenty.ts`
- Updated UI type definitions in `page.tsx` to use correct field names
- Added system object filtering (`!entity.isSystem`) to show only CRM entities

### 2. Attio API Object Listing
**Problem**: API returns different structure - `api_slug`, `singular_noun`, `plural_noun` instead of expected fields

**Solution**:
- Created `AttioObjectRaw` interface to match actual API response
- Added mapping function to convert API response to internal format:
  - `api_slug` → `object_name`
  - `singular_noun` → `label`
  - `id.object_id` → `id`

### 3. Attio Preview Records
**Problem**: Records endpoint structure mismatch - expected `response.data.records`, but API returns `response.data` as array

**Solution**:
- Updated `AttioRecordResponse` interface from nested to flat array structure
- Changed endpoint from `/records` to `/records/query` with POST method
- Fixed return statement to use `response.data` directly

### 4. Twenty Preview Records
**Problem**: Wrong entity name format - using singular instead of plural

**Solution**:
- Changed preview button to pass `entity.namePlural` instead of `entity.nameSingular`
- Twenty REST API uses plural forms for collection endpoints

### 5. React Key Warnings
**Problem**: Duplicate or object keys in Attio table

**Solution**:
- Changed from `key={object.id}` to `key={\`${object.object_name}-${index}\`}`
- Handles cases where ID is an object or undefined

### 6. Preview Display Safety
**Problem**: `slice()` called on non-array data causing runtime error

**Solution**:
- Added `Array.isArray()` check before calling `.slice()`
- Safely handles both array and non-array responses

### 7. Session Persistence
**Problem**: Wizard state lost on page refresh

**Solution**:
- Added localStorage-based session persistence
- 30-minute expiry for security
- Saves: active step, credentials, domain mode, custom URL
- Auto-restores on page load if session valid

### 8. Table Scroll Issue
**Problem**: Entity/object tables don't scroll properly when preview content makes rows tall

**Solution**:
- Replaced `ScrollArea` component with regular `div` elements
- Changed from `<ScrollArea className="max-h-[420px]">` to `<div className="max-h-[420px] overflow-auto">`
- Applied to both Twenty entities table and Attio objects table
- Tables now properly scroll vertically even with tall content

### 9. Dynamic Field Count Calculation
**Problem**: Field counters show 0 for entities/objects that have fields

**Solution**:
- Added `fieldCounts` state to track calculated field counts per entity/object
- Updated `SamplePreviewButton` to calculate field count from preview data
- When preview data is fetched, count the keys in the first record
- Display calculated field counts in tables: `fieldCounts[name] ?? fallback`
- Works for both Twenty entities and Attio objects
- Falls back to metadata field count if preview hasn't been fetched yet

### 10. Automatic Entity/Object Prefetching
**Problem**: Users had to manually click "Fetch entities" and "Fetch objects" buttons after validating credentials

**Solution**:
- Automatically trigger `sourceEntities.refetch()` after Twenty credentials are validated
- Automatically trigger `destinationObjects.refetch()` after Attio credentials are validated
- Changed "Fetch" buttons to "Refresh" buttons that only appear when data is already loaded
- Added loading states that show while data is being fetched
- Updated empty state messages to reflect automatic loading
- Improved UX: data is ready immediately when users navigate to the selection steps

### 11. Automatic Field Count Fetching
**Problem**: Field counts showed 0 for all entities until users manually clicked preview buttons

**Solution**:
- Added `useEffect` hooks in both EntitySelectionStep and DestinationSelectionStep
- Automatically fetch preview data for all entities/objects when they're first loaded
- Extract field count from first record in preview response
- Update `fieldCounts` state automatically
- Field counts now display immediately without manual preview clicks
- Silently handles errors - users can still manually click preview if auto-fetch fails

### 12. Checkbox Selection State Synchronization
**Problem**: Checkboxes showed unchecked even when entities were saved as selected in database, causing incorrect "8 entities selected" count. Checkboxes were also unresponsive - clicking them didn't update the UI.

**Solution**:
- Made checkboxes controlled components by adding `checked` prop
- Pass `selectionState` from backend to both selection step components
- Create `selectionMap` using `useMemo` to map entity names to their selection status
- Checkboxes now read from `selectionMap[entityName] ?? false`
- Added `onSuccess` callback to mutation to refetch selection state after save
- UI state synchronized with backend database state
- Checkboxes now respond to clicks and update immediately
- Accurate selection counts on mapping page

## Current Limitations

1. **Preview data format**: Shows raw JSON structure. Could be formatted better for readability.

2. **Background field fetching**: Field counts are automatically fetched in the background when entities/objects load. During initial load, there may be a brief moment where counts show 0 or metadata values before the preview data arrives.

## Files Modified

- `app/src/server/services/twenty.ts` - Twenty API interface updates
- `app/src/server/services/attio.ts` - Attio API mapping and endpoints
- `app/src/app/page.tsx` - UI types, session persistence, preview handling

## Testing Checklist

- [x] Twenty entities fetch and display correctly
- [x] Attio objects fetch and display correctly
- [x] Preview buttons work for both systems
- [x] Session persists across page refresh
- [x] No React key warnings
- [x] Build completes successfully
- [x] Tables scroll properly even with tall preview content
- [x] Field counts calculated dynamically from preview data
- [x] Entities/objects automatically prefetched after credential validation
- [x] Field counts automatically fetched and displayed
- [x] Checkbox states synchronized with backend selection state
- [x] Accurate entity count on mapping page
- [ ] Preview formatting improved (stretch goal)

---

# Major Architectural Refactor: Local-Only State Management

**Date**: 2025-11-30
**Motivation**: Eliminate unnecessary database persistence for entity/object selections. Database should only store migration logs and encrypted tokens. Entity selections should be ephemeral, local-only state with 30-minute localStorage expiry.

## 13. Local-Only Entity Selection State
**Problem**:
- Every checkbox click triggered immediate database write via tRPC mutation
- Database queries on every page load to fetch selection state
- Caused performance overhead (API + DB write + DB read per click)
- Left stale data from previous sessions in database
- Unnecessary complexity - selections don't need to persist beyond the 30-minute session
- Violated user's architectural principle: "database only for logs and tokens"

**Solution**:
- Removed all database persistence for entity/object selections
- Added `entitySelections: EntitySelection[]` to `WizardSession` interface
- Entity selections now stored in React state and localStorage (30-minute expiry)
- Created local `handleEntitySelectionChange` function to update state
- Removed `selectionSnapshot` database query
- Updated `EntitySelectionStep` and `DestinationSelectionStep` to use local state
- Simplified `MappingStep` to display selected entities from local state
- Removed entire `selectionRouter` from API (saveEntities, saveFields, list endpoints)
- Removed `api.selections` from root router

**Technical Changes**:

1. **New Types** ([page.tsx:128-132](app/src/app/page.tsx#L128-L132)):
```typescript
interface EntitySelection {
  entityName: string
  system: "TWENTY" | "ATTIO"
  includeInSync: boolean
}
```

2. **Updated Session Interface** ([page.tsx:134-141](app/src/app/page.tsx#L134-L141)):
```typescript
interface WizardSession {
  activeStep: StepId
  credentialState: CredentialState
  twentyDomainMode: "cloud" | "custom"
  customTwentyUrl: string
  entitySelections: EntitySelection[]  // NEW
  timestamp: number
}
```

3. **Local State Handler** ([page.tsx:217-234](app/src/app/page.tsx#L217-L234)):
```typescript
const handleEntitySelectionChange = (
  entityName: string,
  system: "TWENTY" | "ATTIO",
  includeInSync: boolean
) => {
  setEntitySelections((prev) => {
    const existingIndex = prev.findIndex(
      (selection) => selection.entityName === entityName && selection.system === system
    )
    if (existingIndex >= 0) {
      const updated = [...prev]
      updated[existingIndex] = { entityName, system, includeInSync }
      return updated
    } else {
      return [...prev, { entityName, system, includeInSync }]
    }
  })
}
```

4. **Component Updates**:
- `EntitySelectionStep` now receives `entitySelections` instead of `selectionState`
- `DestinationSelectionStep` now receives `entitySelections` instead of `selectionState`
- Both create `selectionMap` from local state: `entitySelections.filter(s => s.system === "TWENTY"|"ATTIO")`
- `MappingStep` simplified to show entity names without field-level detail

5. **Router Cleanup** ([root.ts:1-10](app/src/server/api/root.ts#L1-L10)):
- Removed `selectionRouter` import and mount point
- API surface reduced: only credentials, entities, and migrations routers remain

**Benefits**:
- ✅ Zero database writes on checkbox clicks (instant UI response)
- ✅ No stale selection data between sessions
- ✅ Simplified architecture - one less router, fewer API calls
- ✅ Adheres to "database only for logs and tokens" principle
- ✅ State automatically expires after 30 minutes via localStorage
- ✅ Build passes with no TypeScript errors

**Trade-offs**:
- Field-level mapping UI simplified (no longer shows individual field selection)
- Selections lost if user clears localStorage manually
- Cannot share selections across devices (by design)

## Files Modified in This Refactor

- [page.tsx](app/src/app/page.tsx) - Major refactor: local state, session interface, component props
- [root.ts](app/src/server/api/root.ts) - Removed selections router
- [selection.ts](app/src/server/api/routers/selection.ts) - No longer imported (kept for reference)

## Testing Checklist (Post-Refactor)

- [x] Build completes successfully
- [x] TypeScript compilation passes
- [x] No runtime errors on page load
- [ ] Manual E2E test: checkbox clicks update UI instantly
- [ ] Manual E2E test: selections persist across page refresh (within 30 min)
- [ ] Manual E2E test: selections cleared after 30 minutes
- [ ] Manual E2E test: mapping page shows selected entities
- [ ] Manual E2E test: entity counts accurate on mapping page

---

# Preview Data Optimization: Batch Fetch & Cache

**Date**: 2025-11-30
**Motivation**: Eliminate redundant API calls for preview data. Every "Preview" button click was making a fresh API request. Instead, fetch all preview data once when entities/objects load, cache in localStorage, and display cached data on button clicks.

## 14. Preview Data Batch Fetching and Caching
**Problem**:
- Every "Preview" button click triggered a fresh API request
- Preview data was fetched one-by-one in useEffect hooks (inefficient)
- No caching - same data fetched multiple times
- Slow and wasteful - unnecessary network calls
- User confusion - "why is it fetching again?"

**Solution**:
- Added `previewData: Record<string, Record<string, unknown>[]>` to session storage
- Batch-fetch ALL preview data when entities/objects first load
- Store preview data in localStorage (30-minute expiry with session)
- Preview button now just toggles display of cached data - zero API calls
- Removed individual preview mutations from EntitySelectionStep/DestinationSelectionStep
- Simplified SamplePreviewButton to read from cachedData prop

**Technical Changes**:

1. **Session Interface** ([page.tsx:140](app/src/app/page.tsx#L140)):
```typescript
interface WizardSession {
  // ... existing fields
  previewData: Record<string, Record<string, unknown>[]>
  timestamp: number
}
```

2. **Batch Fetching Logic** ([page.tsx:222-290](app/src/app/page.tsx#L222-L290)):
- Two useEffects watch for `sourceEntities.data` and `destinationObjects.data`
- When entities/objects load, batch-fetch ALL preview data in sequence
- Store with namespaced keys: `twenty:${entityName}` and `attio:${objectName}`
- Also calculate and store field counts during batch fetch
- Handles errors gracefully - failed fetches don't block others

3. **Preview Button Simplification** ([page.tsx:1401-1446](app/src/app/page.tsx#L1401-L1446)):
```typescript
function SamplePreviewButton({
  variant,
  name,
  cachedData,  // NEW: receives cached data as prop
  onFieldCountCalculated,
}: {
  variant: "twenty" | "attio"
  name: string
  cachedData?: Record<string, unknown>[]  // NEW
  onFieldCountCalculated?: (count: number) => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  const handlePreview = () => {
    setShowPreview(!showPreview)  // Just toggle visibility - no API call!

    if (cachedData && cachedData.length > 0) {
      const fieldCount = Object.keys(cachedData[0]).length
      onFieldCountCalculated?.(fieldCount)
    }
  }

  return (
    // Button disabled if no cached data, enabled once fetched
    <Button onClick={handlePreview} disabled={!cachedData}>
      {showPreview ? "Hide" : "Preview"}
    </Button>
  )
}
```

4. **Removed Code**:
- `twentyPreviewMutation` from EntitySelectionStep
- `attioPreviewMutation` from DestinationSelectionStep
- Individual preview fetching useEffects in both components
- API mutation calls from SamplePreviewButton

**Benefits**:
- ✅ Zero API calls when clicking "Preview" (instant display)
- ✅ All preview data fetched once at optimal time (after entities load)
- ✅ Preview data persists across page refresh (localStorage)
- ✅ Reduced network traffic - batch fetch is more efficient than one-by-one
- ✅ Better UX - no confusion about "why is it loading again?"
- ✅ Field counts calculated during initial batch fetch
- ✅ Preview button becomes simple show/hide toggle

**Trade-offs**:
- Initial load slightly longer (fetching all previews upfront)
- More localStorage usage (preview data can be large)
- Preview data could be stale for long sessions (30-min expiry mitigates this)

**Flow Summary**:
1. User validates Twenty credentials
2. `sourceEntities.refetch()` loads entity metadata
3. useEffect detects new entities → batch-fetches ALL preview data
4. Preview data stored in `previewData` state → saved to localStorage
5. User clicks "Preview" → button toggles display of cached data (no API call)
6. Same flow for Attio objects

## Files Modified in Preview Optimization

- [page.tsx](app/src/app/page.tsx) - Added preview caching, batch fetching, simplified SamplePreviewButton

## Testing Checklist (Preview Optimization)

- [x] Build completes successfully
- [x] TypeScript compilation passes
- [ ] Manual E2E test: Preview button shows cached data instantly
- [ ] Manual E2E test: No API calls when clicking Preview button
- [ ] Manual E2E test: Preview data persists across page refresh
- [ ] Manual E2E test: Field counts display correctly from preview data
- [ ] Manual E2E test: Preview button disabled until data loads, then enabled
