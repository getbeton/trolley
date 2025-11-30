# Flush DNS Cache on macOS

## The DNS is Working!

✅ Public DNS servers confirm `auth.getbeton.ai` is correctly configured:
```
auth.getbeton.ai → uezyvflphqcizcbfklla.supabase.co → 172.64.149.246, 104.18.38.10
```

❌ Your local machine has the old DNS cached (the version with the typo)

## Fix: Flush DNS Cache

Run this command in your terminal:

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

Then verify it works:

```bash
# Should now resolve successfully
curl -I https://auth.getbeton.ai/auth/v1/callback

# You should see:
# HTTP/1.1 303 See Other
# Location: https://trolley.getbeton.ai?error=...
```

## Alternative: Use Public DNS

If flushing doesn't work immediately, specify a DNS server:

```bash
# Using Google DNS
curl --dns-servers 8.8.8.8 -I https://auth.getbeton.ai/auth/v1/callback

# Using Cloudflare DNS
curl --dns-servers 1.1.1.1 -I https://auth.getbeton.ai/auth/v1/callback
```

## After DNS Cache is Flushed

Test the full OAuth flow:

1. Open browser in **incognito mode** (to avoid browser DNS cache)
2. Visit: https://trolley.getbeton.ai
3. Click "Sign in with Google"
4. Complete OAuth authorization
5. You should be redirected back and logged in

---

**Status:** DNS is fixed globally, just needs local cache flush! 🎉
