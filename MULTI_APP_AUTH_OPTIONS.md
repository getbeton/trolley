# Multi-App Authentication Architecture Options

**Problem:** Supabase only allows ONE Site URL, but we have multiple apps that need to share authentication.

**Apps:**
- trolley.getbeton.ai (current app)
- enrichment.getbeton.ai (future)
- facade.getbeton.ai (future)

**Goal:** One auth system, multiple apps, seamless authentication across all subdomains.

---

## Option 1: Centralized Auth Hub (Recommended)

### Architecture
```
Site URL: https://auth.getbeton.ai

User Flow:
1. User visits trolley.getbeton.ai
2. Not authenticated → Redirect to auth.getbeton.ai/login?redirect_to=trolley.getbeton.ai
3. User signs in with Google on auth.getbeton.ai
4. After success → Redirect back to trolley.getbeton.ai/auth/callback
5. Cookie is set on .getbeton.ai domain (shared)
6. User is authenticated across all subdomains
```

### Implementation

**Create auth.getbeton.ai as a lightweight auth service:**

```typescript
// apps/auth/app/login/page.tsx
export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to') || 'trolley.getbeton.ai'

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `https://auth.getbeton.ai/callback?redirect_to=${redirectTo}`,
      },
    })
  }
}

// apps/auth/app/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirect_to') || 'trolley.getbeton.ai'

  if (code) {
    const supabase = createAuthServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect back to the app that initiated the login
  return NextResponse.redirect(`https://${redirectTo}/auth/callback`)
}
```

**Update each app to redirect to auth hub:**

```typescript
// apps/trolley/app/page.tsx
function redirectToLogin() {
  const currentDomain = window.location.hostname
  window.location.href = `https://auth.getbeton.ai/login?redirect_to=${currentDomain}`
}
```

### Pros
✅ Clean separation of concerns
✅ One central auth UI (consistent UX)
✅ Easy to add new apps
✅ Session shared via cookie domain (.getbeton.ai)
✅ Works perfectly with Supabase's single Site URL

### Cons
❌ Requires building auth.getbeton.ai service
❌ Extra redirect step (user leaves app briefly)
❌ Need to maintain auth service

---

## Option 2: Dynamic Site URL with Redirect

### Architecture
```
Site URL: https://getbeton.ai (main domain)
Redirect URLs:
- https://trolley.getbeton.ai/auth/callback
- https://enrichment.getbeton.ai/auth/callback
- https://facade.getbeton.ai/auth/callback
```

### How It Works

Each app handles its own OAuth flow but uses Supabase's `redirect_to` parameter:

```typescript
// In any app (trolley, enrichment, facade)
async function handleGoogleSignIn() {
  const currentUrl = window.location.origin

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${currentUrl}/auth/callback`,
    },
  })
}
```

Supabase will redirect to the app after successful auth.

### Pros
✅ No separate auth service needed
✅ Each app is independent
✅ Less redirects (direct OAuth flow)

### Cons
❌ Requires main domain (getbeton.ai) to exist and be accessible
❌ Site URL might not match the app (could confuse Supabase)
❌ Not truly "one central auth point"

---

## Option 3: Auth Subdomain with Smart Routing

### Architecture
```
Site URL: https://auth.getbeton.ai
Redirect URLs: All app callbacks

The auth service detects where the user came from and redirects accordingly.
```

### Implementation

**auth.getbeton.ai becomes a "smart router":**

```typescript
// apps/auth/middleware.ts
export function middleware(request: NextRequest) {
  const referer = request.headers.get('referer')
  const origin = new URL(referer || 'https://trolley.getbeton.ai').hostname

  // Store where user came from
  const response = NextResponse.next()
  response.cookies.set('origin_app', origin, {
    domain: '.getbeton.ai',
    secure: true,
    sameSite: 'lax',
  })

  return response
}

// apps/auth/app/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Get where user came from
  const cookieStore = await cookies()
  const originApp = cookieStore.get('origin_app')?.value || 'trolley.getbeton.ai'

  if (code) {
    const supabase = createAuthServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect back to origin
  return NextResponse.redirect(`https://${originApp}`)
}
```

**Apps redirect to auth hub:**

```typescript
// In any app
function redirectToLogin() {
  // Just redirect to auth hub, it will remember where you came from
  window.location.href = 'https://auth.getbeton.ai/login'
}
```

### Pros
✅ User doesn't need to specify redirect_to in URL
✅ Cleaner URLs
✅ Automatic routing based on referrer

### Cons
❌ Still requires auth hub service
❌ Relies on referrer header (can be unreliable)
❌ More complex state management

---

## Option 4: Monorepo with Shared Auth Routes

### Architecture
```
Site URL: https://trolley.getbeton.ai (or any app)
Each app has SAME auth routes (/auth/signin, /auth/callback)
Shared authentication module
```

### Implementation

**Shared auth module (packages/auth):**

```typescript
// packages/auth/signin.tsx
export function SignInPage() {
  const currentUrl = window.location.origin

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${currentUrl}/auth/callback`,
      },
    })
  }

  return <button onClick={handleGoogleSignIn}>Sign in with Google</button>
}
```

**Each app uses the shared module:**

```typescript
// apps/trolley/app/auth/signin/page.tsx
import { SignInPage } from '@beton/auth'
export default SignInPage

// apps/enrichment/app/auth/signin/page.tsx
import { SignInPage } from '@beton/auth'
export default SignInPage

// apps/facade/app/auth/signin/page.tsx
import { SignInPage } from '@beton/auth'
export default SignInPage
```

### Pros
✅ No separate auth service
✅ Each app is fully independent
✅ Code reuse via shared package

### Cons
❌ Site URL in Supabase still only points to one app
❌ OAuth flow is independent per app (not truly shared)
❌ User has to sign in separately for each app

---

## Recommended Solution: Option 1 (Centralized Auth Hub)

### Why This Works Best

1. **Matches Supabase's Model**: Site URL points to auth.getbeton.ai
2. **Shared Sessions**: Cookie domain set to .getbeton.ai works across all apps
3. **Scalable**: Easy to add new apps
4. **Clean Architecture**: Separation of auth from business logic
5. **Consistent UX**: One login page for all apps

### Implementation Plan

#### Step 1: Create auth.getbeton.ai Service

```
beton-monorepo/
├── apps/
│   ├── auth/          # New auth hub service
│   ├── trolley/       # Existing
│   ├── enrichment/    # Future
│   └── facade/        # Future
└── packages/
    └── supabase/      # Shared Supabase clients
```

#### Step 2: Update Supabase Configuration

```
Site URL: https://auth.getbeton.ai

Redirect URLs:
- https://auth.getbeton.ai/callback
- https://trolley.getbeton.ai/auth/callback
- https://enrichment.getbeton.ai/auth/callback
- https://facade.getbeton.ai/auth/callback
- http://localhost:3000/auth/callback
- http://localhost:3001/auth/callback
- http://localhost:3002/auth/callback
```

#### Step 3: Update Google OAuth

```
Authorized JavaScript Origins:
- https://auth.getbeton.ai
- https://trolley.getbeton.ai
- https://enrichment.getbeton.ai
- https://facade.getbeton.ai

Authorized Redirect URIs:
- https://auth.getbeton.ai/auth/v1/callback
```

#### Step 4: Apps Redirect to Auth Hub

Each app checks for auth, redirects to hub if needed:

```typescript
// apps/trolley/middleware.ts
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const currentUrl = request.nextUrl.origin
    return NextResponse.redirect(
      `https://auth.getbeton.ai/login?redirect_to=${encodeURIComponent(currentUrl)}`
    )
  }

  return NextResponse.next()
}
```

---

## Comparison Table

| Feature | Option 1: Auth Hub | Option 2: Dynamic | Option 3: Smart Router | Option 4: Monorepo |
|---------|-------------------|-------------------|----------------------|-------------------|
| Supabase Site URL | ✅ auth.getbeton.ai | ⚠️ getbeton.ai | ✅ auth.getbeton.ai | ⚠️ trolley.getbeton.ai |
| Shared Sessions | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Extra Redirects | ⚠️ Yes (1 extra) | ✅ No | ⚠️ Yes (1 extra) | ✅ No |
| Complexity | ⚠️ Medium | ✅ Low | ❌ High | ✅ Low |
| Scalability | ✅ Excellent | ⚠️ Good | ✅ Excellent | ⚠️ Limited |
| Maintenance | ⚠️ Auth service | ✅ Minimal | ❌ Complex | ✅ Minimal |
| User Experience | ✅ Consistent | ⚠️ Varies | ✅ Consistent | ⚠️ Varies |

---

## Next Steps

1. Decide on architecture (I recommend Option 1)
2. Set up DNS for auth.getbeton.ai (already done as CNAME)
3. Create lightweight auth service at auth.getbeton.ai
4. Update Supabase Site URL to auth.getbeton.ai
5. Update Google OAuth to include auth.getbeton.ai
6. Update all apps to redirect to auth hub
7. Test the full flow

---

## Questions to Consider

1. **Do you want one consistent login page for all apps?** → Option 1
2. **Is minimal complexity most important?** → Option 2 or 4
3. **Will you have many apps (>5)?** → Option 1
4. **Do users need to sign in once for all apps?** → Option 1 or 3
5. **Is building an auth service acceptable?** → If yes, Option 1

---

**My Recommendation:** Go with **Option 1 (Centralized Auth Hub)** because it's the cleanest solution for multi-app authentication with Supabase's single Site URL limitation.

Would you like me to implement Option 1 for you?
