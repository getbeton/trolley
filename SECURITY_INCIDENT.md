# 🚨 SECURITY INCIDENT - Exposed Supabase Credentials

**Date:** November 30, 2025
**Severity:** CRITICAL
**Status:** CREDENTIALS EXPOSED - IMMEDIATE ACTION REQUIRED

---

## Incident Summary

Supabase service role keys were accidentally committed to the git repository in file `SUPABASE_PROJECTS_SETUP.md`. These credentials are now in the git history and must be considered compromised.

**Commit:** 6431323
**File:** SUPABASE_PROJECTS_SETUP.md (now deleted)
**Exposed:** Service role keys for 4 Supabase projects

---

## ⚠️ IMMEDIATE ACTION REQUIRED

### Step 1: Rotate ALL Supabase API Keys (DO THIS NOW)

You must regenerate API keys for these projects:

#### 1. beton-auth (uezyvflphqcizcbfklla)

1. Go to: https://supabase.com/dashboard/project/uezyvflphqcizcbfklla/settings/api
2. Click **"Regenerate API keys"** or **"Reset service_role key"**
3. Save the NEW keys immediately
4. Update Vercel environment variables with NEW keys

#### 2. beton-trolley (nuxwbqovsllgceswaxgf)

1. Go to: https://supabase.com/dashboard/project/nuxwbqovsllgceswaxgf/settings/api
2. Regenerate all API keys
3. Update Vercel with NEW keys

#### 3. beton-enrichment (guawqykkwnovcygeehpk)

1. Go to: https://supabase.com/dashboard/project/guawqykkwnovcygeehpk/settings/api
2. Regenerate all API keys
3. Save NEW keys securely

#### 4. beton-facade (sthidehegwyiwoishltl)

1. Go to: https://supabase.com/dashboard/project/sthidehegwyiwoishltl/settings/api
2. Regenerate all API keys
3. Save NEW keys securely

---

## Step 2: Update Vercel Environment Variables

After rotating keys, update Vercel immediately:

```bash
# Remove old variables
vercel env rm SUPABASE_AUTH_SERVICE_ROLE_KEY production
vercel env rm SUPABASE_DATA_SERVICE_ROLE_KEY production
vercel env rm SUPABASE_SERVICE_ROLE_KEY production

# Add new variables with rotated keys
echo "NEW_KEY_HERE" | vercel env add SUPABASE_AUTH_SERVICE_ROLE_KEY production
echo "NEW_KEY_HERE" | vercel env add SUPABASE_DATA_SERVICE_ROLE_KEY production
echo "NEW_KEY_HERE" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Repeat for Preview and Development environments.

---

## Step 3: Audit Database Access

Check Supabase logs for any unauthorized access:

1. Go to each project dashboard
2. Navigate to **Logs** → **API Logs**
3. Look for suspicious queries or access patterns
4. Check for any data modifications between commit time and key rotation

**Time window to check:** November 30, 2025, 12:00 PM UTC onwards

---

## Step 4: Review Git History (Optional but Recommended)

If the repository is public or shared:

```bash
# Use git-filter-repo to remove sensitive data from history
pip install git-filter-repo
git filter-repo --invert-paths --path SUPABASE_PROJECTS_SETUP.md
git push --force origin master
```

**⚠️ Warning:** This rewrites git history. Coordinate with your team.

---

## What Was Exposed

### Service Role Keys (Full Admin Access)
- ❌ beton-auth service_role key
- ❌ beton-trolley service_role key
- ❌ beton-enrichment service_role key
- ❌ beton-facade service_role key

### Anon Keys (Public - Less Critical)
- ⚠️ All anon keys (these are meant to be public but should still be rotated)

### What Service Role Keys Can Do
- Bypass Row Level Security (RLS)
- Read/write/delete ANY data in the database
- Modify database schema
- Access user authentication data
- Create/delete users
- Full administrative control

---

## Prevention Checklist

To prevent this from happening again:

- [x] Delete file with exposed credentials
- [x] Add credentials files to .gitignore
- [ ] Rotate ALL exposed keys immediately
- [ ] Update Vercel environment variables
- [ ] Audit database logs for unauthorized access
- [ ] Consider rewriting git history (optional)
- [ ] Use environment variables for sensitive data
- [ ] Never commit actual credentials to documentation
- [ ] Use placeholders in documentation (e.g., `your-key-here`)

---

## Files to Check for Credentials

Search for any other files that might contain credentials:

```bash
# Search for JWT tokens in repository
git grep -i "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"

# Search for supabase URLs
git grep -i "supabase.co"

# Check all markdown files
git grep -i "service_role" "*.md"
```

---

## Secure Documentation Template

Use this template for future documentation:

```markdown
## API Credentials

**Get your credentials from Supabase:**

1. Go to your project dashboard
2. Navigate to Settings → API
3. Copy the following:

\`\`\`bash
# Replace with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
\`\`\`

**⚠️ Never commit actual credentials to git!**
```

---

## Timeline

| Time | Event |
|------|-------|
| 12:00 PM | Credentials added to SUPABASE_PROJECTS_SETUP.md |
| 12:41 PM | Committed to git (commit 6431323) |
| 12:41 PM | Pushed to GitHub |
| ~12:50 PM | Issue discovered |
| ~12:50 PM | File deleted from working directory |
| PENDING | Keys rotation |
| PENDING | Vercel variables update |

**Exposure Duration:** ~50 minutes (estimate)

---

## Contact & Resources

**Supabase Support:**
- If you believe there was unauthorized access, contact: support@supabase.com
- Security issues: security@supabase.com

**Documentation:**
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Security Best Practices](https://supabase.com/docs/guides/platform/going-into-production#security)

---

## Action Items Summary

**CRITICAL (Do Immediately):**
1. ✅ Delete exposed file
2. ⏳ Rotate all service role keys in Supabase (4 projects)
3. ⏳ Update Vercel environment variables with new keys
4. ⏳ Redeploy application

**HIGH (Do Today):**
5. ⏳ Audit Supabase logs for unauthorized access
6. ⏳ Search codebase for any other exposed credentials
7. ⏳ Commit and push cleanup changes

**MEDIUM (Do This Week):**
8. ⏳ Consider rewriting git history
9. ⏳ Review security practices with team
10. ⏳ Implement credential scanning in CI/CD

---

## Lessons Learned

**What went wrong:**
- Documentation included actual credentials instead of placeholders
- File was committed without review
- No automated credential scanning in place

**How to prevent:**
- Always use placeholders in documentation
- Never commit .env files or credential files
- Use git hooks to scan for secrets before commit
- Consider tools like: git-secrets, truffleHog, or GitHub secret scanning

---

**Status:** File deleted, awaiting key rotation
**Priority:** CRITICAL - Act within next hour
**Responsible:** Repository owner must rotate keys

---

Made with ❤️ by the Beton team (but we made a mistake - sorry!)
