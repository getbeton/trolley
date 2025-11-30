# Auth Hub Configuration Guide

**Status:** ✅ Code Implementation Complete
**Date:** November 30, 2025
**Commit:** c5544f2

---

## What Was Implemented

Centralized authentication hub where:
- Users visit `trolley.getbeton.ai` → redirected to `auth.getbeton.ai/signin`
- Sign in on auth domain
- Automatically redirected back to trolley after authentication
- Same codebase serves both domains

**Architecture:**
```
User visits trolley.getbeton.ai (unauthenticated)
  ↓
Middleware: redirects to auth.getbeton.ai/signin?return=https://trolley.getbeton.ai
  ↓
User sees sign-in page on auth.getbeton.ai
  ↓
Clicks "Sign in with Google"
  ↓
OAuth flow (Supabase handles this)
  ↓
Callback to trolley.getbeton.ai/auth/callback?return=...
  ↓
Session created, user redirected to trolley.getbeton.ai
  ↓
User is authenticated!
```

---

## Files Changed

### New Files
- `src/lib/utils/domain.ts` - Domain detection and URL validation
- `src/app/signin/page.tsx` - Centralized sign-in page (moved from /auth/signin)

### Modified Files
- `src/middleware.ts` - Domain-aware redirect logic
- `src/app/auth/callback/route.ts` - Return URL support
- `vercel.json` - Multi-domain configuration (alias added)

### Deleted Files
- `src/app/auth/signin/page.tsx` - Removed to force centralized auth

---

## Required Configuration Steps

### 1. Deploy to Vercel with Both Domains

**Option A: Via Vercel Dashboard**
1. Go to [Vercel Project Settings](https://vercel.com/getbeton/beton-trolley/settings/domains)
2. Click "Add Domain"
3. Enter: `auth.getbeton.ai`
4. Click "Add"
5. Vercel will show you the DNS configuration needed

**Option B: Via CLI**
```bash
# Deploy to production
vercel --prod

# The alias in vercel.json will automatically try to assign both domains
```

**Note:** You may need to manually add `auth.getbeton.ai` in the dashboard if CLI doesn't do it automatically.

---

### 2. Update Cloudflare DNS

**Current DNS:**
```
A Record:
├─ trolley → 76.76.21.21 (Vercel)

CNAME Record:
└─ auth → uezyvflphqcizcbfklla.supabase.co (Supabase custom domain)
```

**New DNS Required:**

**Option A: CNAME to Vercel** (Recommended)
```
CNAME Record:
└─ auth → cname.vercel-dns.com
```

**Option B: A Record** (If CNAME doesn't work)
```
A Record:
└─ auth → 76.76.21.21 (same as trolley)
```

**Steps:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select domain: `getbeton.ai`
3. Go to **DNS** → **Records**
4. Find the existing `auth` CNAME record
5. Click **Edit**
6. Change target from `uezyvflphqcizcbfklla.supabase.co` to `cname.vercel-dns.com`
7. Click **Save**
8. Wait 2-5 minutes for propagation

**Verify:**
```bash
dig auth.getbeton.ai
# Should resolve to Vercel IPs, not Supabase
```

---

### 3. Update Google OAuth Configuration

**In Google Cloud Console:**

Go to: [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

**Authorized JavaScript Origins:**
Add `https://auth.getbeton.ai` to the existing list:
```
✅ https://auth.getbeton.ai (NEW)
✅ https://trolley.getbeton.ai
✅ https://uezyvflphqcizcbfklla.supabase.co
✅ http://localhost:3000
```

**Authorized Redirect URIs:**
No changes needed! Keep as is:
```
✅ https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

**Why no change?** The redirect URI goes to Supabase for OAuth handling, not to your app.

**Steps:**
1. Find your OAuth 2.0 Client ID
2. Click **Edit**
3. Under "Authorized JavaScript origins" → Click **Add URI**
4. Enter: `https://auth.getbeton.ai`
5. Click **Save**
6. Wait 5 minutes for changes to propagate

---

### 4. Supabase Configuration

**No changes required!** Current configuration already works:

```
Site URL: https://trolley.getbeton.ai

Redirect URLs:
├─ https://trolley.getbeton.ai/auth/callback
├─ http://localhost:3000/auth/callback
```

**Why?** Because:
- Sign-in happens on `auth.getbeton.ai`
- But OAuth callback goes directly to `trolley.getbeton.ai/auth/callback`
- Supabase doesn't care where the sign-in page is hosted

---

## Testing the Flow

### Test in Production

1. **Clear browser cookies** (important!)
2. Visit: `https://trolley.getbeton.ai`
3. You should be redirected to: `https://auth.getbeton.ai/signin?return=https://trolley.getbeton.ai`
4. Click "Continue with Google"
5. Complete Google OAuth
6. You should be redirected to: `https://trolley.getbeton.ai/auth/callback?return=...`
7. Finally landed on: `https://trolley.getbeton.ai` (authenticated)

### Check Authentication

```bash
# Should show your auth cookie on .getbeton.ai domain
document.cookie
```

### Expected Cookies
- Domain: `.getbeton.ai` (note the leading dot)
- Secure: true (in production)
- SameSite: Lax
- Cookie names: `sb-...` (Supabase auth tokens)

---

## Troubleshooting

### Issue: "This site can't be reached" for auth.getbeton.ai

**Cause:** DNS not configured correctly

**Fix:**
1. Check DNS: `dig auth.getbeton.ai`
2. Should point to Vercel, not Supabase
3. Update Cloudflare DNS (see step 2 above)
4. Wait 2-5 minutes

### Issue: Redirect loop

**Cause:** Middleware detecting wrong domain

**Fix:**
1. Check console logs for domain detection
2. Verify `hostname` in middleware matches `auth.getbeton.ai`
3. Clear browser cache and cookies

### Issue: "Invalid return URL" error

**Cause:** Return URL validation failing

**Fix:**
1. Check `src/lib/utils/domain.ts` - `ALLOWED_RETURN_DOMAINS`
2. Make sure `trolley.getbeton.ai` is in the whitelist
3. Check for typos in the return URL

### Issue: OAuth error "redirect_uri_mismatch"

**Cause:** Google OAuth redirect URI doesn't match

**Fix:**
1. Check Google Cloud Console → Authorized Redirect URIs
2. Should be: `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
3. NOT: `https://auth.getbeton.ai/...` (your app doesn't handle OAuth callback directly)

### Issue: Works on trolley, but not enrichment/facade

**Cause:** Need to add new domains to whitelist

**Fix:**
Edit `src/lib/utils/domain.ts`:
```typescript
export const ALLOWED_RETURN_DOMAINS = [
  "trolley.getbeton.ai",
  "enrichment.getbeton.ai",  // Already there
  "facade.getbeton.ai",      // Already there
] as const
```

Then rebuild and deploy.

---

## Development vs Production

### Development (localhost:3000)

**Current behavior:**
- Middleware skips auth check entirely (line 14-16 in middleware.ts)
- Sign-in page at `http://localhost:3000/signin` works
- No redirect to auth.getbeton.ai

**To test centralized auth locally:**

Option 1: Use production domain
```bash
# Test on actual production
https://trolley.getbeton.ai
```

Option 2: Modify middleware temporarily
```typescript
// Comment out this line in middleware.ts:
// if (process.env.NODE_ENV === "development") {
//   return supabaseResponse
// }
```

Then visit `http://localhost:3000` and it will redirect to `/signin?return=...`

### Production

- Auth check active
- Redirects to `auth.getbeton.ai/signin`
- Return URL validation enforced
- Cookies set on `.getbeton.ai` domain

---

## Security Notes

### Return URL Validation

The code validates return URLs against a whitelist:
```typescript
const ALLOWED_RETURN_DOMAINS = [
  "trolley.getbeton.ai",
  "enrichment.getbeton.ai",
  "facade.getbeton.ai",
]
```

**Prevents:**
- Open redirect attacks
- Phishing attempts
- Unauthorized domains stealing auth

### Cookie Security

Cookies are set with:
- `domain: .getbeton.ai` (shared across subdomains)
- `secure: true` (HTTPS only in production)
- `sameSite: lax` (CSRF protection)

---

## Future: Phase 2 (Extract to Separate App)

When ready to extract auth to its own codebase:

1. Create `apps/auth` directory in monorepo
2. Move `/signin` route and domain utilities
3. Deploy separately to auth.getbeton.ai
4. Update middleware to point to external auth service
5. Benefits: Independent versioning, smaller bundles, clearer separation

**For now:** Phase 1 (same app, two domains) is simpler and works perfectly.

---

## Quick Reference

| What | Current Value |
|------|--------------|
| Auth Sign-in URL | https://auth.getbeton.ai/signin |
| Trolley Callback | https://trolley.getbeton.ai/auth/callback |
| Return URL Param | `?return=https://trolley.getbeton.ai` |
| Cookie Domain | `.getbeton.ai` |
| Middleware | Active in production, skipped in dev |
| Supabase Site URL | https://trolley.getbeton.ai |
| OAuth Callback | https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback |

---

## Summary Checklist

Configuration required (3 steps):

- [ ] **Deploy to Vercel** - Add auth.getbeton.ai domain
- [ ] **Update Cloudflare DNS** - Point auth CNAME to Vercel
- [ ] **Update Google OAuth** - Add auth.getbeton.ai to authorized origins

After configuration:

- [ ] Test: Visit trolley.getbeton.ai (should redirect to auth)
- [ ] Test: Sign in with Google (should work)
- [ ] Test: Verify redirect back to trolley (should be authenticated)
- [ ] Verify: Check cookies are on `.getbeton.ai` domain

---

**Questions?** Check [RECOMMENDED_ARCHITECTURE.md](./RECOMMENDED_ARCHITECTURE.md) for detailed architecture overview.

Made with ❤️ by the Beton team
