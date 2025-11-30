# Beton Trolley

A beautiful web interface for migrating data between CRM systems (Twenty.com ↔️ Attio). Run migrations with real-time progress tracking and webhook notifications.

Built by [Beton](https://getbeton.ai/?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley) • Follow [@stochasticmacaw](https://x.com/stochasticmacaw?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start migrating!

**No database required** – the app works immediately with a simple demo user. Perfect for one-time migrations.

---

## What You Can Do

### 1. **Connect Your CRMs**
Add your Twenty.com or Attio API credentials through the clean UI. All credentials are stored securely (in memory for quick runs, or in Supabase for persistence).

### 2. **Browse & Select Data**
- View all your CRM entities (companies, contacts, deals, etc.)
- See field names and sample data
- Select exactly what you want to migrate

### 3. **Run Migrations**
- Execute migrations with real-time progress tracking
- Monitor batch processing with rate-limit controls
- View detailed logs for every operation

### 4. **Get Notified**
Configure a webhook URL to receive notifications when migrations complete. Perfect for integrating with Slack, Discord, or your own systems.

---

## Installation

### Basic Setup (No Database)

This is perfect for one-time migrations or testing:

```bash
# 1. Clone the repository
git clone https://github.com/getbeton/beton-trolley.git
cd beton-trolley

# 2. Install dependencies
npm install

# 3. Run the app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and you're ready to go!

### Advanced Setup (With Supabase)

Want to persist credentials and migration history? Add Supabase:

```bash
# 1. Copy the environment template
cp .env.example .env.local

# 2. Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 3. Run the SQL migration
# Go to Supabase → SQL Editor → paste contents of supabase-migration.sql

# 4. Start the app
npm run dev
```

---

## Tech Stack

- **Centralized Auth Flow** (Supabase + Next.js middleware with encoded return state)
- **Next.js 16** + TypeScript
- **Tailwind CSS** + shadcn/ui components
- **tRPC** for type-safe APIs
- **Supabase** (optional) for data persistence
- **TanStack Query** for data fetching

---

## Example Use Cases

### Migrate from Twenty to Attio
1. Add your Twenty.com base URL and API token
2. Add your Attio API token
3. Select which entities (companies, contacts) to migrate
4. Map fields between systems
5. Run the migration and watch it complete in real-time

### Deduplicate Records
Use the built-in field mapping to identify and merge duplicate records before migration.

### Test Integrations
Run test migrations to validate your API credentials and field mappings before going to production.

### Webhook Integration
Set up a webhook to get notified in Slack when long-running migrations finish:
```bash
# Just add your webhook URL in the UI
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_AUTH_URL` – Shared auth project URL (points to beton-auth)
- `NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY` – Shared anon key for auth project

### Required (if using Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key (keep secret!)

### Optional
- `MIGRATION_RATE_LIMIT_MS` – Delay between batches (default: 500ms)
- `LOG_LEVEL` – Set to `debug` for verbose logging

---

## API Credentials

The app needs API credentials for your CRM systems. Add these through the web UI:

- **Twenty.com**: Base URL + API Token ([docs](https://twenty.com/developers))
- **Attio**: API Token ([docs](https://developers.attio.com))

Credentials are validated when you save them, and you'll see a green checkmark when they're working.

---

## Webhook Notifications

Want to get notified when migrations finish?

1. Add a `NOTIFICATION_WEBHOOK` credential in the UI
2. Use any webhook URL (webhook.site, Slack, Discord, etc.)
3. Migrations will automatically POST JSON payloads:

```json
{
  "migration": "CRM Migration",
  "runId": "550e8400-...",
  "status": "SUCCEEDED",
  "progress": 100,
  "recordsProcessed": 1500,
  "startedAt": "2025-11-30T10:00:00Z",
  "completedAt": "2025-11-30T10:05:00Z"
}
```

Test your webhooks with the included utilities:
```bash
node test-webhook-receiver.js    # Start local receiver
node test-webhook.js YOUR_URL    # Send test notification
```

## Authentication Flow (Production)

1. Visitors hit `https://trolley.getbeton.ai` (or any other allowed app domain). The Next.js middleware checks the Supabase session using the shared beton-auth project. If there is no session, the middleware redirects the user to `/signin` **on the same host** while preserving the original destination in a `return` query parameter.
2. The `/signin` page calls `supabase.auth.signInWithOAuth()` and encodes the desired return URL inside the OAuth `state` parameter. The callback URL always points to `/auth/callback` on the originating domain.
3. Supabase completes the OAuth handshake and redirects the browser back to `/auth/callback`. That route exchanges the authorization code for a session, validates the decoded `state.returnTo` URL against the whitelist in `src/lib/utils/domain.ts`, and then redirects the user back to their original page (defaulting to `/` on trolley).
4. Because middleware sets Supabase cookies on the `.getbeton.ai` parent domain in production, the session is immediately available to all Beton subdomains that host this app. There is no separate auth service to keep in sync—both `auth.getbeton.ai` and `trolley.getbeton.ai` serve the same Next.js deployment (see `vercel.json`), so maintenance is centralized.

This design eliminates brittle redirect cookies and still keeps the door open for additional Beton apps (e.g., `auth.getbeton.ai`, `enrichment.getbeton.ai`) by simply adding their hostnames to `ALLOWED_RETURN_DOMAINS`.

---

## Project Structure

```
beton-trolley/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   ├── lib/              # Utilities & Supabase client
│   └── server/           # tRPC routers & migration engine
├── public/               # Static assets
├── supabase-migration.sql   # Database schema
└── README.md            # You are here
```

---

## Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the build to verify (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/getbeton/beton-trolley/issues)
- **Discussions**: [GitHub Discussions](https://github.com/getbeton/beton-trolley/discussions)
- **Blog**: [Substack](https://blog.getbeton.ai/?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley)
- **Twitter**: [@stochasticmacaw](https://x.com/stochasticmacaw?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## About Beton

Beton builds tools for modern data teams. Learn more at [getbeton.ai](https://getbeton.ai/?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley).

**More from Beton:**
- 📖 [Substack](https://blog.getbeton.ai/?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley) - Guides and best practices
- 🔧 [GitHub](https://github.com/getbeton?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley) - Open source tools
- 🐦 [Founder Twitter](https://x.com/stochasticmacaw?utm_source=github&utm_medium=readme&utm_campaign=beton-trolley) - Updates and announcements

---

Made with ❤️ by the Beton team
