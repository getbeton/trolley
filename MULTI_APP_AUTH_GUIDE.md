# Multi-App Architecture: Shared Auth with Separate Databases

A guide for setting up multiple apps on different subdomains that share authentication but use separate PostgreSQL databases in Supabase.

**Architecture Overview:**
```
Auth Supabase Project (auth.getbeton.ai)
├── Handles all authentication (Google, GitHub, etc.)
├── Stores user profiles, sessions
└── Shared across all apps

App 1: app.getbeton.ai
├── Uses Auth Supabase for login
└── Uses Data Supabase Project 1 for app-specific data

App 2: dashboard.getbeton.ai
├── Uses Auth Supabase for login
└── Uses Data Supabase Project 2 for app-specific data

App 3: analytics.getbeton.ai
├── Uses Auth Supabase for login
└── Uses Data Supabase Project 3 for app-specific data
```

---

## Why This Architecture?

**Benefits:**
- ✅ **Single Sign-On (SSO)**: Users log in once, access all apps
- ✅ **Data Isolation**: Each app's data is completely separate
- ✅ **Scalability**: Scale each app's database independently
- ✅ **Security**: One app's data breach doesn't affect others
- ✅ **Cost Control**: Pay only for the data each app uses

**Use Cases:**
- Multiple products under one brand
- SaaS platform with different customer-facing apps
- Admin panel + customer portal + analytics dashboard
- White-label apps with shared user base

---

## Part 1: Project Setup

### Step 1: Create Supabase Projects

You'll need multiple Supabase projects:

1. **Auth Project** (e.g., "Beton Auth")
   - Purpose: Handles authentication only
   - Domain: `auth.getbeton.ai` (optional custom domain)
   - URL: `https://beton-auth.supabase.co`

2. **Data Project 1** (e.g., "Beton Trolley Data")
   - Purpose: CRM migration tool data
   - Domain: `app.getbeton.ai`
   - URL: `https://beton-trolley.supabase.co`

3. **Data Project 2** (e.g., "Beton Analytics Data")
   - Purpose: Analytics dashboard data
   - Domain: `analytics.getbeton.ai`
   - URL: `https://beton-analytics.supabase.co`

**Create each project:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Name it clearly (e.g., "Beton Auth", "Beton Trolley Data")
4. Choose region (use same region for all projects for best performance)
5. Set a strong database password
6. Click **Create project**

### Step 2: Collect All Credentials

For each Supabase project, collect these credentials:

**Auth Project:**
```
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://beton-auth.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=eyJhbG...
SUPABASE_AUTH_SERVICE_ROLE_KEY=eyJhbG...
```

**Data Project (for each app):**
```
NEXT_PUBLIC_SUPABASE_DATA_URL=https://beton-trolley.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJhbG...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJhbG...
```

---

## Part 2: Configure Google OAuth

### Step 3: Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your OAuth 2.0 Client ID (or create new)

### Step 4: Add All Subdomains

**Important:** Google OAuth works with your **Auth Supabase project** only, but you need to authorize ALL subdomains.

**Authorized JavaScript origins:**
```
https://beton-auth.supabase.co
https://app.getbeton.ai
https://dashboard.getbeton.ai
https://analytics.getbeton.ai
```

**Authorized redirect URIs:**
```
https://beton-auth.supabase.co/auth/v1/callback
```

**Note:** Only ONE redirect URI needed - your auth project's callback URL.

---

## Part 3: Configure Supabase Auth Project

### Step 5: Enable Authentication Providers

In your **Auth Supabase Project** (beton-auth):

1. Go to **Authentication** → **Providers**
2. Enable **Google**:
   - Client ID: [from Google Cloud]
   - Client Secret: [from Google Cloud]
3. Enable any other providers (GitHub, etc.)

### Step 6: Configure Redirect URLs

In your **Auth Supabase Project**:

1. Go to **Authentication** → **URL Configuration**
2. Add all your app domains to **Redirect URLs**:
   ```
   https://app.getbeton.ai/auth/callback
   https://dashboard.getbeton.ai/auth/callback
   https://analytics.getbeton.ai/auth/callback
   http://localhost:3000/auth/callback
   ```

3. Set **Site URL** to your main app:
   ```
   https://app.getbeton.ai
   ```

---

## Part 4: Code Implementation

### Step 7: Create Dual Supabase Clients

You need TWO Supabase clients in each app:
1. **Auth Client**: Connects to auth project
2. **Data Client**: Connects to app's data project

**Create: `src/lib/supabase/auth-client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'

// Auth client - shared across all apps
export const createAuthClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!
  )
}
```

**Create: `src/lib/supabase/data-client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'

// Data client - specific to this app
export const createDataClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY!
  )
}
```

**Server versions: `src/lib/supabase/auth-server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createAuthServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Server versions: `src/lib/supabase/data-server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createDataServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### Step 8: Update Authentication Pages

**Update: `src/app/auth/signin/page.tsx`**
```typescript
"use client"

import { createAuthClient } from "../../../lib/supabase/auth-client"
import { Button } from "../../../components/ui/button"

export default function SignInPage() {
  const supabaseAuth = createAuthClient()

  const handleGoogleSignIn = async () => {
    const { error } = await supabaseAuth.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) console.error(error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Button onClick={handleGoogleSignIn}>
        Continue with Google
      </Button>
    </div>
  )
}
```

**Update: `src/app/auth/callback/route.ts`**
```typescript
import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirect = requestUrl.searchParams.get("redirect") || "/"

  if (code) {
    const supabaseAuth = await createAuthServerClient()
    await supabaseAuth.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirect}`)
}
```

### Step 9: Update Middleware for Cross-Subdomain Auth

**Update: `src/middleware.ts`**
```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Create auth client (not data client!)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // IMPORTANT: Set cookie domain to parent domain for cross-subdomain sharing
            const cookieOptions = {
              ...options,
              domain: '.getbeton.ai', // Share cookies across all *.getbeton.ai
              secure: true,
              sameSite: 'lax' as const,
            }
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Check authentication
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  // Public paths
  const publicPaths = ["/auth"]
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to sign in if not authenticated
  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/auth/signin", request.url)
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

### Step 10: Using Both Clients in Your App

**Example: Fetch user profile from auth, app data from data project**

```typescript
import { createAuthServerClient } from "@/lib/supabase/auth-server"
import { createDataServerClient } from "@/lib/supabase/data-server"

export default async function DashboardPage() {
  // Get user from auth project
  const supabaseAuth = await createAuthServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get app-specific data from data project
  const supabaseData = await createDataServerClient()
  const { data: migrations } = await supabaseData
    .from("Migration")
    .select("*")
    .eq("userId", user.id)

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Your migrations: {migrations?.length}</p>
    </div>
  )
}
```

---

## Part 5: Environment Variables

### Step 11: Configure Environment Variables

**For App 1 (app.getbeton.ai) - Vercel Settings:**

```bash
# Auth Supabase (shared)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://beton-auth.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=eyJhbG...
SUPABASE_AUTH_SERVICE_ROLE_KEY=eyJhbG...

# Data Supabase (app-specific)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://beton-trolley.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJhbG...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJhbG...
```

**For App 2 (dashboard.getbeton.ai) - Vercel Settings:**

```bash
# Auth Supabase (shared - SAME as App 1)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://beton-auth.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=eyJhbG...
SUPABASE_AUTH_SERVICE_ROLE_KEY=eyJhbG...

# Data Supabase (app-specific - DIFFERENT from App 1)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://beton-dashboard.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=eyJhbG...
SUPABASE_DATA_SERVICE_ROLE_KEY=eyJhbG...
```

---

## Part 6: Database Setup

### Step 12: Sync User Records

**Important:** When a user signs in, you need to sync their user record from the auth project to each app's data project.

**Create: `src/server/auth/sync-user.ts`**

```typescript
import { createAuthServerClient } from "@/lib/supabase/auth-server"
import { createDataServerClient } from "@/lib/supabase/data-server"

export async function syncUserToDataProject(userId: string) {
  // Get user from auth project
  const authClient = await createAuthServerClient()
  const { data: authUser, error: authError } = await authClient.auth.getUser()

  if (authError || !authUser) {
    throw new Error("Failed to get user from auth project")
  }

  // Upsert user in data project
  const dataClient = await createDataServerClient()
  const { error: dataError } = await dataClient
    .from("User")
    .upsert({
      id: authUser.user.id,
      email: authUser.user.email,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'id'
    })

  if (dataError) {
    throw new Error("Failed to sync user to data project")
  }
}
```

**Call this after successful authentication:**

```typescript
// In your auth callback or middleware
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabaseAuth = await createAuthServerClient()
    const { data } = await supabaseAuth.auth.exchangeCodeForSession(code)

    // Sync user to this app's data project
    if (data.user) {
      await syncUserToDataProject(data.user.id)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/`)
}
```

### Step 13: Database Schema Considerations

**Auth Project Database:**
- Keep only authentication-related data
- Supabase manages most tables automatically
- You can add custom profile fields in `public.users` table

**Data Project Databases (each app):**
- Each app has its own schema
- All tables use `userId` foreign key referencing auth project
- Example schema for CRM app:

```sql
-- User table (synced from auth project)
CREATE TABLE "User" (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- App-specific tables
CREATE TABLE "Migration" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "User"(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

---

## Part 7: Vercel Deployment

### Step 14: Deploy Each App

**App 1 (app.getbeton.ai):**
```bash
# Set environment variables in Vercel dashboard
vercel --prod

# Add custom domain
vercel domains add app.getbeton.ai
```

**App 2 (dashboard.getbeton.ai):**
```bash
# Different repo or monorepo path
vercel --prod

# Add custom domain
vercel domains add dashboard.getbeton.ai
```

### Step 15: Configure Custom Domains in Vercel

For each app:
1. Go to Vercel → Project → **Settings** → **Domains**
2. Add your subdomain (e.g., `app.getbeton.ai`)
3. Configure DNS (CNAME record pointing to Vercel)
4. Wait for SSL certificate to provision

**DNS Configuration (in your domain provider):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com

Type: CNAME
Name: dashboard
Value: cname.vercel-dns.com

Type: CNAME
Name: analytics
Value: cname.vercel-dns.com
```

---

## Part 8: Testing

### Step 16: Test Single Sign-On

1. **Open App 1** (`https://app.getbeton.ai`)
   - You're not authenticated → redirected to `/auth/signin`
   - Click "Continue with Google"
   - Complete OAuth flow
   - Redirected back to App 1, now authenticated

2. **Open App 2** (`https://dashboard.getbeton.ai`) in same browser
   - You should be **automatically authenticated**
   - No need to sign in again
   - This is SSO working!

3. **Verify data isolation**
   - Create data in App 1 (e.g., a migration)
   - Check App 2 database - migration shouldn't appear there
   - Data is isolated ✅

4. **Test logout**
   - Log out from App 1
   - Refresh App 2 - you should be logged out there too
   - Shared auth session works both ways ✅

---

## Security Considerations

### Step 17: Implement Row-Level Security (RLS)

**In EACH data project**, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE "Migration" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own migrations"
ON "Migration"
FOR SELECT
TO authenticated
USING (auth.uid() = "userId");

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own migrations"
ON "Migration"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "userId");
```

**Important:** Even though auth is shared, each app's data project needs its own RLS policies.

### Step 18: Secure Service Role Keys

- Store `SUPABASE_AUTH_SERVICE_ROLE_KEY` only in secure backend
- Never expose service role keys in browser
- Use anon keys for client-side code
- Rotate keys periodically

---

## Advanced: Cross-App Data Sharing (Optional)

If you need apps to share some data:

### Option 1: Shared Tables in Auth Project
- Store shared data in auth project database
- All apps can query this data
- Good for: user preferences, feature flags, billing info

### Option 2: API Layer
- Create a separate API service
- Apps call API to get shared data
- Good for: complex business logic, aggregated data

### Option 3: Database Replication
- Use Supabase's Postgres replication features
- Replicate specific tables across projects
- Good for: read-heavy shared data

---

## Troubleshooting

### "Session not found" errors
**Problem:** Cookie not being shared across subdomains

**Solution:**
- Verify `domain: '.getbeton.ai'` in middleware cookie options
- Check that all subdomains use HTTPS
- Clear browser cookies and test again

### "User not found in database"
**Problem:** User exists in auth project but not in app's data project

**Solution:**
- Implement user sync function (Step 12)
- Run sync after first successful login
- Add database trigger or cron job for ongoing sync

### "Unauthorized" errors when querying data
**Problem:** RLS policies blocking queries

**Solution:**
- Check RLS policies in data project
- Verify `auth.uid()` matches `userId` in query
- Use service role key for admin operations

### Apps not sharing authentication
**Problem:** Each app asking for login separately

**Solution:**
- Verify all apps use SAME auth project URL
- Check cookie domain is set to parent (`.getbeton.ai`)
- Ensure all apps use HTTPS (cookies won't share over HTTP)

---

## Cost Estimation

**Supabase Pricing (Free Tier):**
- 2 free projects per organization
- Additional projects: $25/month each

**Example Setup:**
- Auth Project: Free
- Data Project 1: Free
- Data Project 2: $25/month
- Data Project 3: $25/month
- **Total: $50/month** for 4 projects (1 auth + 3 apps)

**Pro Tips:**
- Start with 2 free projects (auth + one app)
- Add paid projects as you grow
- Use same database for similar apps initially

---

## Summary

You've set up:
- ✅ One auth project shared across all apps (SSO)
- ✅ Separate data projects for each app (data isolation)
- ✅ Google OAuth working across all subdomains
- ✅ Secure cookie sharing with proper domain settings
- ✅ User sync between auth and data projects
- ✅ Row-level security on all tables

**Key Takeaways:**
1. Auth is centralized, data is decentralized
2. Cookies must use parent domain (`.getbeton.ai`)
3. Each app needs TWO Supabase clients (auth + data)
4. User records must be synced to each data project
5. RLS policies protect data in each project

---

**Questions?** Drop a comment or reach out on [Twitter](https://x.com/stochasticmacaw).

Made with ❤️ by the Beton team
