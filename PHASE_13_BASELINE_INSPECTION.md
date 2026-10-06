# LUMINA CYBER SOLUTION — PHASE 13 BASELINE INSPECTION

**Document Version:** 1.0.0  
**Date:** 2026-10-06  
**Auditor / Engineer:** Antigravity Agentic Engineer  
**Scope:** Phase 13 — Operations, Monitoring, Support & Diagnostics Center  

---

## 1. Executive Summary

A comprehensive forensic inspection of the codebase has been completed before writing Phase 13 operational code. The existing architecture is comprised of a Node.js + Express backend (`server.ts`) with native SQLite (`node:sqlite DatabaseSync` with WAL journal mode) for licensing authority and key management, and a React 19 + TypeScript + Vite frontend using multi-tenant partitioned browser storage (`safeStorage`). Phase 11.2.2 licensing authority (65/65 tests) and Phase 12 WhatsApp/Email communication center (66/66 tests) are completely operational and frozen.

The purpose of Phase 13 is to implement a unified, production-grade **Operations, Monitoring, Support & Diagnostics Center** without weakening tenant isolation, without leaking credentials or secrets, and without disrupting offline-first business point-of-sale workflows.

---

## 2. Forensic Subsystem Inventory

| Subsystem | Existing Implementation & Capabilities | Reusable Services & Modules | Missing Functionality for Phase 13 | Risk Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Architecture** | React 19 + TypeScript with tabs in `Sidebar.tsx`, `Header.tsx` quick actions, and modular views. | `Sidebar.tsx` (NavTab enum), `Header.tsx`, `SettingsView.tsx`, `DebugLogsModal.tsx`. | Dedicated `/admin/operations` view and `OperationsCenterView.tsx` with operational health cards. | Low: Add nav item & route cleanly without altering existing views. |
| **Backend Architecture** | Express server in `server.ts` running at port 3000. Handles licensing API, SMTP gateway, rate limiters, CORS. | Express app, `adminRateLimiter`, `sensitiveRateLimiter`, `standardRateLimiter`, `checkIdempotency`. | Public minimal health endpoint `GET /api/system/health`, secure authenticated `GET /api/system/diagnostics`, support report endpoint. | Medium: Must ensure unauthenticated health does not leak internal secrets. |
| **Database Architecture** | Server SQLite (`data_server_authority.sqlite`) with WAL mode (`PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`). | `getAuthorityDatabase()`, `DatabaseSync`, `PRAGMA integrity_check`, `PRAGMA wal_checkpoint`. | Deep SQLite integrity diagnostic, table counts, transaction health diagnostic service. | Low: Read-only PRAGMAs do not mutate state. |
| **Authentication & Roles** | Backend: `requireAdminAuth` (`x-admin-key`), `requireCommunicationAuth` (`x-staff-role`, `x-business-id`). Client: `StaffUser.role` (`Admin`, `Billing Staff`, `Designer`, `Operator`, `Accountant`). | Header auth parsers, role guards, `StorageService.getCurrentStaff()`. | Operations API auth middleware enforcing OWNER/ADMIN full, MANAGER status, STAFF basic, GUEST denied. | Low: Extend existing role checks consistently. |
| **Tenant Isolation** | `BusinessContextService.getCurrentBusinessId()`, client multi-tenant remapping, server `x-business-id` header binding. | `BusinessContextService`, `StorageService.getConfig()`. | Tenant-scoped diagnostic event storage and support reports. Zero cross-tenant leakage. | Critical: Must test cross-tenant retrieval = 403 / 404. |
| **Licensing Subsystem** | RS256 token verification, offline token evaluation, anti-clock-manipulation, server key rotation/revocation. | `LicenseService.validateLicense()`, `serverVerifyToken()`, `getActiveSigningKey()`. | Safe operational summary for Operations Center (plan, days left, status, device count) without keys. | Low: LicenseService already exports safe metadata. |
| **Communication Subsystem** | Native SMTP client, WhatsApp Web handoff, AES-256-GCM vault, credential isolation, retry queue. | `CredentialService`, `NativeSmtpClient.testConnection()`, `CommunicationRepository`, `CommunicationQueueService`. | Diagnostic status probe (is SMTP configured, is vault initialized, queue depth, failed counts). | Low: Probe vault status without decrypting plaintext. |
| **Printer & Peripherals** | Thermal printer configuration (`nil_thermal_printer_calib_v3`), `printerMode` ('thermal80', 'thermal58', 'a4'), calibration pattern. | `loadThermalConfig()`, `DEFAULT_THERMAL_CONFIG`, `PrintReceiptModal.tsx`. | Unified device health diagnostic (thermal, USB, Bluetooth, cash drawer, scanner) & safe test print action without customer data. | Low: Safe controlled test print banner. |
| **Backup Subsystem** | `CloudBackupService` (snapshots, auto daily check), `StorageService.exportDatabaseJSON()`, SQLite snapshots. | `CloudBackupService.getSnapshots()`, `StorageService.exportDatabaseJSON()`, `StorageService.importDatabaseJSON()`. | Automated backup health evaluation (freshness, age >24h warning, format validation, readable non-zero check, pre-restore guard). | High: Pre-restore must never silently overwrite without backup & confirmation. |
| **Error & Diagnostics** | `DebugLog` (`nil_printers_pos_debug_logs`) with basic level/category, Express generic 500 error handler. | `DebugLog`, `CredentialService.redactSecretsFromText()`, `CredentialService.maskSensitiveIdentifiers()`. | Structured error engine with event IDs, severity (`INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL`), deduplication fingerprinting, correlation IDs (`LCS-YYYYMMDD-XXXXXX`), bounded retention. | Medium: Unbounded logging risks memory leak; must cap retention at 200 events. |
| **Support Center & Report** | `DebugLogsModal.tsx` provides log search and export. | `DebugLogsModal`, `CredentialService.sanitizeForLogging()`. | System Support Center, one-click Sanitized Support Report (JSON/HTML) with mandatory secret/PII scrub. | Critical: Must pass `OPS-SEC-001` through `010` (no passwords, master keys, tokens, signing keys). |
| **Observability & Alerts** | Basic log alerts and badges on sidebar. | Badge system in `Sidebar.tsx`. | Lightweight operational alert engine (stale backup, low storage, integrity failure, printer offline, queue errors). | Low: Pure evaluation rules over diagnostic state. |

---

## 3. Reusable Modules and Services

1. **`CredentialService` (`src/services/communication/credentialService.ts`):**
   - `redactSecretsFromText(text: string)`: Masks passwords, tokens, API keys in arbitrary strings.
   - `maskSensitiveIdentifiers(text: string)`: Masks Indian citizen Aadhaar and PAN numbers.
   - `sanitizeForLogging(obj: any)`: Deep recursive object scrubbing of secret keys.
   - `hasSmtpPassword(businessId)`: Validates credential existence without decrypting or exposing plaintext.
2. **`LicenseService` (`src/services/licenseService.ts`):**
   - `validateLicense()`: Supplies structured license status, days remaining, entitlements, device limit.
3. **`CloudBackupService` (`src/services/cloudBackup.ts`):**
   - Snapshot inspection, size formatting, backup timestamp verification.
4. **`StorageService` (`src/services/storage.ts`):**
   - Safe multi-tenant storage, export/import JSON methods, debug logging.
5. **`getAuthorityDatabase()` (`src/server/db.ts`):**
   - Native SQLite access for running `PRAGMA integrity_check;`, `PRAGMA journal_mode;`, and license counts.

---

## 4. Gaps and Missing Functionality

1. **Backend Operations & Health Endpoints (`src/server/operations.ts`):**
   - `GET /api/system/health`: Minimal unauthenticated public endpoint (status: HEALTHY / DEGRADED, uptime, timestamp).
   - `GET /api/system/diagnostics`: Authenticated, role-gated endpoint reporting deep application, database integrity, storage, licensing, and communication status.
   - `POST /api/system/printer/test`: Controlled test print job generating standardized test output without customer PII.
   - `POST /api/system/support-report`: Scrubbed, bounded JSON support report with correlation ID and zero secret leakage.
2. **Structured Error Diagnostic Engine (`src/services/operations/diagnosticsService.ts`):**
   - Fingerprinted error grouping (deduplication with occurrence count, first seen, last seen).
   - Correlation IDs formatted as `LCS-YYYYMMDD-XXXXXX`.
   - Bounded event retention (maximum 200 items in memory/storage).
3. **Backup Health Checker (`src/services/operations/backupHealthService.ts`):**
   - Computes backup age in hours.
   - Flags WARNING / ACTION REQUIRED if backup is older than 24 hours or missing.
   - Verifies backup snapshot integrity (valid JSON, expected fields, positive byte size).
   - Safe pre-restore verification guard (creates emergency backup before restore, requires explicit confirmation).
4. **Peripheral Diagnostic Service (`src/services/operations/deviceDiagnosticsService.ts`):**
   - Status reporting for thermal printer, USB printer, Bluetooth printer, cash drawer, and barcode scanner.
   - Controlled test print template.
5. **Operational Alert Engine:**
   - Evaluates system state against defined alert rules (backup stale, low storage, database integrity, offline queue).
6. **Frontend Operations Center (`src/components/operations/OperationsCenterView.tsx`):**
   - Accessible via Sidebar (`operations` tab) or URL `/admin/operations`.
   - 10-second comprehension cards: Application, Database, License, Network, Backup, Communication, Printer, Storage.
   - "Attention Required" section with plain-language guidance.
   - Quick Action buttons: Run Diagnostics, Test Printer, Check Backup, Test Communication, Generate Support Report.
7. **Automated Verification Suite (`tests/operations_verification.ts`):**
   - Comprehensive tests for `OPS-HEALTH`, `OPS-TENANT`, `OPS-AUTH`, `OPS-BACKUP`, `OPS-DEVICE`, `OPS-ERROR`, `OPS-SUPPORT`, `OPS-OFFLINE`, `OPS-SEC-001` through `010`, `OPS-PERF`.

---

## 5. Proposed Implementation Locations

- `src/types/operations.ts` — Type definitions for operational health, diagnostics, device status, structured errors, alerts, and support report.
- `src/server/operations.ts` — Server-side operations controller and Express routes (`/api/system/*`), middleware, rate limiters, and SQLite integrity inspector.
- `src/services/operations/diagnosticsService.ts` — Client-side diagnostic aggregation, error deduplication engine, correlation IDs, and operational alert evaluator.
- `src/services/operations/deviceDiagnosticsService.ts` — Device status checking and sanitized test-print formatter.
- `src/services/operations/backupHealthService.ts` — Backup age, integrity validation, and pre-restore safety guard.
- `src/components/operations/OperationsCenterView.tsx` — Commercial Operations & Diagnostics Center UI.
- `src/components/operations/SupportReportModal.tsx` — Modal displaying generated scrubbed support report with download/copy actions.
- `src/components/layout/Sidebar.tsx` — Add `operations` tab with shield/activity icon.
- `src/App.tsx` — Route `operations` tab to `OperationsCenterView`.
- `tests/operations_verification.ts` — Comprehensive automated test suite matching Phase 13 requirements.

---

## 6. Risk Controls & Mitigations

1. **Information Disclosure Prevention:** Public health check reveals ONLY high-level status (`HEALTHY` or `DEGRADED`) and application uptime. Detailed diagnostics require role authentication (`OWNER`, `ADMIN`, or `MANAGER`).
2. **Support Report Secret Scrubbing:** Strict multi-pass filter scrubs all passwords, tokens, private keys, master keys, and citizen identifiers before generating output (`OPS-SEC-001` to `010`).
3. **No False Health Status:** A failed optional dependency (such as disconnected printer) must mark `PRINTER: NOT CONFIGURED` or `WARNING`, without falsely claiming the entire application is dead or falsely reporting `HEALTHY`.
4. **Offline Resilience:** Offline network state is a normal, expected operating state for an offline-first POS workstation. Local billing remains available, and queued operations are preserved.
5. **No Destructive Restores:** Backup restore enforces strict operator confirmation, prior automatic snapshot, and structural validation.
6. **Zero Regression Guarantee:** Phase 11.2.2 (65/65) and Phase 12 (66/66) test suites must continue to pass 100% without modification.
