# Double URL Encoding Fix - November 30, 2025

## Problem

When clicking "Sign in with Google" on `https://auth.getbeton.ai/signin`, the OAuth flow failed with:

```
Failed to construct 'URL': Invalid URL
```

The return URL parameter was **double-encoded**:
- Single-encoded (correct): `https%3A%2F%2Ftrolley.getbeton.ai%2F`
- Double-encoded (broken): `https%253A%252F%252Ftrolley.getbeton.ai%252F`

## Root Cause

**File**: [src/middleware.ts](src/middleware.ts#L68-L70)

```typescript
// ❌ BEFORE (caused double encoding)
const returnURL = encodeURIComponent(request.url)  // Manual encoding
const authURL = new URL("https://auth.getbeton.ai/signin")
authURL.searchParams.set("return", returnURL)  // URLSearchParams encodes AGAIN!
```

### Why This Happened

1. **Line 68**: `encodeURIComponent(request.url)` manually encoded the URL
2. **Line 70**: `searchParams.set()` **automatically encodes** its values
3. **Result**: Double encoding → `https%253A%252F%252F...`

When the sign-in page tried to parse this:
```typescript
const returnURL = searchParams.get("return")  // Gets single-decoded: "https%3A%2F%2F..."
new URL(returnURL)  // ❌ FAILS - still encoded once!
```

## Solution

**Fixed in commit**: `f7ddbbb`

```typescript
// ✅ AFTER (correct single encoding)
const authURL = new URL("https://auth.getbeton.ai/signin")
authURL.searchParams.set("return", request.url)  // Let URLSearchParams handle encoding
```

### How It Works Now

1. **Middleware**: `searchParams.set("return", "https://trolley.getbeton.ai/")`
   - Creates: `?return=https%3A%2F%2Ftrolley.getbeton.ai%2F` (single-encoded)

2. **Sign-in Page**: `searchParams.get("return")`
   - Returns: `"https://trolley.getbeton.ai/"` (automatically decoded by Next.js)

3. **Sign-in Page**: `new URL(returnURL)`
   - ✅ Works! The URL is properly decoded

## Testing

### Before Fix
```bash
# Visiting trolley.getbeton.ai redirects to:
https://auth.getbeton.ai/signin?return=https%253A%252F%252Ftrolley.getbeton.ai%252F

# Clicking "Sign in with Google":
❌ Error: Failed to construct 'URL': Invalid URL
```

### After Fix
```bash
# Visiting trolley.getbeton.ai redirects to:
https://auth.getbeton.ai/signin?return=https%3A%2F%2Ftrolley.getbeton.ai%2F

# Clicking "Sign in with Google":
✅ OAuth flow starts correctly
```

## Key Takeaway

**Never manually encode values before passing them to `URLSearchParams.set()`** - it handles encoding automatically!

```typescript
// ❌ DON'T DO THIS
const encoded = encodeURIComponent(value);
url.searchParams.set("param", encoded);  // Double encodes!

// ✅ DO THIS
url.searchParams.set("param", value);  // Single encodes correctly
```

## Files Modified

- ✅ [src/middleware.ts](src/middleware.ts) - Removed manual `encodeURIComponent()`
- ✅ [src/app/signin/page.tsx](src/app/signin/page.tsx) - Added clarifying comment

## Deployment

- **Commit**: `f7ddbbb`
- **Deployed**: November 30, 2025
- **Status**: ✅ Live on production

## Verification Steps

1. Visit: https://trolley.getbeton.ai
2. Verify redirect URL has single-encoded return parameter (count the `%` characters)
3. Click "Sign in with Google" on the auth page
4. Verify OAuth flow starts without JavaScript errors
5. Complete OAuth and verify successful authentication

---

**Related Issues**:
- Environment Variable Corruption Fix: [OAUTH_FIXES_COMPLETED.md](OAUTH_FIXES_COMPLETED.md)
- Original Investigation: [.claude/plans/mellow-hugging-sparkle.md](.claude/plans/mellow-hugging-sparkle.md)
