# URGENT: Architecture Fix Required

## Problem Found

The architecture is misconfigured. `auth.getbeton.ai` is pointing to Supabase, but the app expects it to host the Next.js application.

### Current Setup (WRONG)
```
auth.getbeton.ai → Supabase (CNAME: uezyvflphqcizcbfklla.supabase.co)
Middleware redirects → https://auth.getbeton.ai/signin
Error → {"error":"requested path is invalid"}
```

**Why it fails:** Supabase only has `/auth/v1/*` routes for OAuth. It doesn't have the `/signin` route (which is a Next.js page in your app).

### Correct Architecture
```
auth.getbeton.ai → Vercel (hosts Next.js app with /signin page)
trolley.getbeton.ai → Vercel (same Next.js app)
Supabase OAuth → Uses default supabase.co domain (no custom domain)
```

## Fix Steps

### Step 1: Update Cloudflare DNS ✅ (ALREADY DONE)

vercel.json has been updated to include auth.getbeton.ai as an alias.

### Step 2: Change Cloudflare DNS (2 minutes)

1. Go to: https://dash.cloudflare.com
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Find the `auth` CNAME record
5. **Change the target** from:
   ```
   uezyvflphqcizcbfklla.supabase.co
   ```
   to:
   ```
   cname.vercel-dns.com
   ```
6. Ensure **Proxy status: Proxied** (orange cloud ON)
7. Click **Save**

### Step 3: Redeploy to Vercel (1 minute)

```bash
cd /Users/nadyyym/beton-trolley
vercel --prod
```

This will:
- Deploy the app with both domains (trolley.getbeton.ai and auth.getbeton.ai)
- Both domains will serve the same Next.js app
- The /signin page will work on both domains

### Step 4: Verify (2 minutes)

After DNS propagates (2-5 minutes):

```bash
# Should return HTML (Next.js page), not JSON error
curl https://auth.getbeton.ai/signin

# Should redirect to signin
curl -I https://auth.getbeton.ai/

# OAuth callback route should work
curl -I https://auth.getbeton.ai/auth/callback
```

## How the Correct Architecture Works

### Centralized Auth Hub Pattern

1. **User visits:** https://trolley.getbeton.ai (unauthenticated)
2. **Middleware detects:** Not on auth domain + not authenticated
3. **Redirects to:** https://auth.getbeton.ai/signin?return=...
4. **User sees:** Next.js signin page (hosted on Vercel)
5. **User clicks:** "Sign in with Google"
6. **Redirects to:** Google OAuth → Supabase
7. **OAuth callback:** Supabase → https://auth.getbeton.ai/auth/callback (Next.js route)
8. **App processes:** Exchanges code for session, sets cookies
9. **Redirects back:** To return URL (trolley.getbeton.ai)
10. **User is logged in:** Session cookie shared across .getbeton.ai domains

### Why Both Domains Point to Vercel

- `trolley.getbeton.ai` - Main app domain
- `auth.getbeton.ai` - Centralized sign-in page (for all Beton apps)

Both serve the **same Next.js application** from Vercel. The middleware detects which domain you're on and adjusts behavior accordingly.

## Supabase OAuth Configuration

Supabase should use its **default domain** (no custom domain):

**Redirect URIs:**
- `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` (Supabase processes OAuth)
- Then Supabase redirects to: `https://trolley.getbeton.ai/auth/callback` (or auth.getbeton.ai)

**Google OAuth Configuration:**
- **Authorized JavaScript Origins:**
  - `https://trolley.getbeton.ai`
  - `https://auth.getbeton.ai`
  - `https://uezyvflphqcizcbfklla.supabase.co`
- **Authorized Redirect URIs:**
  - `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` (Supabase OAuth endpoint)

## After Fix

Test the complete flow:

1. Visit: https://trolley.getbeton.ai
2. Redirects to: https://auth.getbeton.ai/signin
3. Click "Sign in with Google"
4. Google OAuth → Supabase → Back to app
5. You're logged in ✅

---

**Files Modified:**
- ✅ vercel.json (added auth.getbeton.ai to aliases)
- 🔄 Cloudflare DNS (need to change auth CNAME to Vercel)
- 🔄 Vercel deployment (need to redeploy)
