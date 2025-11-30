#!/usr/bin/env node

/**
 * Simple Webhook Receiver for Testing
 *
 * This creates a local HTTP server that receives webhook notifications
 * and displays them in the console.
 *
 * Usage:
 *   node test-webhook-receiver.js [port]
 *
 * Then expose it with ngrok:
 *   ngrok http 3001
 */

const http = require('http')
const port = process.argv[2] || 3001

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      console.log('\n' + '='.repeat(60))
      console.log('📬 WEBHOOK RECEIVED')
      console.log('='.repeat(60))
      console.log(`Time: ${new Date().toISOString()}`)
      console.log(`Method: ${req.method}`)
      console.log(`URL: ${req.url}`)
      console.log('\nHeaders:')
      Object.entries(req.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`)
      })
      console.log('\nPayload:')
      try {
        const payload = JSON.parse(body)
        console.log(JSON.stringify(payload, null, 2))

        // Display in a nice format
        console.log('\n📊 Migration Details:')
        console.log(`  Migration: ${payload.migration}`)
        console.log(`  Status: ${payload.status}`)
        console.log(`  Progress: ${payload.progress}%`)
        console.log(`  Records: ${payload.recordsProcessed}`)
        if (payload.startedAt && payload.completedAt) {
          const duration = new Date(payload.completedAt) - new Date(payload.startedAt)
          console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`)
        }
      } catch (e) {
        console.log(body)
      }
      console.log('='.repeat(60) + '\n')

      // Send success response
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        success: true,
        message: 'Webhook received successfully',
        timestamp: new Date().toISOString()
      }))
    })
  } else if (req.method === 'GET') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'running',
      message: 'Webhook receiver is ready',
      port
    }))
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
  }
})

server.listen(port, () => {
  console.log(`
┌─────────────────────────────────────────────────────────┐
│  🎯 Webhook Receiver Running                            │
├─────────────────────────────────────────────────────────┤
│  Port: ${port.toString().padEnd(48)} │
│  Local: http://localhost:${port.toString().padEnd(36)} │
└─────────────────────────────────────────────────────────┘

📝 To expose this server publicly:
   1. Install ngrok: https://ngrok.com/download
   2. Run: ngrok http ${port}
   3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   4. Use that URL as your webhook in the app

⏳ Waiting for webhooks...
`)
})

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down webhook receiver...')
  server.close()
  process.exit(0)
})
