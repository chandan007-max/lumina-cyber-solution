# PHASE-15-ROLE-ACCEPTANCE
## Staff Roles & RBAC Privilege Escalation Defense Acceptance Report

**Test Objective:** Validate cyber café staff roles, ensure appropriate functional restrictions, and verify that staff/billing users cannot execute administrative, financial, backup, or diagnostic commands.

---

### 1. Cyber Café Role Matrix

| Capability / Resource | GUEST | BILLING STAFF | STAFF / OPERATOR | MANAGER | ADMIN | OWNER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Start/Stop Workstation Session** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create POS Invoice** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Accept Cash / Settle Payment** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Print Thermal Receipt** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Service Pricing** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Void / Refund Completed Invoice**| ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **View Profit / Financial Summary**| ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Create / Modify Staff Accounts**| ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Generate Support Tech Report** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Trigger Database Backup** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Trigger Database Restore** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage License / Subscription** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### 2. Privilege Escalation Penetration Testing

Forensic test results against unauthorized API invocations:

| Attack Vector | Attacker Role | Target Operation | HTTP Result | Defense Status |
| :--- | :--- | :--- | :---: | :---: |
| **Direct API Call to Admin Backup** | `STAFF` | `POST /api/system/backup` | `HTTP 403 Forbidden` | **BLOCKED** |
| **Direct API Call to Safe Restore** | `MANAGER` | `POST /api/system/restore` | `HTTP 403 Forbidden` | **BLOCKED** |
| **Direct API Call to Diagnostics** | `GUEST` | `GET /api/system/diagnostics` | `HTTP 403 Forbidden` | **BLOCKED** |
| **Direct API Call to Support Report**| `BILLING_STAFF` | `POST /api/system/support-report`| `HTTP 403 Forbidden` | **BLOCKED** |
| **Audit Log Deletion / Tamper** | `ADMIN` | `DELETE /api/audit-logs` | `HTTP 405 Method Not Allowed` | **BLOCKED** |
| **Cross-Tenant Impersonation** | `ADMIN` (Tenant A) | Access Tenant B records | `HTTP 403 Forbidden` | **BLOCKED** |

---

### 3. Conclusion
Staff and user authorization boundaries are securely enforced at both the UI layer and the backend API gateway. **PASS**.
