#!/usr/bin/env node

/**
 * Webhook Notification Test Script
 *
 * This script tests the webhook notification system by:
 * 1. Creating a test webhook URL (using webhook.site)
 * 2. Adding it as a credential
 * 3. Queueing and executing a migration
 * 4. Verifying the webhook was delivered
 *
 * Usage:
 *   node test-webhook.js [webhook-url]
 *
 * If no webhook URL is provided, instructions for webhook.site will be shown.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const webhookUrl = process.argv[2]

if (!webhookUrl) {
  console.log(`
📋 Webhook Testing Instructions
================================

Step 1: Get a test webhook URL
   → Visit https://webhook.site
   → Copy your unique URL (e.g., https://webhook.site/abc-123)

Step 2: Run this script with the URL
   → node test-webhook.js https://webhook.site/YOUR-ID

Step 3: Check webhook.site for the delivered webhook!

Alternatively, set up a local receiver:
   → Run: node test-webhook-receiver.js
   → Use ngrok to expose: ngrok http 3001
   → Run: node test-webhook.js https://YOUR-ID.ngrok.io
`)
  process.exit(0)
}

async function testWebhook() {
  console.log('🚀 Starting webhook notification test...\n')

  // Step 1: Get or create demo user
  console.log('Step 1: Finding demo user...')
  const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/User?email=eq.demo@betontrolley.local`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  })
  const users = await userResponse.json()

  if (!users || users.length === 0) {
    console.error('❌ Demo user not found. Please start the app first to create it.')
    process.exit(1)
  }

  const userId = users[0].id
  console.log(`✅ Found user: ${users[0].email} (${userId})`)

  // Step 2: Upsert webhook credential
  console.log('\nStep 2: Setting webhook credential...')
  const credResponse = await fetch(`${SUPABASE_URL}/rest/v1/Credential`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      userId,
      type: 'NOTIFICATION_WEBHOOK',
      secret: webhookUrl,
      status: 'VALID',
      lastValidatedAt: new Date().toISOString()
    })
  })

  if (!credResponse.ok) {
    console.error('❌ Failed to set webhook credential:', await credResponse.text())
    process.exit(1)
  }

  console.log(`✅ Webhook credential set: ${webhookUrl}`)

  // Step 3: Create migration
  console.log('\nStep 3: Creating migration...')
  const migrationResponse = await fetch(`${SUPABASE_URL}/rest/v1/Migration`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      userId,
      name: `Webhook Test ${Date.now()}`,
      description: 'Testing webhook notification system',
      status: 'READY',
      recordEstimate: 100,
      etaSeconds: 5
    })
  })

  if (!migrationResponse.ok) {
    console.error('❌ Failed to create migration:', await migrationResponse.text())
    process.exit(1)
  }

  const [migration] = await migrationResponse.json()
  console.log(`✅ Migration created: ${migration.name} (${migration.id})`)

  // Step 4: Create migration run
  console.log('\nStep 4: Creating migration run...')
  const runResponse = await fetch(`${SUPABASE_URL}/rest/v1/MigrationRun`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      migrationId: migration.id,
      status: 'QUEUED',
      progress: 0,
      recordsProcessed: 0,
      etaSeconds: 5
    })
  })

  if (!runResponse.ok) {
    console.error('❌ Failed to create run:', await runResponse.text())
    process.exit(1)
  }

  const [run] = await runResponse.json()
  console.log(`✅ Migration run created: ${run.id}`)

  // Step 5: Execute the run via API
  console.log('\nStep 5: Executing migration run...')
  console.log('   (This will take ~3-5 seconds)')

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const executeResponse = await fetch(`${APP_URL}/api/migrations/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ runId: run.id })
  })

  if (!executeResponse.ok) {
    console.error('❌ Failed to execute run:', await executeResponse.text())
    console.log('\n💡 Make sure your app is running: npm run dev')
    process.exit(1)
  }

  console.log('✅ Migration execution completed')

  // Step 6: Check webhook notification was created
  console.log('\nStep 6: Checking webhook notification...')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s for webhook

  const notificationResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/WebhookNotification?runId=eq.${run.id}`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    }
  )

  const notifications = await notificationResponse.json()

  if (!notifications || notifications.length === 0) {
    console.error('❌ No webhook notification found!')
    console.log('\n💡 Check application logs for errors')
    process.exit(1)
  }

  const notification = notifications[0]
  console.log(`✅ Webhook notification created: ${notification.id}`)
  console.log(`   Status: ${notification.status}`)
  console.log(`   Event: ${notification.event}`)
  console.log(`   Target URL: ${notification.targetUrl}`)
  console.log(`   Response Status: ${notification.responseStatusCode || 'N/A'}`)
  console.log(`   Delivered At: ${notification.deliveredAt || 'Not yet'}`)
  console.log(`   Attempt Count: ${notification.attemptCount}`)

  if (notification.status === 'DELIVERED') {
    console.log('\n✅ SUCCESS! Webhook was delivered successfully!')
    console.log(`\n📦 Payload sent:`)
    console.log(JSON.stringify(notification.payload, null, 2))
    console.log(`\n🔗 Check your webhook receiver for the full request`)
  } else if (notification.status === 'FAILED') {
    console.log('\n❌ FAILED: Webhook delivery failed')
    console.log(`   Response: ${notification.responseBody}`)
  } else {
    console.log('\n⏳ PENDING: Webhook is still being delivered...')
  }

  console.log('\n✅ Test completed!')
  console.log('\nTo view notifications in the app:')
  console.log('   → Navigate to the migrations page')
  console.log('   → Check the notifications section')
}

testWebhook().catch(error => {
  console.error('\n❌ Test failed:', error.message)
  console.error(error.stack)
  process.exit(1)
})
