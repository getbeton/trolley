# Beton Trolley Deployment Guide

## Prerequisites

1. **Supabase Project** - Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to create your project
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **OAuth Credentials** - Set up Google and GitHub OAuth (see SUPABASE_SETUP.md)

## Step 1: Prepare Your Supabase Project

### 1.1 Run Database Migration

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-migration.sql`
4. Click **Run** to execute the migration

### 1.2 Configure OAuth Providers

Follow the instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to set up:
- Google OAuth
- GitHub OAuth

### 1.3 Collect Your Credentials

From **Project Settings > API** in Supabase dashboard:
- Project URL (e.g., `https://xxx.supabase.co`)
- Anon/Public Key
- Service Role Key (keep this secret!)

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select `beton-trolley` as the root directory
4. Framework Preset: **Next.js**
5. Root Directory: `app`

### 2.2 Configure Environment Variables

Add these environment variables in Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional: External API Credentials
TWENTY_BASE_URL=https://your-team.twenty.com
TWENTY_API_TOKEN=your_twenty_api_token
TOOL_TOKEN=your_tool_service_token
ATTIO_API_TOKEN=your_attio_api_token
NOTIFICATION_WEBHOOK_URL=https://example.com/webhooks/attio-migration
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=1000
```

### 2.3 Build Settings

Vercel should auto-detect these, but verify:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### 2.4 Deploy

Click **Deploy** and wait for the build to complete.

## Step 3: Update OAuth Redirect URLs

After deployment, update your OAuth redirect URLs:

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Credentials**
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URI:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - `https://your-app.vercel.app/auth/callback`

### GitHub OAuth:
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your OAuth App
3. Update **Authorization callback URL**:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## Step 4: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should be redirected to `/auth/signin`
3. Test sign in with Google or GitHub
4. Verify you can access the migration wizard

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/beton-trolley.git
cd beton-trolley/app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `app/.env.local`:

```bash
# Copy from .env.example and fill in your values
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials.

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

**Note**: In development mode, authentication is bypassed automatically. You'll be logged in as a demo user.

## Production vs Development

### Development Mode
- `NODE_ENV=development`
- Authentication bypassed (demo user auto-created)
- No OAuth required for local testing
- Middleware allows all requests

### Production Mode
- `NODE_ENV=production`
- Full authentication required
- OAuth with Google/GitHub
- Middleware enforces auth on all routes
- Row Level Security (RLS) enforced

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (safe for client) | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret!) | `eyJhbGc...` |
| `NEXT_PUBLIC_APP_URL` | Your application URL | `https://your-app.vercel.app` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `TWENTY_BASE_URL` | Twenty CRM base URL | - |
| `TWENTY_API_TOKEN` | Twenty API token | - |
| `ATTIO_API_TOKEN` | Attio API token | - |
| `TOOL_TOKEN` | Tool service token | - |
| `NOTIFICATION_WEBHOOK_URL` | Webhook for notifications | - |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `1000` |

## Troubleshooting

### Build Fails on Vercel

**Error**: `Cannot find module '@supabase/ssr'`

**Solution**: Ensure `@supabase/ssr` and `@supabase/supabase-js` are in `dependencies`, not `devDependencies`.

### Authentication Loop

**Symptom**: Redirects back to sign in immediately after OAuth

**Solutions**:
1. Check OAuth redirect URLs are correct in Google/GitHub
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Check Supabase > Authentication > URL Configuration
4. Ensure cookies are enabled in browser

### Database Connection Issues

**Error**: RLS policy violation

**Solutions**:
1. Verify user exists in `User` table after sign in
2. Check RLS policies are enabled
3. Verify `auth.uid()` matches `userId` in tables
4. Use Supabase SQL Editor to test policies

### Dev Mode Not Working

**Symptom**: Required to sign in locally

**Solution**: Ensure `NODE_ENV=development` in `.env.local`

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is secret (never in client code)
- [ ] RLS policies enabled on all tables
- [ ] OAuth redirect URLs configured correctly
- [ ] Environment variables set in Vercel
- [ ] No secrets committed to Git
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured

## Support

- **Documentation**: See [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- **Issues**: Report at your repository
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
