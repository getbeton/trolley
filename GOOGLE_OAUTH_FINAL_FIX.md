# Google OAuth Configuration - Final Fix

## Problem

Google OAuth is redirecting to:
```
https://auth.getbeton.ai/auth/v1/callback
```

This doesn't exist! The `/auth/v1/callback` route only exists on Supabase, not on your Next.js app.

## Root Cause

Google OAuth "Authorized redirect URIs" is configured incorrectly.

## Fix Google OAuth (5 minutes)

### Step 1: Go to Google Cloud Console

https://console.cloud.google.com/apis/credentials

### Step 2: Edit OAuth 2.0 Client

Find your OAuth 2.0 Client ID and click **Edit**.

### Step 3: Update Authorized Redirect URIs

**Remove these (if they exist):**
- ❌ `https://auth.getbeton.ai/auth/v1/callback`
- ❌ Any other auth.getbeton.ai callback URLs

**Add this (if not already there):**
- ✅ `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`

**Keep these (if they exist):**
- `http://localhost:3000/auth/callback` (for local development)

### Step 4: Update Authorized JavaScript Origins

Should include:
- `https://auth.getbeton.ai`
- `https://trolley.getbeton.ai`
- `https://uezyvflphqcizcbfklla.supabase.co`
- `http://localhost:3000`

### Step 5: Save

Click **Save** and wait **5 minutes** for changes to propagate.

---

## How OAuth Flow Should Work

```
User clicks "Sign in with Google"
  ↓
App calls Supabase signInWithOAuth()
  ↓
Supabase redirects to Google OAuth
  ↓
User authorizes on Google
  ↓
Google redirects to: https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback?code=...
  ↓
Supabase exchanges code for session
  ↓
Supabase redirects to: https://trolley.getbeton.ai/auth/callback
  ↓
App processes callback, sets cookies
  ↓
User is logged in ✅
```

---

## Verification After Fix

After updating Google OAuth and waiting 5 minutes:

1. Open browser in **incognito mode** (clear cache)
2. Visit: https://trolley.getbeton.ai
3. Click "Sign in with Google"
4. You should be redirected through:
   - Google OAuth screen
   - Supabase (briefly)
   - Back to trolley.getbeton.ai
5. **You're logged in!** ✅

---

## Why Supabase, Not auth.getbeton.ai?

Supabase needs to process the OAuth callback to exchange the authorization code for a session token. The flow is:

1. **Google → Supabase** - Supabase processes OAuth
2. **Supabase → Your App** - Your app receives the session

You cannot skip Supabase in this flow. That's why the Google OAuth redirect URI must point to Supabase's domain, not your app's domain.

---

## Summary

**Correct Google OAuth Redirect URI:**
```
https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

**Supabase then redirects to (configured in your app code):**
```
https://trolley.getbeton.ai/auth/callback
```

---

After this fix, everything will work! 🎉
