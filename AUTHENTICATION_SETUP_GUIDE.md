# Complete Guide: Setting Up Google OAuth with Supabase & Vercel

A step-by-step guide to deploy your Next.js app with Google authentication, using Supabase as the auth provider and Vercel for hosting.

**What you'll achieve:**
- Users can sign in with Google
- Production deployment on Vercel
- Secure authentication with proper redirects
- All credentials and secrets properly managed

---

## Prerequisites

Before starting, ensure you have:
- A [Supabase](https://supabase.com) account and project
- A [Vercel](https://vercel.com) account
- A [Google Cloud](https://console.cloud.google.com) account
- Your app code ready locally

---

## Part 1: Create Google OAuth Credentials

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it something like "Beton Trolley Auth"
4. Click **Create**
5. Wait for the project to be created, then select it

### Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type → Click **Create**
3. Fill in the required fields:
   - **App name**: Beton Trolley (or your app name)
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. On the **Scopes** screen, click **Save and Continue** (no scopes needed)
6. On the **Test users** screen, click **Save and Continue**
7. Click **Back to Dashboard**

### Step 3: Create OAuth Credentials

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Name it "Beton Trolley Production"
5. Under **Authorized JavaScript origins**, add:
   ```
   https://your-project.supabase.co
   ```
   (Replace with your actual Supabase project URL)

6. Under **Authorized redirect URIs**, add:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project URL)

7. Click **Create**
8. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - Save them in a secure note or password manager
   - You'll need these in the next step

---

## Part 2: Configure Supabase

### Step 4: Enable Google Auth Provider

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. In the left sidebar, go to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it to **Enabled**
6. Paste your **Client ID** from Step 3
7. Paste your **Client Secret** from Step 3
8. Click **Save**

### Step 5: Get Your Supabase Credentials

You'll need these for Vercel. Find them in your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these three values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon public key** (starts with `eyJhbG...`)
   - **Service role key** (starts with `eyJhbG...`) - Keep this secret!

---

## Part 3: Configure Vercel

### Step 6: Get Your Production URL

First, you need to know your production URL. You have two options:

**Option A: Use Vercel's auto-generated URL**
- Format: `https://your-project-name.vercel.app`
- You'll get this after first deployment

**Option B: Use a custom domain**
- Go to Vercel → Your Project → **Settings** → **Domains**
- Add your custom domain
- Follow DNS configuration instructions

For this guide, we'll use Option A first.

### Step 7: Set Up Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **Environment Variables**
4. Add these three variables (one at a time):

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key | Production only |

**How to add each variable:**
- Click **Add New**
- Enter the **Key** (name)
- Enter the **Value**
- Select which environments (Production, Preview, Development)
- Click **Save**

### Step 8: Deploy to Vercel

**Option 1: Using Vercel CLI** (if installed)

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy to production
vercel --prod
```

**Option 2: Using Git Integration**

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: add Google OAuth authentication"
   git push origin main
   ```

2. In Vercel Dashboard:
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Click **Deploy**

3. Wait for deployment to complete
4. Copy your production URL (e.g., `https://beton-trolley.vercel.app`)

---

## Part 4: Update Google OAuth Redirect URIs

### Step 9: Add Vercel URL to Google Cloud

Now that you have your Vercel production URL, you need to add it to Google Cloud:

1. Go back to [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-app.vercel.app
   ```
   (Replace with your actual Vercel URL)

5. Keep the Supabase callback URL you added earlier
6. Click **Save**

---

## Part 5: Test Your Authentication

### Step 10: Test the Complete Flow

1. Open your production URL: `https://your-app.vercel.app`
2. You should be redirected to `/auth/signin` (since middleware requires auth)
3. Click **Continue with Google**
4. You should see Google's OAuth consent screen
5. Choose your Google account
6. Grant permissions
7. You should be redirected back to your app at `/`
8. Check that you're authenticated

**Troubleshooting:**

If you get errors, check:
- ✅ Google Cloud redirect URI matches: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- ✅ Vercel environment variables are set correctly
- ✅ Supabase Google provider is enabled
- ✅ All credentials match (no typos)

---

## Part 6: Optional - Custom Domain Setup

### Step 11: Add Custom Domain (Optional)

If you want to use a custom domain like `app.getbeton.ai`:

1. **In Vercel:**
   - Go to **Settings** → **Domains**
   - Add your custom domain
   - Follow DNS configuration (add CNAME or A record)

2. **In Google Cloud Console:**
   - Go to your OAuth Client
   - Add your custom domain to **Authorized JavaScript origins**:
     ```
     https://app.getbeton.ai
     ```
   - Click **Save**

3. **Test again** with your custom domain

---

## Part 7: Security Checklist

### Step 12: Verify Security Settings

Before going live, verify:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only in Production (not Preview/Development)
- [ ] Google OAuth Client Secret is never committed to Git
- [ ] `.env.local` is in your `.gitignore`
- [ ] Supabase Row Level Security (RLS) policies are enabled
- [ ] Google OAuth consent screen is configured properly
- [ ] Only authorized redirect URIs are listed in Google Cloud

---

## Quick Reference

### Environment Variables Needed

```bash
# Vercel Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Google Cloud Settings

```
OAuth Client Type: Web application
Authorized JavaScript origins:
  - https://your-project.supabase.co
  - https://your-app.vercel.app (optional: your custom domain)

Authorized redirect URIs:
  - https://your-project.supabase.co/auth/v1/callback
```

### Supabase Settings

```
Authentication → Providers → Google
  ✓ Enabled
  Client ID: [From Google Cloud]
  Client Secret: [From Google Cloud]
```

---

## Common Errors & Solutions

### Error: "Redirect URI mismatch"

**Problem:** Google says the redirect URI doesn't match.

**Solution:**
- Double-check the redirect URI in Google Cloud Console
- It must be: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes
- Wait 5 minutes for Google's changes to propagate

### Error: "Invalid credentials"

**Problem:** Supabase can't authenticate with Google.

**Solution:**
- Verify Client ID and Secret in Supabase match Google Cloud
- Check for any extra spaces when copy-pasting
- Regenerate credentials in Google Cloud if needed

### Error: "Environment variable not found"

**Problem:** Vercel can't find `NEXT_PUBLIC_SUPABASE_URL` or similar.

**Solution:**
- Go to Vercel → Settings → Environment Variables
- Verify all three variables are set
- Redeploy: `vercel --prod` or push new commit

### Error: "Session not found" or authentication loop

**Problem:** User is redirected to sign-in page repeatedly.

**Solution:**
- Check that middleware allows `/auth` paths
- Verify cookie settings in Supabase client
- Check browser console for errors
- Clear browser cookies and try again

---

## Next Steps

Once authentication is working:

1. **Set up database tables** for user data
2. **Configure RLS policies** in Supabase
3. **Add user profile** pages
4. **Set up proper logout** functionality
5. **Add email verification** (optional)
6. **Monitor auth logs** in Supabase dashboard

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## Summary

You've successfully set up:
- ✅ Google OAuth credentials in Google Cloud Console
- ✅ Google authentication provider in Supabase
- ✅ Environment variables in Vercel
- ✅ Proper redirect URIs for production
- ✅ Secure authentication flow

Your users can now sign in with Google, and all authentication is handled securely through Supabase.

---

**Questions or issues?** Drop a comment below or reach out on [Twitter](https://x.com/stochasticmacaw).

Made with ❤️ by the Beton team
