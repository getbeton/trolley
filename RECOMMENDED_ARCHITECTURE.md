# Recommended Multi-App Authentication Architecture

**TL;DR:** Use your existing dual-client architecture with ONE Site URL and MULTIPLE Redirect URLs. No need for a separate auth hub service.

---

## The Simple Solution (Recommended)

### Supabase Configuration

**Site URL:** Pick ONE app as the default
```
https://trolley.getbeton.ai
```

**Redirect URLs:** Add ALL your apps
```
https://trolley.getbeton.ai/auth/callback
https://enrichment.getbeton.ai/auth/callback
https://facade.getbeton.ai/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback (enrichment dev)
http://localhost:3002/auth/callback (facade dev)
```

**Why this works:**
- Site URL = Default fallback (only ONE allowed)
- Redirect URLs = Whitelist of allowed destinations (unlimited)
- Each app specifies its own redirect URL in the OAuth flow

---

## How Each App Authenticates

### The Pattern

Each app uses the **SAME authentication code** but redirects to itself:

```typescript
// THIS EXACT CODE WORKS IN ALL APPS (trolley, enrichment, facade)
const handleGoogleSignIn = async () => {
  const supabaseAuth = createAuthClient() // Points to beton-auth

  const { error } = await supabaseAuth.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Key: Use current app's URL dynamically
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

### What Happens

1. User visits **trolley.getbeton.ai** → Clicks "Sign in"
2. Code uses `window.location.origin` = `https://trolley.getbeton.ai`
3. OAuth redirects to: `https://trolley.getbeton.ai/auth/callback`
4. User is now logged in on **trolley**

Same code in **enrichment.getbeton.ai**:
1. User clicks "Sign in"
2. Code uses `window.location.origin` = `https://enrichment.getbeton.ai`
3. OAuth redirects to: `https://enrichment.getbeton.ai/auth/callback`
4. User is now logged in on **enrichment**

**No central auth hub needed!** Each app handles its own OAuth but shares the session.

---

## Using auth.getbeton.ai

You already have `auth.getbeton.ai` as a CNAME to Supabase. Here's how to use it:

### In Supabase

**Enable Custom Domain:**
1. Go to [Supabase beton-auth](https://supabase.com/dashboard/project/uezyvflphqcizcbfklla)
2. Navigate to **Settings** → **Custom Domains**
3. Add: `auth.getbeton.ai`
4. Verify the CNAME record (already done)

**Effect:**
- OAuth flows use `https://auth.getbeton.ai/auth/v1/callback` instead of `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`
- Better branding - users see your domain

### In Google OAuth

**Authorized Redirect URI:**
```
https://auth.getbeton.ai/auth/v1/callback
```

(Instead of `https://uezyvflphqcizcbfklla.supabase.co/auth/v1/callback`)

**Note:** This is the Supabase OAuth callback, NOT your app callback. Your app callbacks remain:
```
https://trolley.getbeton.ai/auth/callback
https://enrichment.getbeton.ai/auth/callback
etc.
```

---

## Complete Configuration

### 1. Supabase beton-auth

```
Authentication → URL Configuration:

Site URL:
└─ https://trolley.getbeton.ai

Redirect URLs:
├─ https://trolley.getbeton.ai/auth/callback
├─ https://enrichment.getbeton.ai/auth/callback
├─ https://facade.getbeton.ai/auth/callback
└─ http://localhost:3000/auth/callback

Custom Domain:
└─ auth.getbeton.ai
```

### 2. Google Cloud Console

```
OAuth 2.0 Client:

Authorized JavaScript Origins:
├─ https://auth.getbeton.ai (Supabase custom domain)
├─ https://trolley.getbeton.ai
├─ https://enrichment.getbeton.ai
├─ https://facade.getbeton.ai
└─ http://localhost:3000

Authorized Redirect URIs:
└─ https://auth.getbeton.ai/auth/v1/callback (ONLY THIS ONE)
```

### 3. DNS (Cloudflare)

```
A Records:
├─ trolley → 76.76.21.21 (Vercel)
├─ enrichment → 76.76.21.21 (Vercel)
└─ facade → 76.76.21.21 (Vercel)

CNAME Records:
└─ auth → uezyvflphqcizcbfklla.supabase.co (already done)
```

---

## Shared Session via Cookies

The magic that makes SSO work:

```typescript
// src/middleware.ts (SAME IN ALL APPS)
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!,
  {
    cookies: {
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieOptions = {
            ...options,
            // KEY: Set cookie domain to parent domain
            domain: process.env.NODE_ENV === "production" ? ".getbeton.ai" : undefined,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
          }
          response.cookies.set(name, value, cookieOptions)
        })
      },
    },
  }
)
```

**Effect:**
- Cookie domain is `.getbeton.ai` (note the leading dot)
- Cookie is shared across ALL subdomains:
  - ✅ trolley.getbeton.ai
  - ✅ enrichment.getbeton.ai
  - ✅ facade.getbeton.ai
- User signs in once → Logged in everywhere

---

## Environment Variables

### Shared (Auth) - SAME for all apps

```bash
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://uezyvflphqcizcbfklla.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=eyJ...same-for-all-apps...
SUPABASE_AUTH_SERVICE_ROLE_KEY=eyJ...same-for-all-apps...
```

### App-Specific (Data) - DIFFERENT for each app

**trolley.getbeton.ai:**
```bash
NEXT_PUBLIC_SUPABASE_DATA_URL=https://nuxwbqovsllgceswaxgf.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJ...trolley-specific...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJ...trolley-specific...
```

**enrichment.getbeton.ai:**
```bash
NEXT_PUBLIC_SUPABASE_DATA_URL=https://guawqykkwnovcygeehpk.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJ...enrichment-specific...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJ...enrichment-specific...
```

**facade.getbeton.ai:**
```bash
NEXT_PUBLIC_SUPABASE_DATA_URL=https://sthidehegwyiwoishltl.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJ...facade-specific...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJ...facade-specific...
```

---

## User Flow Example

### Scenario: User signs in on Trolley, then visits Enrichment

1. **Visit trolley.getbeton.ai**
   - No session → Shows sign-in page
   - User clicks "Sign in with Google"

2. **OAuth Flow**
   - Redirected to: `https://auth.getbeton.ai/auth/v1/authorize?...`
   - Google OAuth screen appears
   - User authorizes
   - Redirected to: `https://auth.getbeton.ai/auth/v1/callback?code=...`
   - Supabase exchanges code for session
   - Cookie set on domain `.getbeton.ai`
   - Redirected to: `https://trolley.getbeton.ai/auth/callback`

3. **User is logged in on Trolley**
   - Can access trolley features
   - Data stored in beton-trolley database

4. **User visits enrichment.getbeton.ai**
   - Cookie exists on `.getbeton.ai` domain
   - Middleware reads cookie → Session exists
   - **User is automatically logged in!** (SSO)
   - Data queries go to beton-enrichment database

5. **User visits facade.getbeton.ai**
   - Same cookie, same session
   - **User is automatically logged in!** (SSO)
   - Data queries go to beton-facade database

**One sign-in, three apps authenticated!**

---

## Why NOT Build a Separate Auth Hub?

You don't need a centralized auth service (`auth.getbeton.ai/login`) because:

1. ✅ **Supabase handles the OAuth flow** - That's what `auth.getbeton.ai` (Supabase custom domain) does
2. ✅ **Shared cookies provide SSO** - Cookie domain `.getbeton.ai` shares session
3. ✅ **Each app redirects to itself** - Using `redirectTo` parameter
4. ✅ **Less code to maintain** - No separate auth app
5. ✅ **Fewer redirects** - User doesn't leave the app

**Auth hub is only needed if:**
- You want a completely custom OAuth flow
- You need auth UI customization beyond Supabase's capabilities
- You want users to see a dedicated login page

**For most cases (including yours), Supabase + custom domain + shared cookies is sufficient.**

---

## Implementation Checklist

### Immediate Actions (15 minutes)

1. **Add DNS for trolley.getbeton.ai**
   ```
   Cloudflare → Add A record → trolley → 76.76.21.21
   ```

2. **Configure Supabase Custom Domain**
   ```
   Supabase → Settings → Custom Domains → Add auth.getbeton.ai
   ```

3. **Update Supabase Site URL**
   ```
   Supabase → Authentication → URL Configuration
   Site URL: https://trolley.getbeton.ai
   ```

4. **Add Redirect URLs**
   ```
   Supabase → Authentication → URL Configuration
   Redirect URLs:
   - https://trolley.getbeton.ai/auth/callback
   - https://enrichment.getbeton.ai/auth/callback
   - https://facade.getbeton.ai/auth/callback
   - http://localhost:3000/auth/callback
   ```

5. **Update Google OAuth**
   ```
   Google Cloud Console → Credentials → Edit OAuth Client

   Authorized JavaScript Origins:
   - https://auth.getbeton.ai
   - https://trolley.getbeton.ai
   - https://enrichment.getbeton.ai
   - https://facade.getbeton.ai

   Authorized Redirect URIs:
   - https://auth.getbeton.ai/auth/v1/callback
   ```

6. **Test**
   - Visit https://trolley.getbeton.ai
   - Sign in with Google
   - Should work!

### Future Actions (when building new apps)

For each new app (enrichment, facade):

1. **Set up Vercel project**
2. **Configure environment variables** (9 variables: 3 auth, 3 data, 3 legacy)
3. **Add redirect URL to Supabase** (`https://newapp.getbeton.ai/auth/callback`)
4. **Add authorized origin to Google** (`https://newapp.getbeton.ai`)
5. **Add DNS record in Cloudflare** (`newapp → 76.76.21.21`)
6. **Deploy** - SSO should work immediately!

---

## Summary

| Question | Answer |
|----------|--------|
| How many Site URLs in Supabase? | ONE (trolley.getbeton.ai) |
| How many Redirect URLs? | Unlimited (all your apps) |
| Do I need a central auth service? | NO - Supabase handles it |
| What is auth.getbeton.ai? | Supabase custom domain for OAuth |
| How does SSO work? | Cookie domain `.getbeton.ai` |
| Do apps share data? | NO - separate data projects |
| Do apps share auth? | YES - same beton-auth project |
| One Google OAuth client? | YES - works for all apps |

---

**This architecture is already implemented in your project!** You just need to:
1. Add DNS for trolley.getbeton.ai
2. Configure Supabase custom domain (auth.getbeton.ai)
3. Update Google OAuth to include auth.getbeton.ai
4. Test the flow

No code changes needed. 🎉

---

For detailed options comparison, see [MULTI_APP_AUTH_OPTIONS.md](./MULTI_APP_AUTH_OPTIONS.md)
