# Google OAuth Setup for Beton Trolley

Quick guide to configure Google OAuth authentication for your app.

**Date:** November 30, 2025

---

## Your Supabase Auth Project

**Project:** beton-auth
**URL:** https://uezyvflphqcizcbfklla.supabase.co
**Callback URL:** `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`

---

## Step 1: Create Google Cloud Project (if needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click project dropdown → **New Project**
3. Name: "Beton Authentication"
4. Click **Create**
5. Select the new project

---

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → Click **Create**
3. Fill in:
   - **App name**: Beton
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. Skip **Scopes** → Click **Save and Continue**
6. Skip **Test users** → Click **Save and Continue**
7. Click **Back to Dashboard**

---

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Name: "Beton Production"

### Add Authorized JavaScript Origins:

```
https://uezyvflphqcizcbfklla.supabase.co
https://app.getbeton.ai
```

### Add Authorized Redirect URIs:

```
https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

5. Click **Create**
6. **Copy the Client ID and Client Secret** → Save them temporarily

---

## Step 4: Configure Supabase Auth

1. Go to [Supabase beton-auth Dashboard](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** → Toggle to **Enabled**
4. Paste:
   - **Client ID**: [from Step 3]
   - **Client Secret**: [from Step 3]
5. Click **Save**

---

## Step 5: Configure Redirect URLs in Supabase

1. Still in **Authentication** settings
2. Go to **URL Configuration**
3. Add redirect URLs:

```
https://app.getbeton.ai/auth/callback
http://localhost:3000/auth/callback
```

4. Set **Site URL**: `https://app.getbeton.ai`
5. Click **Save**

---

## Step 6: Test Authentication

1. Deploy your app (see below)
2. Visit your production URL
3. Click "Sign in with Google"
4. Authorize the app
5. You should be redirected back and authenticated

---

## Quick Commands

### Get Project Details
```bash
# Check current Supabase projects
supabase projects list | grep beton-auth

# Verify environment variables in Vercel
vercel env ls
```

### Deploy to Vercel
```bash
vercel --prod
```

---

## Troubleshooting

### Error: "Redirect URI mismatch"

**Problem:** The redirect URI in Google Cloud doesn't match Supabase's callback URL.

**Solution:**
- Ensure redirect URI is exactly: `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
- No trailing slashes
- Wait 5 minutes for Google's changes to propagate

### Error: "Unauthorized client"

**Problem:** Client ID/Secret mismatch between Google Cloud and Supabase.

**Solution:**
- Verify you copied the correct Client ID and Secret
- Check for extra spaces when pasting
- Try regenerating credentials in Google Cloud

### Authentication works but app shows errors

**Problem:** Environment variables not set correctly in Vercel.

**Solution:**
- Run: `vercel env ls`
- Verify all 9 variables are set for production
- Redeploy: `vercel --prod`

---

## What's Already Done

✅ **Vercel Environment Variables Configured:**
- All 9 variables set for Production, Preview, and Development
- Auth URLs point to beton-auth (uezyvflphqcizcbfklla)
- Data URLs point to beton-trolley (nuxwbqovsllgceswaxgf)

✅ **Supabase Projects Renamed:**
- beton-production → beton-auth ✓
- webflow-cms-image-generator → beton-facade ✓

✅ **Code Implementation:**
- Dual-client architecture implemented
- Middleware configured for cross-subdomain auth
- Build passes successfully

---

## Next Steps

1. Complete Step 3: Create OAuth credentials in Google Cloud Console
2. Complete Step 4: Add credentials to Supabase beton-auth project
3. Complete Step 5: Configure redirect URLs in Supabase
4. Deploy: `vercel --prod`
5. Test authentication flow
6. Verify users can sign in with Google

---

## Support Links

- **Google Cloud Console**: https://console.cloud.google.com
- **Supabase beton-auth**: https://supabase.com/dashboard/project/uezyvflphqcizcbfklla
- **Vercel Project**: https://vercel.com/nadyyyms-projects/beton-trolley
- **OAuth Guide**: [AUTHENTICATION_SETUP_GUIDE.md](./AUTHENTICATION_SETUP_GUIDE.md)

---

**Pro Tip:** Use the same Google Cloud project for all Beton apps. Just add additional authorized origins and redirect URIs for each subdomain (enrichment.getbeton.ai, facade.getbeton.ai, etc.).

---

Made with ❤️ by the Beton team
