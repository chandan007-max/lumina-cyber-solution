# PHASE-16-RELEASE-CANDIDATE
## Lumina Cyber Solution — Official v1.0.0 Release Candidate Specification

**Product Identity:** Cyber Café / Computer Center POS & Business Management Software  
**Release Candidate ID:** `RC-v1.0.0-2026.10-FINAL`  
**Build ID:** `LCS-v1.0.0-PROD-BUILD-01`  
**Authoritative Version:** `v1.0.0`  
**Release Date:** October 2026  
**Status:** FROZEN — ZERO UNTRACKED CHANGES PERMITTED  

---

### 1. Authoritative Release Candidate Fingerprint

| Component / Layer | Specification / Version | Integrity / Verification Check |
| :--- | :--- | :--- |
| **Product Version** | `1.0.0` | Matches `package.json`, UI headers, and release manifests |
| **Build Target** | Production Client & Server Distribution | Generated via `vite build` (`dist/` bundle) |
| **Frontend Framework** | React 19.0.1 + TypeScript 7.0.2 | Tailwind CSS v4, Motion 12, Recharts 3.10 |
| **Server Framework** | Express 4.21.2 | Zero external debug dependencies |
| **Database Engine** | Embedded SQLite 3.45 via `node:sqlite` / `better-sqlite3` | WAL Journal Mode, Foreign Keys enforced |
| **Database Migration Version** | Migration Schema #5 | Deterministic, tracked in `schema_migrations` |
| **License Authority** | Phase 11.2.2 Ed25519 Asymmetric Authority | Zero private keys shipped in client artifacts |
| **Credential Vault** | Phase 12 AEAD AES-256-GCM Vault | Isolated, encrypted at rest with PBKDF2/SHA-256 |
| **Operations Engine** | Phase 13 Forensic Operations & Diagnostics | Secret scrubber, immutable audit trail |
| **Commercial Core** | Phase 14 Multi-Tenant Subscription Engine | 4-tier SLA support engine, manual billing ledger |
| **Cyber Workstation Engine** | Phase 15 Computer Session Subsystem | Live timers, crash state reconciliation |
| **Runtime Environment** | Node.js >= 20.0.0 / Windows 10/11 x64 | Zero cloud vendor lock-in; offline-first |

---

### 2. Enabled Production Feature Flags

| Feature Flag | State | Operational Behavior |
| :--- | :---: | :--- |
| `FEATURE_OFFLINE_FIRST_MODE` | `ENABLED` | POS billing, computer timers, and receipts run 100% autonomously without internet |
| `FEATURE_HONEST_PRINT_PIPELINE`| `ENABLED` | Software strictly distinguishes driver dispatch from verified physical paper output |
| `FEATURE_DIAGNOSTIC_REDACTION` | `ENABLED` | Diagnostic support dumps scrub passwords, Aadhaar, PAN, and Bearer tokens |
| `FEATURE_DURABLE_AUDIT_LOG` | `ENABLED` | High-security append-only operational audit trail in SQLite WAL mode |
| `FEATURE_SAFE_RESTORE_ROLLBACK` | `ENABLED` | Mandatory pre-restore snapshot with atomic rollback on corrupted archive injection |

---

### 3. Documented Release Limitations

1. **Workstation Lock Screen:** Session timers manage screen locking within the application. Complete Windows desktop lockout requires Windows Kiosk Mode or a companion background service.
2. **Physical Paper Output Telemetry:** Print command generation and driver dispatch are verified. Physical paper feeding confirmation requires human observation.
3. **Offline Multi-Counter Synchronization:** Concurrent offline edits to the exact same workstation or customer resolve via Last-Write-Wins.
4. **Payment Gateways:** Third-party cloud payment gateway SDKs are not bundled in v1.0.0; cash, UPI QR codes with reference IDs, and manual bank settlements are fully supported.
