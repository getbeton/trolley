# Supabase Projects Cleanup & Reorganization

**Date:** November 30, 2025

This guide outlines the manual steps needed to clean up and reorganize your Supabase projects. The Supabase CLI doesn't support renaming/deleting projects, so these must be done through the dashboard.

---

## Current State

From `supabase projects list`:

| Project Name | Project Ref | Org ID | Status | Action Needed |
|--------------|-------------|--------|--------|---------------|
| webflow-cms-image-generator | sthidehegwyiwoishltl | wdpmjnpnrkyhfywsawth | Active | Rename to beton-facade |
| beton-production | uezyvflphqcizcbfklla | wdpmjnpnrkyhfywsawth | Active | Rename to beton-auth |
| beton-enrichment | guawqykkwnovcygeehpk | wdpmjnpnrkyhfywsawth | Active | Keep (use for enrichment app) |
| beton-facade | igtidhaoinvsvqdafnew | wdpmjnpnrkyhfywsawth | Active | DELETE (just created) |
| beton-trolley-data | mqsuhvsuzgzbhprfbppa | wdpmjnpnrkyhfywsawth | Active | DELETE (just created) |
| beton-trolley | nuxwbqovsllgceswaxgf | wdpmjnpnrkyhfywsawth | Active | Keep (use for trolley app data) |
| beton-test | egmmuxzfmbnfivxlqsyi | wdpmjnpnrkyhfywsawth | Active | Keep as test/dev environment |
| Strava Leaderboard | quttzyepwfhvxrpqmcrh | guyanrnoswbzfakunnui | Paused | Archive/Delete |
| VC database | fvbryrfttovgaozhjwgx | guyanrnoswbzfakunnui | Paused | Archive/Delete |
| getbeton.ai | pwfzzygzbfwgebthzchr | guyanrnoswbzfakunnui | Active | Keep or Archive? |

---

## Step-by-Step Cleanup Process

### Step 1: Rename Projects

Go to the [Supabase Dashboard](https://app.supabase.com)

#### 1.1 Rename webflow-cms-image-generator → beton-facade

1. Navigate to https://supabase.com/dashboard/project/sthidehegwyiwoishltl
2. Go to **Settings** → **General**
3. Under **General settings**, find **Name**
4. Change name to: `beton-facade`
5. Click **Save**

#### 1.2 Rename beton-production → beton-auth

1. Navigate to https://supabase.com/dashboard/project/uezyvflphqcizcbfklla
2. Go to **Settings** → **General**
3. Under **General settings**, find **Name**
4. Change name to: `beton-auth`
5. Click **Save**

### Step 2: Delete Unused Projects

#### 2.1 Delete newly created beton-facade (igtidhaoinvsvqdafnew)

1. Navigate to https://supabase.com/dashboard/project/igtidhaoinvsvqdafnew
2. Go to **Settings** → **General**
3. Scroll to bottom → **Danger Zone**
4. Click **Delete project**
5. Type the project name to confirm
6. Click **Delete** to confirm

#### 2.2 Delete newly created beton-trolley-data (mqsuhvsuzgzbhprfbppa)

1. Navigate to https://supabase.com/dashboard/project/mqsuhvsuzgzbhprfbppa
2. Go to **Settings** → **General**
3. Scroll to bottom → **Danger Zone**
4. Click **Delete project**
5. Type the project name to confirm
6. Click **Delete** to confirm

### Step 3: Archive/Delete Inactive Projects

#### 3.1 Strava Leaderboard (quttzyepwfhvxrpqmcrh)

1. Navigate to https://supabase.com/dashboard/project/quttzyepwfhvxrpqmcrh
2. If you want to keep the data, export it first:
   ```bash
   supabase db dump --project-ref quttzyepwfhvxrpqmcrh > strava_backup.sql
   ```
3. Go to **Settings** → **General** → **Danger Zone**
4. Click **Delete project** and confirm

#### 3.2 VC database (fvbryrfttovgaozhjwgx)

1. Navigate to https://supabase.com/dashboard/project/fvbryrfttovgaozhjwgx
2. If you want to keep the data, export it first:
   ```bash
   supabase db dump --project-ref fvbryrfttovgaozhjwgx > vc_backup.sql
   ```
3. Go to **Settings** → **General** → **Danger Zone**
4. Click **Delete project** and confirm

---

## Final Project Structure

After cleanup, you should have:

### Production Projects (Organization: wdpmjnpnrkyhfywsawth)

| Project Name | Project Ref | Purpose | Environment |
|--------------|-------------|---------|-------------|
| **beton-auth** (renamed) | uezyvflphqcizcbfklla | Shared authentication | Production |
| **beton-facade** (renamed) | sthidehegwyiwoishltl | Facade app database | Production |
| **beton-enrichment** | guawqykkwnovcygeehpk | Enrichment app database | Production |
| **beton-trolley** | nuxwbqovsllgceswaxgf | Trolley app database | Production |
| **beton-test** | egmmuxzfmbnfivxlqsyi | Test/dev environment | Development |

### Architecture

```
┌─────────────────────────────────────┐
│      beton-auth (Production)        │
│   Central Authentication Layer      │
│   - Google OAuth                    │
│   - GitHub OAuth                    │
│   - User sessions                   │
└─────────────────────────────────────┘
              │
              │ Shared Auth
              │
    ┌─────────┼─────────┬─────────┐
    │         │         │         │
    ▼         ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Facade  │ │Enrichmt │ │ Trolley │
│  Data   │ │  Data   │ │  Data   │
└─────────┘ └─────────┘ └─────────┘
  Prod DB     Prod DB     Prod DB

┌─────────────────────────────────────┐
│       beton-test (Development)      │
│   Test Auth + All Apps Data         │
└─────────────────────────────────────┘
```

---

## Environment Configuration

### Production Environment

**Vercel Production:**
- Points to `beton-auth` (production)
- Points to `beton-trolley` (production data)

**Environment Variables:**
```bash
# Auth (Shared - Production)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://uezyvflphqcizcbfklla.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=[from beton-auth]
SUPABASE_AUTH_SERVICE_ROLE_KEY=[from beton-auth]

# Data (App-specific - Production)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://nuxwbqovsllgceswaxgf.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=[from beton-trolley]
SUPABASE_DATA_SERVICE_ROLE_KEY=[from beton-trolley]
```

### Preview Environment

**Vercel Preview:**
- Points to `beton-auth` (production auth)
- Points to `beton-trolley` (production data)

**Environment Variables:** Same as production

### Development Environment

**Vercel Development & Local:**
- Points to `beton-test` (test auth)
- Points to `beton-test` (test data)

**Environment Variables:**
```bash
# Auth (Shared - Test)
NEXT_PUBLIC_SUPABASE_AUTH_URL=https://egmmuxzfmbnfivxlqsyi.supabase.co
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=[from beton-test]
SUPABASE_AUTH_SERVICE_ROLE_KEY=[from beton-test]

# Data (App-specific - Test)
NEXT_PUBLIC_SUPABASE_DATA_URL=https://egmmuxzfmbnfivxlqsyi.supabase.co
NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY=[from beton-test]
SUPABASE_DATA_SERVICE_ROLE_KEY=[from beton-test]
```

---

## Get Updated Credentials

After renaming, get fresh credentials:

### For beton-auth (after rename)
```bash
supabase projects api-keys --project-ref uezyvflphqcizcbfklla
```

### For beton-facade (after rename)
```bash
supabase projects api-keys --project-ref sthidehegwyiwoishltl
```

### For beton-trolley (production data)
```bash
supabase projects api-keys --project-ref nuxwbqovsllgceswaxgf
```

### For beton-enrichment
```bash
supabase projects api-keys --project-ref guawqykkwnovcygeehpk
```

### For beton-test (development)
```bash
supabase projects api-keys --project-ref egmmuxzfmbnfivxlqsyi
```

---

## Checklist

### Renaming (via Dashboard)
- [ ] Rename webflow-cms-image-generator → beton-facade
- [ ] Rename beton-production → beton-auth

### Deletion (via Dashboard)
- [ ] Delete beton-facade (igtidhaoinvsvqdafnew)
- [ ] Delete beton-trolley-data (mqsuhvsuzgzbhprfbppa)
- [ ] Delete/Archive Strava Leaderboard (quttzyepwfhvxrpqmcrh)
- [ ] Delete/Archive VC database (fvbryrfttovgaozhjwgx)

### Configuration
- [ ] Get credentials for beton-auth
- [ ] Get credentials for beton-trolley (production)
- [ ] Get credentials for beton-test
- [ ] Update Vercel environment variables
- [ ] Test production deployment
- [ ] Test preview deployment
- [ ] Test local development

---

## Notes

- **beton-test** can serve dual purpose: both auth and data for development
- This simplifies dev environment: only 1 project needed instead of 2
- Production uses 4 projects: 1 auth + 3 data (facade, enrichment, trolley)
- Preview environments use production credentials (safe for testing)
- All projects are in eu-central-1 except beton-test (us-east-2)

---

**Next Steps:**
1. Complete manual cleanup in Supabase dashboard
2. Run credential collection commands
3. Update environment variables in Vercel
4. Update local .env files
5. Deploy and test

---

**Questions?** Refer to MULTI_APP_AUTH_GUIDE.md for implementation details.
