# LUMINA CYBER SOLUTION — PHASE 13 SECURITY MODEL

**System:** Lumina Cyber Solution Commercial POS  
**Subsystem:** Operations & Diagnostics Security  
**Version:** 1.0.0  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Security Objectives & Threat Model

The Operations, Monitoring, Support & Diagnostics Center is designed to eliminate information-disclosure risks, protect multi-tenant boundaries, and prevent denial-of-service or privilege escalation attacks against commercial point-of-sale workstations.

### 1.1 Protected Assets
1. **Station Master Vault Secret (`LUMINA_VAULT_MASTER_KEY`):** Must never appear in any diagnostic response, log file, support report, or client state.
2. **License Authority Private Signing Keys:** Must remain strictly inside the backend database / HSM environment.
3. **Tenant Credential Vault Plaintext & Ciphertext:** SMTP passwords, API keys, and vault ciphertext must never be dumped into diagnostic reports.
4. **Customer PII & Citizen Identifiers:** Indian PAN numbers and Aadhaar numbers must be automatically masked.
5. **Tenant Isolation:** Diagnostics for Business A must never be accessible to Business B.

### 1.2 Threat Scenarios & Mitigations

| Threat | Description | Implemented Mitigation |
| :--- | :--- | :--- |
| **T1: Public Info Disclosure** | Unauthenticated attacker queries `/api/system/*` to discover server paths, software versions, or database internals. | `/api/system/health` exposes only `{ status: "HEALTHY", uptime, timestamp }`. Deep diagnostics (`/api/system/diagnostics`) require authentication and role verification. |
| **T2: Privilege Escalation** | Low-privilege staff user (e.g. `Billing Staff` or `Operator`) attempts to access administrative system diagnostics. | Backend middleware `requireOpsRole(['OWNER', 'ADMIN', 'MANAGER'])` blocks unauthorized roles with HTTP 403 Forbidden. |
| **T3: Cross-Tenant Data Leak** | Malicious tenant sends requests with spoofed `x-business-id` to view another tenant's diagnostic events or errors. | Backend enforces tenant binding on all operational errors and diagnostics. Requests from Tenant B querying Tenant A records return empty/isolated results. |
| **T4: Support Report Secret Leakage** | Operator shares generated diagnostic report with support, inadvertently leaking SMTP passwords, tokens, or private keys. | Multi-pass recursive sanitization (`OPS-SEC-001` through `OPS-SEC-008`) scrubs all passwords, tokens, keys, and citizen identifiers before report serialization. |
| **T5: Diagnostic Denial of Service** | Rapid repeated calls to heavy SQLite integrity checks or support report generation exhaust server CPU/memory. | Dedicated rate limiters (`opsStandardLimiter`, `opsDeepLimiter`) restrict deep diagnostics to 15 req/min and standard endpoints to 60 req/min. |
| **T6: Accidental Production Overwrite** | Operator triggers restore from backup without realizing current live data will be replaced. | Pre-restore safety guard requires explicit replacement confirmation and automatically captures an emergency snapshot before proceeding. |

---

## 2. Mandatory Security Verification Controls (`OPS-SEC-001` to `OPS-SEC-010`)

All 10 security verification controls have been automated in `tests/operations_verification.ts` and pass with 100% compliance:

```
[PASS] OPS-SEC-001: SMTP password absent from support report
       Evidence: Injected SMTP password string 'smtp_secret_pass_999' is completely absent from support report.

[PASS] OPS-SEC-002: Vault master key absent from support report
       Evidence: Master key string 'LUMINA_VAULT_MASTER_KEY' or vault key assignment is completely absent.

[PASS] OPS-SEC-003: License private signing key absent
       Evidence: License private key header '-----BEGIN RSA PRIVATE KEY-----' is absent from diagnostics.

[PASS] OPS-SEC-004: Authorization tokens absent
       Evidence: Bearer tokens, JWT tokens, and session credentials are scrubbed from diagnostic reports.

[PASS] OPS-SEC-005: API keys absent
       Evidence: Admin keys and API keys are scrubbed and replaced with '[REDACTED]'.

[PASS] OPS-SEC-006: Cross-tenant diagnostic access denied
       Evidence: Tenant B querying Tenant A diagnostic errors retrieves 0 records (isolated).

[PASS] OPS-SEC-007: PAN/Aadhaar masking preserved
       Evidence: Aadhaar '1234 5678 9012' -> 'XXXX-XXXX-9012'; PAN 'ABCDE1234F' -> 'ABCDE****F'.

[PASS] OPS-SEC-008: Raw stack traces cannot leak secrets
       Evidence: Stack traces containing passwords or keys are scrubbed via redactSecretsFromText().

[PASS] OPS-SEC-009: Support report payload size bounded
       Evidence: Support report payload is under 50,000 bytes (actual: ~4,200 bytes).

[PASS] OPS-SEC-010: Unauthorized diagnostic endpoint access denied
       Evidence: Unauthenticated requests to /api/system/diagnostics receive HTTP 401; GUEST role receives 403.
```

---

## 3. Rate Limiting Specifications

The operations layer deploys two memory-backed rate limiters in `src/server/operations.ts`:

1. **Standard Operations Limiter (`opsStandardLimiter`):**
   - Applies to: `GET /api/system/health`, `GET /api/system/errors`, `POST /api/system/errors`, `POST /api/system/printer/test`.
   - Window: 60 seconds.
   - Max Requests: 60 requests per IP/station.
2. **Deep Diagnostic Limiter (`opsDeepLimiter`):**
   - Applies to: `GET /api/system/diagnostics`, `POST /api/system/support-report`.
   - Window: 60 seconds.
   - Max Requests: 15 requests per IP/station.
   - Prevents abuse of SQLite `PRAGMA integrity_check` and memory-intensive diagnostic serializations.

---

## 4. Tenant Isolation & Context Binding

Operations endpoints strictly require tenant identification:
- Header: `x-business-id` (validated against alphanumeric format).
- Header: `x-staff-role` (validated against permissible role enums).
- Header: `x-admin-key` (verified against authority admin key for elevated diagnostic requests).

Tenant data isolation guarantees:
1. Operational errors ingested via `POST /api/system/errors` are stored with the request's `businessId`.
2. Queries via `GET /api/system/errors` filter strictly by the requesting tenant's `businessId`.
3. Support reports generated via `POST /api/system/support-report` bind only to the requesting tenant's configuration and records.
4. No cross-tenant metadata or error occurrences are shared across business accounts.
