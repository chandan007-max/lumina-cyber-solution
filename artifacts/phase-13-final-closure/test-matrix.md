# TEST MATRIX — FINAL EVIDENCE CHALLENGE

| Test ID | Test Name | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :---: |
| RESTORE-A2 | Normal Success Restore Verification | beforeHash (b3340230570be87a44ee4f36a5665f70522b85... | allowed: true, cust: 10, inv: 10, jobs: 5, matches... | **PASS** |
| RESTORE-A3 | Caught Exception Recovery (Application-Level Rollback Compensation) | Exception caught, inMemoryRollbackSnapshot restore... | rollbackExecuted: true, rolledBackSuccessfully: tr... | **PASS** |
| RESTORE-A4 | Real Process Crash / Durable Pre-Restore Snapshot Survival | Process killed abruptly; In-memory state terminate... | childExitStatus: 137, crashPhase: mid-destructive-... | **PASS** |
| RESTORE-TX-VS-COMP | Database Transaction Rollback vs Application Rollback Compensation | SQLite supports true SQL ROLLBACK (0 rows); POS St... | SQLite ROLLBACK rowCount: 0 (True DB Rollback); St... | **PASS** |
| AUDIT-C1 | Audit Schema Inspection | Schema contains audit_event_id, timestamp, busines... | Found 11 columns: id, audit_event_id, timestamp, b... | **PASS** |
| AUDIT-C2 | Audit API Mutation Rejection (HTTP 405 Method Not Allowed) | HTTP 405 Method Not Allowed with IMMUTABLE_AUDIT_L... | PUT: 405, PATCH: 405, DELETE: 405... | **PASS** |
| AUDIT-C5 | Audit Immutability Classification Verification | Accurately classified as Application/API append-on... | API rejects mutations (405); Direct SQL is classif... | **PASS** |
| AUDIT-TENANT | Audit Tenant Isolation (Strict Cross-Tenant Denial) | Tenant A receives Tenant A data; Cross-tenant quer... | Tenant A self-query: 200 (1 records), Cross-tenant... | **PASS** |
| AUDIT-ROLE | Audit Authorization Role Matrix | Unauthenticated: 401; Guest/Billing/Staff: 403; Ma... | Role matrix verification: ALL ROLES MATCH EXPECTED... | **PASS** |
| HEALTH-D1 | Normal Health & Probe Semantics (Live vs Ready vs Diagnostics) | Liveness: 200 liveness=true; Readiness: 200 readin... | Live: 200 (true), Ready: 200 (true), Diag: 200... | **PASS** |
| HEALTH-D2 | Liveness vs Readiness Degradation Isolation (Simulated Database Failure) | Liveness returns 200 (process alive); Readiness re... | Live: 200 (liveness=true); Ready: 503 (readiness=f... | **PASS** |
| HEALTH-D3 | Optional Dependency Classification (Printer & Cloud Offline) | Optional peripherals (printer, cloud) do NOT trigg... | Readiness remains 200; local POS offline billing o... | **PASS** |
| OFFLINE-E1 | Offline Storage Secret Scan (Zero Privileged Secrets in localStorage) | Zero privileged secrets or unencrypted credentials... | Storage scan: CLEAN (0 privileged secrets)... | **PASS** |
| OFFLINE-E2 | Offline Storage Corruption Resilience | Application catches JSON syntax errors gracefully ... | Malformed JSON safely handled: true... | **PASS** |
| PERF-REPRODUCE | Performance Benchmark 5-Run Reproduction | Accurately measured p50/p95/p99; no material opera... | Base p50: 1.30ms, Conc p50: 1.22ms... | **PASS** |
| RATE-VERIFY | Rate Limiting & Tenant-Scoped Isolation | Tenant 1 throttled at req 41 (429); Tenant 2 unaff... | Req 40: 200, Req 41: 429 (Retry-After: 59s), Tenan... | **PASS** |
| SUPPORT-SANITIZER | Extended Support Report 15-Pattern Secret Sanitization | Zero secret strings present in output JSON; Unnece... | Sanitization result: CLEAN (0 secrets leaked)... | **PASS** |
| SECRET-SCAN | Repository-Wide Privileged Secrets Scan | 0 production secrets detected across entire codeba... | Scan output: CLEAN (0 production secrets detected)... | **PASS** |
| BUILD-VERIFY | Production Build Verification | Vite production bundle builds with 0 errors... | Build status: SUCCESS (Exit 0)... | **PASS** |
| LINT-VERIFY | TypeScript Static Type & Lint Verification | TypeScript compiler passes with 0 type errors... | Lint status: SUCCESS (Exit 0)... | **PASS** |
| AUDIT-VERIFY | Dependency Vulnerability Audit | 0 vulnerabilities reported in project dependencies... | Audit status: SUCCESS (0 vulnerabilities)... | **PASS** |
| REGRESS-P11 | Phase 11.2.2 License Authority Regression Gate | All 65 tests PASS with zero regressions... | Phase 11.2.2 status: PASS (65/65)... | **PASS** |
| REGRESS-P12 | Phase 12 Communication Center Regression Gate | All 66 tests PASS with zero regressions... | Phase 12 status: PASS (66/66)... | **PASS** |
| REGRESS-P13-CORE | Phase 13 Operations Core Regression Gate | All 39 tests PASS with zero regressions... | Phase 13 Core status: PASS (39/39)... | **PASS** |
| REGRESS-P13-MICRO | Phase 13 Micro-Closure Regression Gate | All 21 tests PASS with zero regressions... | Phase 13 Micro-Closure status: PASS (21/21)... | **PASS** |
