# LUMINA CYBER SOLUTION — ARCHITECTURE INVENTORY & CAPABILITY MAP

**Phase 14 Commercial Production Readiness**

---

## 1. System Inventory & Existing Services Map

| Subsystem | Primary Implementation | Storage / Engine | Architectural Status | Phase 14 Action |
| :--- | :--- | :--- | :--- | :--- |
| **Licensing Authority** | `src/services/licenseService.ts`<br>`src/server/db.ts` | SQLite (`licenses`, `devices`, `signing_keys`) | Phase 11.2.2 Asymmetric RS256 verified | **REUSE AS-IS**. Bridge to commercial subscription lifecycle. |
| **Communication Center** | `src/services/communication/`<br>`src/server/smtpClient.ts` | SQLite (`operational_audit_events`) + safeStorage | Phase 12 STARTTLS & Email Gateway verified | **REUSE AS-IS**. Use for commercial notification triggers. |
| **Operations & Monitoring** | `src/services/operations/`<br>`src/server/operations.ts` | SQLite (`operational_audit_events`, WAL) | Phase 13 Diagnostics & Scrubbing verified | **REUSE AS-IS**. Extend for commercial event auditing. |
| **Backup & Health** | `src/services/operations/backupHealthService.ts` | SQLite checkpoints + `CloudBackupService` | Phase 13 Application-level rollback compensation | **REUSE AS-IS**. Expose migration safety snapshot hooks. |
| **POS Business Operations** | `src/services/storage.ts`<br>`src/services/businessConfig.ts` | Browser `safeStorage` (localStorage + mem fallback) | Client POS (invoices, customers, jobs, expenses) | **MAINTAIN**. Ensure safe tenant isolation. |
| **Server Application** | `server.ts` | Express.js + Vite middleware mode | Unified API + Frontend host | **EXTEND**. Add environment configuration & migration engine. |

---

## 2. Identified Capabilities vs Missing Commercial Requirements

| Capability | Current State | Missing Commercial Element | Phase 14 Implementation Plan |
| :--- | :--- | :--- | :--- |
| **Production Configuration** | Dispersed `process.env` calls with ad-hoc defaults | No centralized environment profile (DEV / TEST / STAGING / PROD) or schema validation | Create `src/server/config.ts` with strict Zod/structural validator & environment segregation. |
| **Startup Validation** | Basic DB connection fallback | No preflight check verifying writable paths, required ports, and security flags | Create `validateStartupEnvironment()` running fail-safe preflight checks before server listen. |
| **Database Migrations** | Imperative `CREATE TABLE IF NOT EXISTS` | No migration history table, ordering, idempotency, or rollback recording | Create SQLite migration engine (`src/server/migrationEngine.ts`) with `schema_migrations` tracking. |
| **Commercial Onboarding** | Ad-hoc business profile wizard | No 11-step complete onboarding lifecycle or transactional tenant creation safety | Implement `CommercialOnboardingService` & clean multi-step UI workflow with transactional rollback. |
| **Subscription Lifecycle** | Basic license durations | No formal state machine (TRIAL, ACTIVE, PAST_DUE, GRACE, SUSPENDED, EXPIRED, CANCELLED) | Create `CommercialSubscriptionService` with deterministic transitions & access control matrix. |
| **Plan Management** | Hardcoded plan types | No centralized plan definition supporting pricing, billing periods, and feature entitlements | Create centralized plan registry with feature gating. |
| **Billing Lifecycle** | Basic POS customer invoices | No subscription/commercial billing invoices, manual payment logging, receipts, or adjustments | Create `CommercialBillingService` with explicit `MANUAL PAYMENT` recording & refund tracking. |
| **Customer Administration** | Client-only customer lists | No multi-tenant commercial account management console | Create admin management console with tenant lifecycle actions (suspend, reactivate, offboard). |
| **Support Center & SLA** | Generic feedback view | No ticket lifecycle (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED) with priority SLA | Implement `SupportTicketService` with SLA tracking and sanitized diagnostic attachment. |
| **Update & Version Control** | Static package version | No schema version tracking, update compatibility checks, or disaster recovery runbook | Author formal maintenance/update protocol & comprehensive disaster recovery runbook. |
| **Offboarding** | No formal offboarding | No safe tenant decommission, final backup export, license deactivation, or data retention | Create safe customer offboarding workflow with audit preservation. |

---

## 3. Duplication & Anti-Pattern Analysis
1. **No Duplicate Licensing Engine:** Commercial subscription states will reference existing Phase 11.2.2 license IDs. License issuance remains strictly governed by RS256 token authority.
2. **No Duplicate Credential Vault:** SMTP and gateway secrets remain strictly within Phase 12 vault architecture.
3. **No Duplicate Audit Storage:** Commercial events will append to `operational_audit_events` via existing Phase 13 durable append-only logger.
4. **Honest Billing Labels:** All offline/manual payments will be explicitly tagged `MANUAL PAYMENT` with no false payment gateway simulations.
