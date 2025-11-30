# Final DNS Fix - Simple Instructions

## Status

✅ **auth.getbeton.ai is configured in Vercel**
✅ **Code is correct** (vercel.json includes both domains)
❌ **DNS points to wrong location** (Supabase instead of Vercel)

---

## What Vercel Says

```
WARN! This Domain is not configured properly.
Set the following record on your DNS provider:
  A auth.getbeton.ai 76.76.21.21
```

---

## Fix in Cloudflare (Choose ONE option)

### Option A: Use A Record (Recommended by Vercel)

1. Go to: https://dash.cloudflare.com
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Find the `auth` **CNAME** record
5. **Delete** it
6. Click **Add record**
7. Configure:
   ```
   Type: A
   Name: auth
   IPv4 address: 76.76.21.21
   Proxy status: Proxied (orange cloud ON)
   TTL: Auto
   ```
8. Click **Save**

### Option B: Use CNAME (Alternative)

1. Go to: https://dash.cloudflare.com
2. Select domain: **getbeton.ai**
3. Go to **DNS** → **Records**
4. Find the `auth` CNAME record
5. **Edit** it:
   ```
   Type: CNAME
   Name: auth
   Target: cname.vercel-dns.com
   Proxy status: Proxied (orange cloud ON)
   TTL: Auto
   ```
6. Click **Save**

---

## Verification (After DNS Update)

Wait 2-5 minutes for DNS propagation, then test:

```bash
# Check DNS resolves to Vercel
curl -I https://auth.getbeton.ai/

# Should return Next.js page (not 404 from Supabase)
curl https://auth.getbeton.ai/signin

# Test OAuth flow in browser
open https://trolley.getbeton.ai
```

---

## Expected Result

After DNS is updated:

1. **https://auth.getbeton.ai/signin** → Shows Next.js signin page ✅
2. **https://trolley.getbeton.ai** → Redirects to auth.getbeton.ai ✅
3. **OAuth flow** → Google → Supabase → Back to app ✅
4. **tRPC endpoints** → Return 200 (not 500) ✅

---

## Why This Fix is Needed

**Before (WRONG):**
```
auth.getbeton.ai → Supabase (uezyvflphqcizcbfklla.supabase.co)
/signin route → 404 (Supabase doesn't have this route)
```

**After (CORRECT):**
```
auth.getbeton.ai → Vercel (76.76.21.21)
/signin route → Next.js page ✅
OAuth callbacks → Next.js /auth/callback route ✅
```

---

## Architecture Summary

Both domains serve the **same Next.js app** from Vercel:

- **trolley.getbeton.ai** → Vercel (main app)
- **auth.getbeton.ai** → Vercel (centralized signin)

The middleware detects which domain you're on and adjusts behavior:
- Unauthenticated users → Redirected to auth.getbeton.ai/signin
- After OAuth → Redirected back to original domain
- Cookies shared across .getbeton.ai domains

Supabase uses its **default domain** for OAuth processing:
- OAuth callbacks go through: `uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
- Then Supabase redirects to: `auth.getbeton.ai/auth/callback` (Next.js route)

---

**Everything is ready! Just need the DNS change in Cloudflare.**
