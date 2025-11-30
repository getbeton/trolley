# Google OAuth Configuration Fix Guide

**Date:** November 30, 2025

This guide fixes the current OAuth issues and sets up both test and production environments.

---

## Current Issues

1. ❌ **redirect_uri_mismatch** - Google OAuth redirect URI doesn't match
2. ❌ **Site URL is wrong** - Supabase points to `railway.app` instead of your domain
3. ❌ **trolley.getbeton.ai unreachable** - DNS not configured
4. ✅ **auth.getbeton.ai working** - CNAME already points to Supabase

---

## Part 1: Fix DNS for trolley.getbeton.ai

### Add DNS Record in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Configure:
   ```
   Type: A
   Name: trolley
   IPv4 address: 76.76.21.21
   Proxy status: Proxied (orange cloud)
   TTL: Auto
   ```
6. Click **Save**
7. Wait 2-5 minutes for propagation

**Verify:**
```bash
dig trolley.getbeton.ai
# Should resolve to an IP address
```

---

## Part 2: Fix Supabase Site URL

### Update beton-auth Project Settings

1. Go to [Supabase beton-auth](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
2. Navigate to **Authentication** → **URL Configuration**
3. Update **Site URL** to:
   ```
   https://trolley.getbeton.ai
   ```
4. Update **Redirect URLs** to include:
   ```
   https://trolley.getbeton.ai/auth/callback
   https://beton-trolley-gof7r7gq1-getbeton.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
5. Click **Save**

---

## Part 3: Configure Google Cloud Console

### For Production Environment

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Click **Edit**

#### Add Authorized JavaScript Origins:
```
https://auth.getbeton.ai
https://uezyvflphqcizcbfklla.supabase.co
https://trolley.getbeton.ai
https://beton-trolley-gof7r7gq1-getbeton.vercel.app
```

#### Add Authorized Redirect URIs:
```
https://auth.getbeton.ai/auth/v1/callback
https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

4. Click **Save**
5. Wait 5 minutes for changes to propagate

---

## Part 4: Configure Test Environment (Optional)

If you want a separate test environment:

### Option A: Use Same Google OAuth Client (Recommended)

Just add your test URLs to the same OAuth client:

**Authorized JavaScript Origins:**
```
http://localhost:3000
https://beton-trolley-*.vercel.app (use wildcard for preview deployments)
```

**Authorized Redirect URIs:**
```
http://localhost:3000/auth/callback
https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback (same as prod)
```

### Option B: Create Separate OAuth Client for Testing

1. In Google Cloud Console, create a **new** OAuth 2.0 Client ID
2. Name it "Beton Test"
3. Add test/localhost URLs only
4. Configure Supabase test project with these new credentials

**We recommend Option A** - it's simpler and works for most use cases.

---

## Part 5: Verify Configuration

### Test Production OAuth Flow

1. Visit https://trolley.getbeton.ai (once DNS propagates)
2. Click "Sign in with Google"
3. You should see Google's OAuth consent screen
4. After authorizing, you should be redirected back to the app
5. You should be logged in

### Test Local Development

1. Run your app locally: `npm run dev`
2. Visit http://localhost:3000
3. Click "Sign in with Google"
4. Should work with the same OAuth client

---

## Summary of What You Need to Do

### ✅ Step 1: DNS (5 minutes)
- [ ] Add A record: `trolley → 76.76.21.21` in Cloudflare
- [ ] Wait for propagation
- [ ] Verify: `dig trolley.getbeton.ai`

### ✅ Step 2: Supabase Site URL (2 minutes)
- [ ] Go to beton-auth → Authentication → URL Configuration
- [ ] Set Site URL to: `https://trolley.getbeton.ai`
- [ ] Add redirect URLs (trolley, vercel, localhost)
- [ ] Click Save

### ✅ Step 3: Google OAuth (5 minutes)
- [ ] Go to Google Cloud Console → Credentials
- [ ] Edit your OAuth 2.0 Client
- [ ] Add authorized origins: `auth.getbeton.ai`, `uezyvflphqcizcbfklla.supabase.co`, `trolley.getbeton.ai`
- [ ] Add redirect URIs: `https://auth.getbeton.ai/auth/v1/callback`, `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
- [ ] Click Save
- [ ] Wait 5 minutes

### ✅ Step 4: Test (2 minutes)
- [ ] Visit https://trolley.getbeton.ai
- [ ] Try signing in with Google
- [ ] Should work!

---

## Understanding Your Setup

### Production Architecture:
```
User visits: https://trolley.getbeton.ai
  ↓
Clicks "Sign in with Google"
  ↓
Redirected to: https://auth.getbeton.ai/auth/v1/authorize
  ↓
Google OAuth screen appears
  ↓
After authorization, redirected to: https://auth.getbeton.ai/auth/v1/callback
  ↓
Supabase exchanges code for session
  ↓
User redirected back to: https://trolley.getbeton.ai/auth/callback
  ↓
App sets cookie and authenticates user
  ↓
User is logged in!
```

### Why auth.getbeton.ai?
- **Branding**: Users see your domain instead of `supabase.co`
- **Trust**: More professional OAuth flow
- **Consistency**: All URLs use `getbeton.ai` domain

### Why Both Redirect URIs?
You need BOTH:
- `https://auth.getbeton.ai/auth/v1/callback` (custom domain)
- `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` (Supabase domain)

Because Supabase might use either depending on how the OAuth flow is initiated.

---

## Troubleshooting

### Error: redirect_uri_mismatch
**Problem:** The redirect URI in Google Cloud doesn't match what Supabase is sending.

**Solution:**
- Verify you added BOTH redirect URIs to Google Cloud Console
- Wait 5 minutes after saving changes
- Try in incognito mode (clear browser cache)

### Error: Site can't be reached (trolley.getbeton.ai)
**Problem:** DNS not configured or not propagated yet.

**Solution:**
- Verify A record exists in Cloudflare
- Check DNS: `dig trolley.getbeton.ai`
- Wait 2-5 minutes for propagation
- Try from different network/device

### OAuth works but shows wrong domain
**Problem:** Supabase Site URL is still set to old domain.

**Solution:**
- Update Site URL in Supabase dashboard
- Redeploy your Vercel app
- Clear browser cookies

---

## For Local Development

Your local development should work with the same Google OAuth client:

1. Make sure you added `http://localhost:3000` to Authorized JavaScript Origins
2. The redirect URI `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` works for both prod and dev
3. Your local `.env.local` should have the same auth URLs as production

---

## Quick Reference

| What | Production | Development |
|------|-----------|-------------|
| App URL | https://trolley.getbeton.ai | http://localhost:3000 |
| Auth URL | https://auth.getbeton.ai | https://uezyvflphqcizcbfklla.supabase.co |
| OAuth Redirect | https://auth.getbeton.ai/auth/v1/callback | https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback |
| App Callback | /auth/callback | /auth/callback |
| Google OAuth | Same client for both | Same client for both |

---

**Need Help?** Check:
- [OAUTH_VERIFICATION_CHECKLIST.md](./OAUTH_VERIFICATION_CHECKLIST.md) - Detailed verification steps
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Initial OAuth setup guide
- [Supabase Custom Domain Docs](https://supabase.com/docs/guides/platform/custom-domains)

---

Made with ❤️ by the Beton team
