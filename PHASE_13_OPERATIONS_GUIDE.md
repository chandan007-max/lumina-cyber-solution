# LUMINA CYBER SOLUTION — PHASE 13 OPERATIONS GUIDE

**Audience:** System Administrators, Store Operators, IT Field Engineers  
**System:** Lumina Cyber Solution Commercial POS  
**Version:** 1.0.0  

---

## 1. Accessing the Operations Center

The Operations Center can be accessed by authorized store personnel via:
- **Navigation:** Click **"Operations"** (Activity/Shield icon) in the main navigation sidebar.
- **Direct Route:** Open `/admin/operations` in the browser.
- **Required Roles:** Full operational diagnostics are visible to `Owner`, `Admin`, and `Manager` roles. Basic device and application status are available to `Billing Staff`.

---

## 2. Reading the Operations Dashboard

The dashboard provides an instant (10-second) operational assessment through 8 standardized health cards:

| Card | Healthy State | Warning / Degraded State | Meaning & Impact |
| :--- | :--- | :--- | :--- |
| **Application** | `HEALTHY` (Green) | `DEGRADED` (Yellow) | Process uptime, memory usage, and build version. |
| **Database** | `HEALTHY` (Green) | `ERROR` / `WARNING` | SQLite availability, WAL mode, record counts, integrity status. |
| **License** | `ACTIVE` (Green) | `EXPIRING` / `WARNING` | Commercial license validity, days remaining, enrolled devices. |
| **Network** | `ONLINE` (Green) | `OFFLINE` (Blue/Notice) | Offline mode is normal; POS operations continue locally. |
| **Backup** | `HEALTHY` (Green) | `ACTION REQUIRED` (Yellow) | Freshness of latest data backup. If >24h old, triggers warning. |
| **Communication** | `READY` (Green) | `NOT CONFIGURED` / `WARNING` | SMTP gateway, credential vault status, outgoing queue depth. |
| **Printer** | `READY` (Green) | `NOT CONFIGURED` / `OFFLINE` | Receipt printer connectivity and calibration state. |
| **Storage** | `HEALTHY` (Green) | `LOW STORAGE` (Yellow) | Local storage and attachment filesystem space. |

---

## 3. Handling "Attention Required" Alerts

When an alert card appears in the "Attention Required" section, follow these resolution procedures:

### 3.1 "Backup is older than 24 hours"
- **Alert Type:** `WARNING`
- **Impact:** Business operations continue, but recent transactions are not yet backed up off-station.
- **Action:**
  1. Click the **"Check Backup"** quick action button.
  2. Create a new local backup snapshot or export the JSON database.
  3. Ensure the backup file is copied to external storage or cloud destination.

### 3.2 "Thermal receipt printer is disconnected or not configured"
- **Alert Type:** `WARNING`
- **Impact:** Billing can proceed on-screen or via digital invoices, but physical receipts cannot be printed.
- **Action:**
  1. Verify the USB or Bluetooth cable connection to the thermal printer.
  2. Ensure printer power switch is ON and paper roll is loaded.
  3. Click **"Test Printer"** in the Quick Actions panel to run a controlled test print.

### 3.3 "Communication queue has failed items"
- **Alert Type:** `ERROR`
- **Impact:** Certain WhatsApp or Email dispatch jobs have failed delivery attempts.
- **Action:**
  1. Click **"Communication Test"** to test SMTP gateway connectivity.
  2. If the workstation is offline, wait for network restoration (queue will retry automatically).
  3. Navigate to **Communication Center** -> **Queue** to review dead-letter details.

### 3.4 "Database integrity warning"
- **Alert Type:** `CRITICAL`
- **Impact:** Database file may be damaged or experiencing file lock contention.
- **Action:**
  1. Do NOT force-reboot the system or kill SQLite processes.
  2. Click **"Run Diagnostics"** to verify WAL checkpoint status.
  3. Generate a **Support Report** and contact technical support immediately.

---

## 4. Quick Actions Reference

- **[Run Diagnostics]:** Executes an immediate on-demand refresh of all client and server diagnostic probes.
- **[Test Printer]:** Sends a standardized test print command to the configured receipt printer. The test print outputs device status and timestamp with zero customer PII.
- **[Check Backup]:** Inspects the latest snapshot, checks byte integrity, and calculates backup freshness.
- **[Communication Test]:** Verifies that the credential vault is unlocked and probes the SMTP gateway connection.
- **[Generate Support Report]:** Generates a scrubbed, confidential diagnostic package for support tickets.
