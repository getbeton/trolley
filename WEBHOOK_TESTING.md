# Webhook Notification Testing Guide

## Overview

The webhook notification system sends HTTP POST requests when migration runs complete. This document explains how the system works and how to test it.

## How It Works

### Flow

1. **Migration Completes**: When `executeRun()` finishes a migration successfully, it calls `deliverWebhookNotification(runId)`

2. **Lookup Webhook URL**: The system queries the `Credential` table for a `NOTIFICATION_WEBHOOK` credential for the user

3. **Create Notification Record**: A `WebhookNotification` record is created in the database with `PENDING` status

4. **Send HTTP Request**: An HTTP POST is sent to the webhook URL with the following payload:
   ```json
   {
     "migration": "migration-name",
     "runId": "run-uuid",
     "status": "SUCCEEDED",
     "progress": 100,
     "recordsProcessed": 500,
     "startedAt": "2025-11-30T10:00:00.000Z",
     "completedAt": "2025-11-30T10:05:00.000Z"
   }
   ```

5. **Update Status**: The notification record is updated with:
   - Status: `DELIVERED` (if HTTP 2xx) or `FAILED` (if error or non-2xx)
   - Response status code
   - Response body (truncated to 1000 chars)
   - Delivery timestamp
   - Attempt count

### Database Schema

**Credential Table** (stores webhook URL):
```sql
userId: UUID (FK to User)
type: 'NOTIFICATION_WEBHOOK'
secret: string (the webhook URL)
status: 'VALID'
```

**WebhookNotification Table** (tracks deliveries):
```sql
id: UUID
runId: UUID (FK to MigrationRun)
event: 'MIGRATION_COMPLETED'
status: 'PENDING' | 'DELIVERED' | 'FAILED'
targetUrl: string
payload: JSON
responseStatusCode: number
responseBody: string
attemptCount: number
deliveredAt: timestamp
lastAttemptAt: timestamp
```

## Testing the Webhook System

### Option 1: Use webhook.site (Easiest)

1. **Get a test webhook URL**:
   - Visit https://webhook.site
   - Copy the unique URL (e.g., `https://webhook.site/your-unique-id`)

2. **Add the webhook credential via tRPC**:
   ```typescript
   // Via your frontend or API client
   await trpc.credential.upsert.mutate({
     type: 'NOTIFICATION_WEBHOOK',
     secret: 'https://webhook.site/your-unique-id',
     status: 'VALID'
   })
   ```

3. **Queue and execute a migration**:
   ```typescript
   // Queue a migration
   const { runId } = await trpc.migration.queueRun.mutate({
     name: 'Test Migration',
     description: 'Testing webhook notifications',
     recordEstimate: 500,
     etaSeconds: 10
   })

   // Execute it
   await fetch('/api/migrations/run', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ runId })
   })
   ```

4. **Check webhook.site** - You should see the POST request with the payload!

### Option 2: Local Testing with ngrok

1. **Start a local webhook receiver**:
   ```bash
   # Create a simple test server
   node -e "require('http').createServer((req, res) => {
     let body = '';
     req.on('data', chunk => body += chunk);
     req.on('end', () => {
       console.log('Webhook received:', JSON.parse(body));
       res.writeHead(200);
       res.end('OK');
     });
   }).listen(3001, () => console.log('Listening on :3001'))"
   ```

2. **Expose with ngrok**:
   ```bash
   ngrok http 3001
   ```

3. **Use the ngrok URL** as your webhook credential

### Option 3: Direct Database Insert (For Supabase Testing)

```sql
-- Insert webhook credential directly
INSERT INTO "Credential" (
  "userId",
  "type",
  "secret",
  "status"
) VALUES (
  'your-user-id',
  'NOTIFICATION_WEBHOOK',
  'https://webhook.site/your-unique-id',
  'VALID'
);
```

## Verifying Webhook Delivery

### Check Logs

The system logs detailed information at each step:

```bash
# Start your app and check logs
npm run dev

# Look for these log messages:
✓ "Preparing webhook notification"
✓ "Found webhook credential, creating notification"
✓ "Sending webhook notification"
✓ "Webhook response received"
✓ "Webhook delivered successfully"
```

### Query Notifications

View all webhook notifications via tRPC:

```typescript
const notifications = await trpc.migration.notifications.query()
```

Or directly from Supabase:

```sql
SELECT
  wn.*,
  mr."status" as run_status,
  m."name" as migration_name
FROM "WebhookNotification" wn
JOIN "MigrationRun" mr ON mr.id = wn."runId"
JOIN "Migration" m ON m.id = mr."migrationId"
ORDER BY wn."createdAt" DESC
LIMIT 10;
```

### Check Status Codes

- **Status: DELIVERED, Code: 200** ✅ Success
- **Status: DELIVERED, Code: 201-299** ✅ Success
- **Status: FAILED, Code: 4xx/5xx** ❌ HTTP error
- **Status: FAILED, No code** ❌ Network/timeout error

## Webhook Payload Format

The webhook receives a JSON POST request:

```json
{
  "migration": "CRM Data Sync",
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SUCCEEDED",
  "progress": 100,
  "recordsProcessed": 500,
  "startedAt": "2025-11-30T10:00:00.000Z",
  "completedAt": "2025-11-30T10:05:00.000Z"
}
```

**Headers**:
- `Content-Type: application/json`
- `User-Agent: Beton-Trolley-Webhook/1.0`

## Troubleshooting

### Webhook Not Firing

1. **Check if credential exists**:
   ```sql
   SELECT * FROM "Credential"
   WHERE "type" = 'NOTIFICATION_WEBHOOK'
   AND "status" = 'VALID';
   ```

2. **Check migration completed**:
   ```sql
   SELECT * FROM "MigrationRun"
   WHERE "status" = 'SUCCEEDED'
   ORDER BY "completedAt" DESC
   LIMIT 5;
   ```

3. **Check logs** for error messages

### Webhook Failing

1. **Verify URL is accessible**: Test with curl:
   ```bash
   curl -X POST https://your-webhook-url \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Check responseBody in notification record**:
   ```sql
   SELECT "responseStatusCode", "responseBody"
   FROM "WebhookNotification"
   WHERE "status" = 'FAILED';
   ```

3. **Common issues**:
   - URL requires authentication (add auth to your endpoint)
   - URL is localhost without ngrok tunnel
   - Firewall blocking outbound requests
   - SSL certificate issues

## Enhanced Payload (Future)

The current payload is minimal. You could enhance it with:

```typescript
payload: {
  migration: run.migration.name,
  migrationId: run.migrationId,
  runId,
  status: run.status,
  progress: run.progress,
  recordsProcessed: run.recordsProcessed,
  startedAt: run.startedAt,
  completedAt: run.completedAt,
  duration: calculateDuration(run.startedAt, run.completedAt),
  logs: recentLogs,  // Last 5 log entries
  metrics: run.metrics,  // Performance metrics
}
```

## Security Considerations

1. **Webhook URLs are stored in plaintext** - Consider encryption for sensitive endpoints
2. **No authentication** - The webhook is sent without auth headers
3. **Retry logic** - Currently no automatic retries (attemptCount tracked but not used)
4. **Rate limiting** - No rate limiting on webhook delivery

### Recommended Security Enhancements

- Add HMAC signature validation
- Support webhook secrets for verification
- Implement exponential backoff retry logic
- Add rate limiting per endpoint
- Encrypt webhook URLs in database
