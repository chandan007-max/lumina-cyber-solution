# LUMINA CYBER SOLUTION — PHASE 13 SUPPORT GUIDE

**Audience:** Technical Support Engineers, Escalation Leads, Field DevOps  
**System:** Lumina Cyber Solution Commercial POS  
**Version:** 1.0.0  

---

## 1. Triage Workflow for Support Engineers

When a store operator contacts support reporting an issue, follow this standardized triage workflow:

```
Step 1: Request Support Report
   - Instruct operator: Navigate to "Operations" -> click "Generate Support Report"
   - Ask operator to copy or download the JSON report and attach it to the ticket.

Step 2: Inspect Correlation ID
   - Note correlation ID (format: LCS-YYYYMMDD-XXXXXX).
   - Match correlation ID against error logs to pinpoint the exact sequence of events.

Step 3: Analyze Subsystem Diagnostic Flags
   - Review Application, Database, License, Backup, Communication, and Devices sections.
   - Verify that all security sanitization checks passed (zero secrets detected).
```

---

## 2. Analyzing the Support Diagnostic Report

A valid support report has the following structure:

```json
{
  "reportId": "LCS-20261006-A1B2C3",
  "generatedAt": "2026-10-06T18:45:00.000Z",
  "application": {
    "version": "1.0.0",
    "environment": "production",
    "uptimeSeconds": 14205
  },
  "database": {
    "status": "HEALTHY",
    "type": "SQLite (WAL)",
    "integrity": "ok",
    "sizeBytes": 1048576
  },
  "license": {
    "status": "ACTIVE",
    "plan": "LUMINA COMMERCIAL ENTERPRISE",
    "daysRemaining": 358
  },
  "connectivity": {
    "online": true,
    "lastOnline": "2026-10-06T18:44:50.000Z"
  },
  "devices": {
    "primaryPrinter": "thermal80",
    "printerStatus": "READY"
  },
  "backup": {
    "status": "HEALTHY",
    "ageHours": 4.2
  },
  "recentErrors": [],
  "securityCheck": {
    "secretsDetected": false,
    "piiMasked": true
  }
}
```

### Key Triage Checkpoints:
1. **`securityCheck.secretsDetected`:** Must be `false`. If `true`, the report was rejected by the sanitization filter.
2. **`database.integrity`:** Must be `"ok"`. If it contains error strings, schedule an off-peak SQLite recovery.
3. **`backup.ageHours`:** If > 24 hours, instruct the operator to trigger a manual backup before troubleshooting further.
4. **`recentErrors`:** Contains deduplicated error entries with `safeMessage`, `occurrenceCount`, and timestamps.

---

## 3. Remote Support Policy

Lumina Cyber Solution follows a **Zero-Backdoor Principle**:
- **Status:** `REMOTE SUPPORT: NOT CONFIGURED`
- **Policy:** The POS software contains NO permanent remote access agents, hidden SSH tunnels, or hardcoded support credentials.
- **Assistance Method:** All remote support must occur via verified screen-sharing tools initiated by the store operator or through authorized offline export analysis.

---

## 4. Safe Database Recovery Guidance

If database corruption is detected (`database.integrity !== 'ok'`):
1. **DO NOT** delete the `.sqlite` or `.sqlite-wal` files.
2. Ensure the POS application process is stopped.
3. Make an offline copy of `data_server_authority.sqlite`, `data_server_authority.sqlite-wal`, and `data_server_authority.sqlite-shm`.
4. Run SQLite CLI command:
   ```bash
   sqlite3 data_server_authority.sqlite ".recover" | sqlite3 data_recovered.sqlite
   ```
5. Test the recovered database against `tests/operations_verification.ts` before placing it back into production.
