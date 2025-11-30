# Google OAuth Setup Verification Checklist

Use this checklist to verify your Google OAuth configuration is correct.

**Date:** November 30, 2025

---

## ✅ Part 1: Google Cloud Console

Go to: [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

### Check OAuth 2.0 Client

Find your OAuth 2.0 Client and verify:

#### Authorized JavaScript Origins
You should have these domains:

```
✓ https://uezyvflphqcizcbfklla.supabase.co
✓ https://app.getbeton.ai
✓ Optional: https://auth.getbeton.ai (if using custom domain)
✓ Optional: https://enrichment.getbeton.ai (for future)
✓ Optional: https://facade.getbeton.ai (for future)
```

**What to check:**
- [ ] All domains use `https://` (not http)
- [ ] No trailing slashes (e.g., NOT `https://app.getbeton.ai/`)
- [ ] Supabase URL is included

#### Authorized Redirect URIs
You must have EXACTLY ONE of these:

**Option A (Using Supabase URL):**
```
✓ https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

**Option B (Using Custom Domain):**
```
✓ https://auth.getbeton.ai/auth/v1/callback
```

**What to check:**
- [ ] Redirect URI ends with `/auth/v1/callback`
- [ ] Uses `https://` (not http)
- [ ] No trailing slash after `callback`
- [ ] Matches EXACTLY what's in Supabase

#### Get Your Credentials
- [ ] Copy **Client ID** (starts with something like `123456789-abc...apps.googleusercontent.com`)
- [ ] Copy **Client Secret** (looks like `GOCSPX-...`)

---

## ✅ Part 2: Supabase beton-auth Project

Go to: [Supabase beton-auth Dashboard](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)

### Check Authentication → Providers

Navigate to: **Authentication** → **Providers** → **Google**

**What to check:**
- [ ] Google provider is **Enabled** (toggle is ON)
- [ ] **Client ID** matches the one from Google Cloud Console
- [ ] **Client Secret** matches the one from Google Cloud Console
- [ ] No extra spaces in Client ID or Secret
- [ ] Click **Save** after entering credentials

### Check Authentication → URL Configuration

Navigate to: **Authentication** → **URL Configuration**

#### Site URL
Should be set to your main app:
```
✓ https://app.getbeton.ai
```

#### Redirect URLs
Should include all your app callback URLs:
```
✓ https://app.getbeton.ai/auth/callback
✓ http://localhost:3000/auth/callback (for development)
✓ Optional: https://enrichment.getbeton.ai/auth/callback
✓ Optional: https://facade.getbeton.ai/auth/callback
```

**What to check:**
- [ ] All redirect URLs end with `/auth/callback`
- [ ] Production URLs use `https://`
- [ ] Local development URL (`localhost:3000`) is included
- [ ] Click **Save**

---

## ✅ Part 3: Vercel Environment Variables

Run this command to verify:
```bash
vercel env ls
```

**What to check:**
You should see these variables for **Production**:

```
✓ NEXT_PUBLIC_SUPABASE_AUTH_URL
✓ NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY
✓ SUPABASE_AUTH_SERVICE_ROLE_KEY
✓ NEXT_PUBLIC_SUPABASE_DATA_URL
✓ NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY
✓ SUPABASE_DATA_SERVICE_ROLE_KEY
✓ NEXT_PUBLIC_SUPABASE_URL (legacy)
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
✓ SUPABASE_SERVICE_ROLE_KEY (legacy)
```

All 9 variables should show as "Encrypted" for Production environment.

---

## ✅ Part 4: Common Issues to Check

### Issue 1: Redirect URI Mismatch

**Symptoms:** Error message: "redirect_uri_mismatch" when clicking "Sign in with Google"

**Check:**
1. In Google Cloud Console, copy your exact redirect URI
2. In Supabase, go to Authentication → Providers → Google
3. Scroll down to see "Callback URL (for OAuth)"
4. These MUST match EXACTLY

**Should be:**
```
Google Cloud:   https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
Supabase shows: https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

### Issue 2: Client ID/Secret Mismatch

**Symptoms:** Authentication fails silently or shows "Invalid client"

**Check:**
1. Copy Client ID from Google Cloud Console again
2. Paste in Notepad/TextEdit first (to check for extra spaces)
3. Copy from Notepad to Supabase
4. Repeat for Client Secret
5. Click **Save** in Supabase

### Issue 3: Provider Not Enabled

**Symptoms:** Google sign-in button doesn't work

**Check:**
1. In Supabase → Authentication → Providers
2. Find Google in the list
3. Toggle should be **ON** (blue/green)
4. If it's OFF (gray), click to enable
5. Click **Save**

### Issue 4: Wrong Supabase Project

**Symptoms:** Environment variables point to wrong project

**Check:**
```bash
# Should show beton-auth URL
echo $NEXT_PUBLIC_SUPABASE_AUTH_URL
# Output should be: https://uezyvflphqcizcbfklla.supabase.co
```

---

## ✅ Part 5: Test the Setup

### Quick Test (Without Deploying)

1. Go to [Supabase beton-auth](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
2. Navigate to **Authentication** → **Users**
3. Click **Invite user**
4. Try the "Sign in with Google" button in the Supabase UI
5. If it works here, your Google OAuth is configured correctly

### Full Test (After Deployment)

1. Deploy your app: `vercel --prod`
2. Visit your production URL: `https://your-app.vercel.app`
3. You should be redirected to `/auth/signin`
4. Click "Continue with Google"
5. Google's OAuth screen should appear
6. After authorizing, you should be redirected back to your app
7. You should be logged in

---

## ✅ Verification Summary

Use this quick checklist:

**Google Cloud Console:**
- [ ] OAuth Client ID exists
- [ ] Authorized JavaScript origins include Supabase URL
- [ ] Authorized JavaScript origins include app.getbeton.ai
- [ ] Redirect URI is exactly: `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
- [ ] Client ID and Secret copied

**Supabase beton-auth:**
- [ ] Google provider is enabled
- [ ] Client ID is pasted correctly
- [ ] Client Secret is pasted correctly
- [ ] Site URL is set to https://app.getbeton.ai
- [ ] Redirect URLs include app callback URL
- [ ] All changes are saved

**Vercel:**
- [ ] All 9 environment variables are set for Production
- [ ] Environment variables include both AUTH and DATA URLs
- [ ] Legacy variables are also set for backward compatibility

**Testing:**
- [ ] Can sign in with Google in Supabase UI
- [ ] App builds successfully
- [ ] App deploys to Vercel
- [ ] Can sign in with Google in production app

---

## 🆘 If Something Doesn't Match

### Fix Google Cloud:
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Click **Edit**
4. Update Authorized origins and Redirect URIs
5. Click **Save**
6. Wait 5 minutes for changes to propagate

### Fix Supabase:
1. Go to [Supabase beton-auth](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
2. Go to **Authentication** → **Providers**
3. Update Google provider settings
4. Click **Save**

### Fix Vercel:
```bash
# List current variables
vercel env ls

# Remove wrong variable (if needed)
vercel env rm VARIABLE_NAME production

# Add correct variable
echo "correct-value" | vercel env add VARIABLE_NAME production
```

---

## 📞 Quick Reference

**Your Project Details:**

| What | Value |
|------|-------|
| Auth Project | beton-auth |
| Auth URL | https://uezyvflphqcizcbfklla.supabase.co |
| Data Project | beton-trolley |
| Data URL | https://nuxwbqovsllgceswaxgf.supabase.co |
| Main App | app.getbeton.ai |
| OAuth Callback | https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback |

**Quick Links:**
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Supabase beton-auth](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
- [Vercel Project](https://vercel.com/nadyyyms-projects/beton-trolley)

---

**Need Help?** Go through each checkbox above. If any item is not checked, that's what you need to fix!
