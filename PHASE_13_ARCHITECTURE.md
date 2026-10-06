# LUMINA CYBER SOLUTION — PHASE 13 ARCHITECTURE

**System:** Lumina Cyber Solution Commercial POS  
**Subsystem:** Operations, Monitoring, Support & Diagnostics Center  
**Version:** 1.0.0  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Architectural Overview

Phase 13 establishes a production-grade operational layer for LUMINA CYBER SOLUTION. The operations subsystem is engineered to make commercial workstations reliable, transparent, and serviceable in production retail environments without introducing security vulnerabilities, cross-tenant leaks, or performance overhead to offline point-of-sale operations.

```
+-----------------------------------------------------------------------------------+
|                           LUMINA OPERATIONS CENTER                                |
+-----------------------------------------------------------------------------------+
|  [OperationsCenterView.tsx] <---> [diagnosticsService.ts]                         |
|         |                                    |                                    |
|         v                                    v                                    |
|  [deviceDiagnosticsService.ts]      [backupHealthService.ts]                      |
+-----------------------------------------------------------------------------------+
                                       |
                       HTTPS / REST API (/api/system/*)
                                       |
+-----------------------------------------------------------------------------------+
|                        BACKEND OPERATIONS CONTROLLER                              |
|                           (src/server/operations.ts)                              |
+-----------------------------------------------------------------------------------+
| - GET  /api/system/health         (Public, Minimal Liveness & Readiness)          |
| - GET  /api/system/diagnostics    (Auth & Role-Gated Deep Diagnostics)            |
| - POST /api/system/printer/test   (Controlled Test Print Pattern)                 |
| - POST /api/system/support-report (Multi-Pass Scrubbed Diagnostic Report)         |
| - GET  /api/system/errors         (Tenant-Scoped Deduplicated Errors)             |
| - POST /api/system/errors         (Fingerprinted Structured Error Ingestion)      |
+-----------------------------------------------------------------------------------+
       |                          |                             |
       v                          v                             v
[SQLite Authority DB]    [Credential Vault]            [Communication Queue]
- PRAGMA integrity_check - Existence Probe Only       - Queue Depth Inspection
- WAL Journal Status     - Plaintext Never Decrypted  - Failed Retry Counts
- Table Metrics          - Zero Secret Disclosures     - Tenant-Scoped Stats
```

---

## 2. Core Architectural Pillars

### 2.1 Multi-Tier Health Check System
The health check architecture separates **Liveness**, **Readiness**, and **Dependency Diagnostics**:
1. **Liveness (`/api/system/health`):**
   - Returns HTTP 200 with minimal public status (`HEALTHY` / `DEGRADED`), server uptime, and timestamp.
   - Does NOT disclose sensitive environment details, paths, database internals, or configuration keys.
2. **Readiness & Deep Diagnostics (`/api/system/diagnostics`):**
   - Authenticated endpoint protected by role authorization (`OWNER`, `ADMIN`, `MANAGER`).
   - Evaluates:
     - Application runtime: Version, Node environment, memory RSS/heap, uptime.
     - Database health: Native SQLite `PRAGMA integrity_check(1)`, `PRAGMA journal_mode`, table row counts, file size.
     - Storage health: Local disk estimates and attachment consumption.
     - Licensing summary: Plan name, active status, days remaining, enrolled devices (without revealing signing keys).
     - Communication subsystem: Vault initialization status, SMTP configured flag (without revealing passwords), queue depth.

### 2.2 Device & Peripheral Diagnostics (`src/services/operations/deviceDiagnosticsService.ts`)
Hardware peripherals in commercial POS environments operate under intermittent states:
- **Evaluated Peripherals:** Thermal Receipt Printer (80mm / 58mm), Standard USB Printer, Bluetooth Printer, Cash Drawer (RJ11/12 kick), Barcode Scanner (HID).
- **Status Categories:** `READY`, `WARNING`, `NOT CONFIGURED`, `OFFLINE`, `ERROR`.
- **Controlled Test Print Pattern:**
  - Standardized ticket with zero customer data or transaction PII.
  - Generates diagnostic proof of receipt alignment, timestamp, and device health.

### 2.3 Backup Health & Safe Restore Guard (`src/services/operations/backupHealthService.ts`)
- **Freshness Evaluation:** Evaluates timestamp of latest backup. If backup age exceeds 24 hours, flags `WARNING` (`ACTION REQUIRED: Your latest backup is older than 24 hours`).
- **Structural Integrity Validation:** Verifies backup file existence, valid JSON structure, required root schema attributes (`version`, `timestamp`, `data`), and positive byte size.
- **Pre-Restore Guard:**
  - Prevents accidental or silent overwrites of production data.
  - Enforces explicit operator confirmation (`confirmReplacement: true`).
  - Automatically captures an emergency pre-restore snapshot (`pre_restore_snapshot_*.json`) before executing data replacement.

### 2.4 Structured Error Engine & Fingerprinted Deduplication (`src/services/operations/diagnosticsService.ts`)
- **Structured Error Model:** Every diagnostic error contains `eventId`, `timestamp`, `severity` (`INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL`), `subsystem`, `safeMessage`, `correlationId`, `status`, and `occurrenceCount`.
- **Deduplication:** High-frequency repeated errors (e.g., repeated SMTP socket timeouts) are fingerprinted using `subsystem:code:message`. Instead of flooding log tables, the system increments `occurrenceCount` and updates `lastSeen` timestamp.
- **Correlation IDs:** Standardized format `LCS-YYYYMMDD-XXXXXX` generated per request/diagnostic event to link frontend events with backend logs without leaking credentials.
- **Bounded Retention:** In-memory and persisted diagnostic logs enforce a FIFO limit of 200 events to prevent memory leaks and uncontrolled disk expansion.

### 2.5 Operational Alert Engine
Evaluates live system telemetry to generate actionable operational alerts:
- **Backup Stale Alert:** `WARNING` when latest backup is older than 24 hours.
- **Low Storage Alert:** `WARNING` when available browser storage is under 15%.
- **Database Integrity Alert:** `CRITICAL` when SQLite integrity check fails.
- **Printer Disconnected Alert:** `WARNING` when primary configured printer is unreachable.
- **Communication Queue Alert:** `ERROR` when dead-letter retry count exceeds threshold.

### 2.6 Scrubbed Support Report Generator
Provides a one-click diagnostic report generator for commercial support triage:
- Generates structured payload: Application metadata, Database health, Storage health, Hardware diagnostics, Connectivity status, License overview, Sanitized recent errors, and Security validation declaration.
- Multi-pass sanitization guarantees zero secret leakage:
  - Multi-regex redaction of passwords, tokens, API keys, private keys, and master vault keys.
  - Redaction of Indian citizen identifiers (PAN, Aadhaar).
  - Strict payload size bounding (< 50 KB).

---

## 3. Component & Service Map

| Component / File | Role & Functionality |
| :--- | :--- |
| `src/types/operations.ts` | Strongly-typed interfaces for health, diagnostics, devices, errors, alerts, and support reports. |
| `src/server/operations.ts` | Backend Express controller mounting `/api/system/*`, SQLite PRAGMA inspector, and rate limiters. |
| `src/services/operations/diagnosticsService.ts` | Client telemetry aggregator, alert evaluator, error deduplication engine, and scrubbed support report builder. |
| `src/services/operations/deviceDiagnosticsService.ts` | Hardware peripheral status evaluator and safe test-print generator. |
| `src/services/operations/backupHealthService.ts` | Backup freshness checker, snapshot structural validator, and pre-restore safety guard. |
| `src/components/operations/OperationsCenterView.tsx` | Operator UI with 8 health cards, Attention Required alert cards, and quick actions. |
| `src/components/operations/SupportReportModal.tsx` | Support report preview dialog with copy-to-clipboard and JSON file download. |
| `tests/operations_verification.ts` | Automated verification suite covering 39 test cases across all Phase 13 operational requirements. |

---

## 4. Preservation of Frozen Subsystems

1. **Phase 11.2.2 Licensing Architecture:**
   - Ed25519 / RS256 authority database, key rotation, anti-clock manipulation, and signature verification remain completely intact and frozen.
   - Operations Center queries license metadata via existing `LicenseService.validateLicense()`; raw cryptographic private keys are never exposed.
2. **Phase 12 Credential Vault & Communication Center:**
   - AES-256-GCM vault, PBKDF2 key derivation, station master secret, and SMTP gateway remain completely intact and frozen.
   - Operations Center probes vault status via `hasSmtpPassword()` without decrypting vault ciphertext or revealing plaintext credentials.
