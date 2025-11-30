# Quick Fix Checklist - OAuth Issues

**Estimated time: 15 minutes**

---

## 🔴 Issue Summary

- ❌ Google OAuth error: `redirect_uri_mismatch`
- ❌ `trolley.getbeton.ai` not accessible (DNS)
- ❌ Supabase Site URL points to wrong domain
- ✅ `auth.getbeton.ai` already configured

---

## ✅ Fix Steps (Do in Order)

### 1️⃣ Add DNS for trolley.getbeton.ai (2 min)

**Go to:** [Cloudflare DNS](https://dash.cloudflare.com)

**Add this record:**
```
Type: A
Name: trolley
Value: 76.76.21.21
Proxy: ON (orange cloud)
```

**Verify:**
```bash
dig trolley.getbeton.ai
```

---

### 2️⃣ Fix Supabase Site URL (2 min)

**Go to:** [Supabase beton-auth → URL Configuration](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla/auth/url-configuration)

**Set Site URL to:**
```
https://trolley.getbeton.ai
```

**Set Redirect URLs to:**
```
https://trolley.getbeton.ai/auth/callback
https://beton-trolley-gof7r7gq1-getbeton.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Click **Save**

---

### 3️⃣ Update Google OAuth (5 min)

**Go to:** [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

**Click your OAuth 2.0 Client ID → Edit**

**Authorized JavaScript origins (add these 4):**
```
https://auth.getbeton.ai
https://uezyvflphqcizcbfklla.supabase.co
https://trolley.getbeton.ai
https://beton-trolley-gof7r7gq1-getbeton.vercel.app
```

**Authorized redirect URIs (add these 2):**
```
https://auth.getbeton.ai/auth/v1/callback
https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

Click **Save** → Wait 5 minutes for Google to propagate changes

---

### 4️⃣ For Local Development (optional, 1 min)

In the same Google OAuth client, also add:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Note:** The redirect URI `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` already works for localhost!

---

## 🧪 Test It Works

### After DNS propagates (5-10 min):

1. Visit: https://trolley.getbeton.ai
2. Click "Sign in with Google"
3. Should show Google OAuth screen
4. Authorize
5. Should redirect back and log you in

### Test Locally:

1. `npm run dev`
2. Visit: http://localhost:3000
3. Click "Sign in with Google"
4. Should work with same OAuth

---

## 📸 What It Should Look Like

### Google Cloud Console - Authorized Origins:
```
✓ https://auth.getbeton.ai
✓ https://uezyvflphqcizcbfklla.supabase.co
✓ https://trolley.getbeton.ai
✓ https://beton-trolley-gof7r7gq1-getbeton.vercel.app
✓ http://localhost:3000
```

### Google Cloud Console - Redirect URIs:
```
✓ https://auth.getbeton.ai/auth/v1/callback
✓ https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback
```

### Supabase - Site URL:
```
https://trolley.getbeton.ai
```

### Supabase - Redirect URLs:
```
✓ https://trolley.getbeton.ai/auth/callback
✓ https://beton-trolley-gof7r7gq1-getbeton.vercel.app/auth/callback
✓ http://localhost:3000/auth/callback
```

---

## ❓ Why Do I Need Both Redirect URIs?

You need BOTH in Google Cloud Console:
- `https://auth.getbeton.ai/auth/v1/callback` (your custom domain)
- `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback` (Supabase domain)

Because Supabase uses the custom domain when available, but falls back to the Supabase domain in some cases.

---

## 🎯 One Google OAuth Client = All Environments

You don't need separate OAuth clients for test/prod!

**One client can handle:**
- ✅ Production (trolley.getbeton.ai)
- ✅ Vercel previews (*.vercel.app)
- ✅ Local development (localhost:3000)

Just add all the origins and redirect URIs to the SAME OAuth client.

---

## 🆘 Still Not Working?

### If redirect_uri_mismatch persists:
1. Wait 5 minutes after saving Google OAuth changes
2. Try in incognito mode
3. Check you saved ALL the redirect URIs (both auth.getbeton.ai and uezyvflphqcizcbfklla)

### If trolley.getbeton.ai doesn't load:
1. Check DNS: `dig trolley.getbeton.ai`
2. Wait 5-10 minutes for propagation
3. Try from mobile network (different DNS)

### If OAuth works but redirects to wrong URL:
1. Check Supabase Site URL is `https://trolley.getbeton.ai`
2. Clear browser cookies
3. Redeploy Vercel app

---

**Full Details:** See [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md)
