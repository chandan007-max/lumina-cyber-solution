# RATE LIMITING FORENSIC RESULTS

- Window Policy: 40 requests per 60-second sliding window
- Limiter Keying: `${tenantId}:${ip}` (Tenant-scoped isolation)
- Tenant 1 Request 40: HTTP 200
- Tenant 1 Request 41: HTTP 429 (Throttled with Retry-After: 59s)
- Tenant 2 Concurrent Request: HTTP 200 (Allowed - No cross-tenant DoS)
- Architecture Note: Rate limiting is instance-local (in-memory sliding window) and resets on process restart.