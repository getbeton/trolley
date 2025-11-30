# Supabase Projects Setup Guide

**Date:** November 30, 2025

This guide helps you set up your Supabase projects for the Beton multi-app architecture.

**⚠️ SECURITY NOTE:** This file uses placeholders. Never commit actual credentials to git!

---

## Project Structure

| Project Name | Purpose | Region | Project Ref |
|--------------|---------|--------|-------------|
| **beton-auth** | Shared authentication | eu-central-1 | uezyvflphqcizcbfklla |
| **beton-trolley** | Trolley app data | eu-north-1 | nuxwbqovsllgceswaxgf |
| **beton-enrichment** | Enrichment app data | eu-central-1 | guawqykkwnovcygeehpk |
| **beton-facade** | Facade app data | eu-central-1 | sthidehegwyiwoishltl |

---

## Getting Your Credentials

### For Each Project:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. You'll see three values:

```bash
# Project URL (public)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Anon/Public key (safe to expose in frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...YOUR_ANON_KEY_HERE

# Service role key (NEVER expose publicly!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...YOUR_SERVICE_ROLE_KEY_HERE
```

### Example: beton-auth Project

**Dashboard:** https://supabase.com/dashboard/project/uezyvflphqcizcbfklla/settings/api

```bash
# Copy these values from your dashboard:
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://uezyvflphqcizcbfklla.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=[Get from dashboard]
SUPABASE_AUTH_SERVICE_ROLE_KEY=[Get from dashboard]
```

### Example: beton-trolley Project

**Dashboard:** https://supabase.com/dashboard/project/nuxwbqovsllgceswaxgf/settings/api

```bash
# Copy these values from your dashboard:
NEXT_PUBLIC_SUPABASE_DATA_URL=https://nuxwbqovsllgceswaxgf.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=[Get from dashboard]
SUPABASE_DATA_SERVICE_ROLE_KEY=[Get from dashboard]
```

---

## Quick Command to Get Keys

Run this command for each project:

```bash
# Replace PROJECT_REF with actual project reference
supabase projects api-keys --project-ref PROJECT_REF
```

**Examples:**
```bash
# Auth project
supabase projects api-keys --project-ref uezyvflphqcizcbfklla

# Trolley data project
supabase projects api-keys --project-ref nuxwbqovsllgceswaxgf

# Enrichment data project
supabase projects api-keys --project-ref guawqykkwnovcygeehpk

# Facade data project
supabase projects api-keys --project-ref sthidehegwyiwoishltl
```

---

## Environment Variable Template

### For Production (Vercel)

```bash
# Authentication (Shared - beton-auth)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://uezyvflphqcizcbfklla.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=[your-auth-anon-key]
SUPABASE_AUTH_SERVICE_ROLE_KEY=[your-auth-service-role-key]

# Data (App-specific - beton-trolley)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://nuxwbqovsllgceswaxgf.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=[your-data-anon-key]
SUPABASE_DATA_SERVICE_ROLE_KEY=[your-data-service-role-key]

# Legacy (Backward compatibility)
NEXT_PUBLIC_SUPABASE_URL=https://nuxwbqovsllgceswaxgf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-data-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-data-service-role-key]
```

---

## Security Best Practices

### ✅ DO:
- Keep service role keys in secure environment variables only
- Use `.env.local` for local development (never commit)
- Store credentials in password managers
- Rotate keys if exposed
- Use RLS (Row Level Security) policies

### ❌ DON'T:
- Commit credentials to git
- Share service role keys publicly
- Use service role keys in frontend code
- Store credentials in documentation files
- Push `.env` files to repositories

---

## Where to Store Credentials

### Local Development
```bash
# .env.local (git-ignored)
cp .env.example .env.local
# Then edit .env.local with actual credentials
```

### Vercel (Production)
```bash
# Use Vercel CLI
echo "your-actual-key" | vercel env add VARIABLE_NAME production

# Or use Vercel Dashboard
# Settings → Environment Variables → Add New
```

### Secure Storage
- Use: 1Password, LastPass, or similar
- Store: All service role keys
- Share: Only with authorized team members

---

## Project Dashboards

Quick links to manage your projects:

- **beton-auth**: https://supabase.com/dashboard/project/uezyvflphqcizcbfklla
- **beton-trolley**: https://supabase.com/dashboard/project/nuxwbqovsllgceswaxgf
- **beton-enrichment**: https://supabase.com/dashboard/project/guawqykkwnovcygeehpk
- **beton-facade**: https://supabase.com/dashboard/project/sthidehegwyiwoishltl

---

## If Credentials Are Exposed

If you accidentally expose credentials:

1. **Rotate keys immediately** in Supabase dashboard
2. Update all environment variables with new keys
3. Redeploy your applications
4. Check logs for unauthorized access
5. Consider rewriting git history if committed

**See:** [GitHub guide on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

## Next Steps

1. Get credentials from each Supabase project dashboard
2. Store securely in password manager
3. Add to Vercel environment variables
4. Copy to `.env.local` for local development
5. Never commit actual credentials!

---

**Questions?** Check [VERCEL_ENVIRONMENT_SETUP.md](./VERCEL_ENVIRONMENT_SETUP.md) for detailed setup instructions.

Made with ❤️ by the Beton team
