# DNS and OAuth Configuration Instructions

## Status: Manual Steps Required

The code and Vercel environment variables have been fixed. You now need to complete these manual steps:

---

## Option A: Use Direct Supabase URL (Recommended - Quickest Fix)

This option works immediately and avoids custom domain complexity.

### Step 1: Update Google OAuth Redirect URIs (5 minutes)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find and click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, make these changes:
   - ✅ **KEEP:** `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
   - ❌ **REMOVE:** `https://auth.getbeton.ai/auth/v1/callback`
4. Click **Save**
5. Wait 5 minutes for changes to propagate

### Step 2: Update Cloudflare DNS (2 minutes)

1. Go to: https://dash.cloudflare.com
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Find the `auth` CNAME record
5. **Delete** it (no longer needed)

**Result:** OAuth will work using the direct Supabase URL. Users will see `supabase.co` during OAuth flow.

---

## Option B: Set Up Supabase Custom Domain (Advanced)

This option provides a branded OAuth experience but requires Supabase Pro plan.

### Step 1: Configure Supabase Custom Domain

1. Go to: https://supabase.com/dashboard/project/uezyvflphqcizcbfklla/settings/general
2. Navigate to **Settings** → **Custom Domains**
3. Click **Add custom domain**
4. Enter: `auth.getbeton.ai`
5. Copy the CNAME target provided by Supabase (e.g., `custom-domain.supabase.co`)

### Step 2: Update Cloudflare DNS

1. Go to: https://dash.cloudflare.com
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Find the existing `auth` CNAME record
5. **Edit** it:
   - Type: CNAME
   - Name: auth
   - Target: [CNAME from Supabase]
   - **Proxy status: OFF** (gray cloud - very important!)
   - TTL: Auto
6. Click **Save**

### Step 3: Wait for SSL Provisioning

Supabase will automatically provision an SSL certificate. This takes 5-10 minutes.

### Step 4: Verify Custom Domain Works

```bash
curl -I https://auth.getbeton.ai/auth/v1/callback
# Should return: 303 See Other
```

### Step 5: Google OAuth Already Configured

The redirect URI `https://auth.getbeton.ai/auth/v1/callback` should already be in your Google OAuth config. If not, add it.

**Result:** OAuth will work with your branded domain. Users see `auth.getbeton.ai` during OAuth flow.

---

## Verification After Configuration

### Test Production OAuth

1. Visit: https://trolley.getbeton.ai
2. Click "Sign in with Google"
3. Complete OAuth authorization
4. You should be redirected back and logged in
5. ✅ **No 404 errors**
6. ✅ **No tRPC 500 errors** (check browser console)

### Test tRPC Endpoints

After logging in, open browser console and check for errors:
- `migrations.listRuns` should return 200
- `migrations.notifications` should return 200

---

## What Was Fixed

✅ **Vercel Environment Variables** - Removed `\n` characters from all Supabase URLs and keys
✅ **vercel.json** - Removed `auth.getbeton.ai` from aliases
✅ **.env.local** - Added AUTH and DATA client configuration
✅ **Code** - No changes needed (architecture is correct)

🔄 **Pending** - DNS configuration (choose Option A or B above)
🔄 **Pending** - Google OAuth redirect URI update (if using Option A)

---

## Recommendation

**Use Option A** if you want OAuth working immediately. You can always switch to Option B later if you want the branded experience.

---

## Questions?

If OAuth still doesn't work after completing these steps:

1. Check the exact error message in browser console
2. Verify Google OAuth redirect URIs match what Supabase is sending
3. Check Supabase logs: https://supabase.com/dashboard/project/uezyvflphqcizcbfklla/logs/explorer
4. Ensure cookies are being set (check Application → Cookies in browser dev tools)

---

**Created:** 2025-11-30
**By:** Claude Code Root Cause Analysis
