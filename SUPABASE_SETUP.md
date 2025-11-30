# Supabase Migration Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: beton-trolley
   - **Database Password**: (generate a strong password and save it)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development

4. Wait for the project to be created (~2 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready, go to **Project Settings > API**:

1. **Project URL**: Copy this (looks like `https://xxx.supabase.co`)
2. **Anon/Public Key**: Copy this (this is safe for client-side)
3. **Service Role Key**: Copy this (keep this secret, server-side only)

## Step 3: Set Up Database Schema

Go to **SQL Editor** in your Supabase dashboard and run the migration SQL that will be generated in the next step.

## Step 4: Configure OAuth Providers

### Google OAuth:
1. Go to **Authentication > Providers** in Supabase
2. Enable **Google**
3. Follow the instructions to create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/):
   - Create a new OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### GitHub OAuth:
1. In **Authentication > Providers**, enable **GitHub**
2. Go to [GitHub Developer Settings](https://github.com/settings/developers)
3. Click "New OAuth App"
4. Fill in:
   - **Application name**: Beton Trolley
   - **Homepage URL**: Your app URL
   - **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

## Step 5: Update Environment Variables

Add these to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Existing API credentials
TWENTY_BASE_URL=https://your-team.twenty.com
TWENTY_API_TOKEN=your_twenty_api_token
TOOL_TOKEN=your_tool_service_token
ATTIO_API_TOKEN=your_attio_api_token
NOTIFICATION_WEBHOOK_URL=https://example.com/webhooks/attio-migration
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=1000
```

## Next Steps

Once you complete the above steps, I'll:
1. Generate the SQL migration for your database schema
2. Update the codebase to use Supabase
3. Set up authentication
4. Prepare for Vercel deployment
