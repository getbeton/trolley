# Vercel Environment Variables Configuration

Complete guide for setting up environment variables in Vercel for the trolley app with dual-client architecture.

**Date:** November 30, 2025

---

## Overview

The trolley app uses a **dual-client architecture**:
- **Auth Client**: Connects to shared `beton-auth` project for authentication
- **Data Client**: Connects to app-specific `beton-trolley` project for data

Each Vercel environment (Production, Preview, Development) needs different credentials.

---

## Environment Mapping

| Vercel Environment | Auth Project | Data Project | Use Case |
|-------------------|--------------|--------------|----------|
| **Production** | beton-auth (production) | beton-trolley (production) | Live users |
| **Preview** | beton-auth (production) | beton-trolley (production) | PR deployments |
| **Development** | beton-test (test) | beton-test (test) | Local dev |

---

## Step 1: Get Credentials from Supabase

### Production Auth (beton-auth)

After renaming `beton-production` to `beton-auth`:

```bash
supabase projects api-keys --project-ref uezyvflphqcizcbfklla
```

Copy these values:
- **anon** key → `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY`
- **service_role** key → `SUPABASE_AUTH_SERVICE_ROLE_KEY`
- **URL** → `https://uezyvflphqcizcbfklla.supabase.co`

### Production Data (beton-trolley)

```bash
supabase projects api-keys --project-ref nuxwbqovsllgceswaxgf
```

Copy these values:
- **anon** key → `NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY`
- **service_role** key → `SUPABASE_DATA_SERVICE_ROLE_KEY`
- **URL** → `https://nuxwbqovsllgceswaxgf.supabase.co`

### Test/Development (beton-test)

```bash
supabase projects api-keys --project-ref egmmuxzfmbnfivxlqsyi
```

Copy these values:
- **anon** key → Use for both auth and data in development
- **service_role** key → Use for both auth and data in development
- **URL** → `https://egmmuxzfmbnfivxlqsyi.supabase.co`

---

## Step 2: Configure Vercel Environment Variables

Go to your Vercel project: https://vercel.com/nadyyyms-projects/beton-trolley

Navigate to: **Settings** → **Environment Variables**

### For PRODUCTION Environment

Add these variables with **Production** checkbox ONLY:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_AUTH_URL` | `https://uezyvflphqcizcbfklla.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` | [anon key from beton-auth] | Production |
| `SUPABASE_AUTH_SERVICE_ROLE_KEY` | [service role from beton-auth] | Production |
| `NEXT_PUBLIC_SUPABASE_DATA_URL` | `https://nuxwbqovsllgceswaxgf.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY` | [anon key from beton-trolley] | Production |
| `SUPABASE_DATA_SERVICE_ROLE_KEY` | [service role from beton-trolley] | Production |

**Backward Compatibility (Production):**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nuxwbqovsllgceswaxgf.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [anon key from beton-trolley] | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | [service role from beton-trolley] | Production |

### For PREVIEW Environment

Add these variables with **Preview** checkbox ONLY:

**Use SAME values as Production** (safe for testing with production data)

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_AUTH_URL` | `https://uezyvflphqcizcbfklla.supabase.co` | Preview |
| `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` | [anon key from beton-auth] | Preview |
| `SUPABASE_AUTH_SERVICE_ROLE_KEY` | [service role from beton-auth] | Preview |
| `NEXT_PUBLIC_SUPABASE_DATA_URL` | `https://nuxwbqovsllgceswaxgf.supabase.co` | Preview |
| `NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY` | [anon key from beton-trolley] | Preview |
| `SUPABASE_DATA_SERVICE_ROLE_KEY` | [service role from beton-trolley] | Preview |

**Backward Compatibility (Preview):**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nuxwbqovsllgceswaxgf.supabase.co` | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [anon key from beton-trolley] | Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | [service role from beton-trolley] | Preview |

### For DEVELOPMENT Environment

Add these variables with **Development** checkbox ONLY:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_AUTH_URL` | `https://egmmuxzfmbnfivxlqsyi.supabase.co` | Development |
| `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` | [anon key from beton-test] | Development |
| `SUPABASE_AUTH_SERVICE_ROLE_KEY` | [service role from beton-test] | Development |
| `NEXT_PUBLIC_SUPABASE_DATA_URL` | `https://egmmuxzfmbnfivxlqsyi.supabase.co` | Development |
| `NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY` | [anon key from beton-test] | Development |
| `SUPABASE_DATA_SERVICE_ROLE_KEY` | [service role from beton-test] | Development |

**Backward Compatibility (Development):**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://egmmuxzfmbnfivxlqsyi.supabase.co` | Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [anon key from beton-test] | Development |
| `SUPABASE_SERVICE_ROLE_KEY` | [service role from beton-test] | Development |

---

## Step 3: Local Development Setup

### Update Your .env.local File

```bash
# Copy from .env.example
cp .env.example .env.local

# Then edit .env.local with actual credentials from beton-test
```

**Contents of .env.local:**

```bash
# Environment
NODE_ENV=development

# =============================================================================
# SUPABASE CONFIGURATION - DUAL CLIENT ARCHITECTURE
# =============================================================================

# AUTHENTICATION PROJECT (Development - beton-test)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://egmmuxzfmbnfivxlqsyi.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=[your-actual-anon-key-from-beton-test]
SUPABASE_AUTH_SERVICE_ROLE_KEY=[your-actual-service-role-key-from-beton-test]

# DATA PROJECT (Development - beton-test, same as auth)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://egmmuxzfmbnfivxlqsyi.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=[your-actual-anon-key-from-beton-test]
SUPABASE_DATA_SERVICE_ROLE_KEY=[your-actual-service-role-key-from-beton-test]

# LEGACY VARIABLES (Backward compatibility)
NEXT_PUBLIC_SUPABASE_URL=https://egmmuxzfmbnfivxlqsyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-actual-anon-key-from-beton-test]
SUPABASE_SERVICE_ROLE_KEY=[your-actual-service-role-key-from-beton-test]

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Your actual API credentials for testing
TWENTY_BASE_URL=https://your-team.twenty.com
TWENTY_API_TOKEN=your_twenty_api_token
ATTIO_API_TOKEN=your_attio_api_token
```

---

## Step 4: Verify Configuration

### Test Production

1. Deploy to production: `vercel --prod`
2. Open your production URL
3. Try signing in with Google
4. Verify you can create/view migrations
5. Check logs for any errors

### Test Preview

1. Create a pull request
2. Vercel will automatically deploy a preview
3. Test authentication and data operations
4. Should use production credentials

### Test Local Development

1. Run locally: `npm run dev`
2. Test authentication (should use beton-test)
3. Test data operations (should use beton-test)
4. No production data affected

---

## Summary of Variables per Environment

### Production (6 new + 3 legacy = 9 total)

```
NEXT_PUBLIC_SUPABASE_AUTH_URL → beton-auth URL
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY → beton-auth anon key
SUPABASE_AUTH_SERVICE_ROLE_KEY → beton-auth service role

NEXT_PUBLIC_SUPABASE_DATA_URL → beton-trolley URL
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY → beton-trolley anon key
SUPABASE_DATA_SERVICE_ROLE_KEY → beton-trolley service role

# Legacy (for backward compatibility)
NEXT_PUBLIC_SUPABASE_URL → beton-trolley URL
NEXT_PUBLIC_SUPABASE_ANON_KEY → beton-trolley anon key
SUPABASE_SERVICE_ROLE_KEY → beton-trolley service role
```

### Preview (Same as Production)

```
[Same 9 variables as Production]
```

### Development (6 new + 3 legacy = 9 total)

```
NEXT_PUBLIC_SUPABASE_AUTH_URL → beton-test URL
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY → beton-test anon key
SUPABASE_AUTH_SERVICE_ROLE_KEY → beton-test service role

NEXT_PUBLIC_SUPABASE_DATA_URL → beton-test URL (same project)
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY → beton-test anon key
SUPABASE_DATA_SERVICE_ROLE_KEY → beton-test service role

# Legacy (for backward compatibility)
NEXT_PUBLIC_SUPABASE_URL → beton-test URL
NEXT_PUBLIC_SUPABASE_ANON_KEY → beton-test anon key
SUPABASE_SERVICE_ROLE_KEY → beton-test service role
```

---

## Quick Commands Reference

### Get Auth Credentials (Production)
```bash
supabase projects api-keys --project-ref uezyvflphqcizcbfklla
```

### Get Data Credentials (Production)
```bash
supabase projects api-keys --project-ref nuxwbqovsllgceswaxgf
```

### Get Test Credentials (Development)
```bash
supabase projects api-keys --project-ref egmmuxzfmbnfivxlqsyi
```

### Deploy to Production
```bash
vercel --prod
```

### Test Locally
```bash
npm run dev
```

---

## Troubleshooting

### Error: "NEXT_PUBLIC_SUPABASE_AUTH_URL is not defined"

**Solution:** Make sure all 6 new environment variables are set in Vercel for the correct environment.

### Error: "401 Unauthorized" in production

**Solution:** Verify the service role keys are set correctly in Vercel. Check they're for the right project.

### Authentication works but data queries fail

**Problem:** Auth and data are using different projects correctly, but data queries aren't working.

**Solution:**
- Check that DATA environment variables point to beton-trolley (production)
- Verify RLS policies exist in beton-trolley database
- Check user ID exists in both auth and data projects

### Local development can't connect

**Problem:** `.env.local` missing or has wrong credentials.

**Solution:**
- Copy `.env.example` to `.env.local`
- Get credentials from beton-test: `supabase projects api-keys --project-ref egmmuxzfmbnfivxlqsyi`
- Update `.env.local` with actual keys

---

## Next Steps

After setting up environment variables:

1. ✅ Verify all variables are set in Vercel
2. ✅ Test production deployment
3. ✅ Test preview deployment with a PR
4. ✅ Test local development
5. ✅ Configure Google OAuth with all domains
6. ✅ Test authentication flow end-to-end
7. ✅ Monitor logs for any issues

---

**Related Documentation:**
- [SUPABASE_CLEANUP_STEPS.md](./SUPABASE_CLEANUP_STEPS.md) - Manual cleanup steps
- [MULTI_APP_AUTH_GUIDE.md](./MULTI_APP_AUTH_GUIDE.md) - Multi-app architecture guide
- [AUTHENTICATION_SETUP_GUIDE.md](./AUTHENTICATION_SETUP_GUIDE.md) - OAuth setup guide
