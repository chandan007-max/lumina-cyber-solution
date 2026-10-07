# PHASE-15-DEFECT-REGISTER
## Commercial Pilot Defect Register & Limitations Tracking

**Severity Tiers:** `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `ENHANCEMENT` | `DOCUMENTATION`

---

### 1. Defect Summary Table

| Severity | Active Defect Count | Target Resolution Window |
| :--- | :---: | :--- |
| **CRITICAL** | **0** | Must be 0 to close Phase 15 |
| **HIGH** | **0** | Must be 0 to close Phase 15 |
| **MEDIUM** | **1** | Tracked limitation; acceptable for controlled pilot |
| **LOW** | **2** | Minor operational ergonomics; non-blocking |
| **ENHANCEMENT** | **2** | Roadmap items for v1.1 |

---

### 2. Detailed Register of Discovered Limitations

#### DEF-15-001 (MEDIUM) — OS-Level Windows Desktop Lock Daemon
- **Description:** Cyber workstation session expiry locks the web application interface, but does not invoke native Windows `LockWorkStation()` API.
- **Reproduction:** Start session on PC-01; let timer expire. Web app prompts locked status, but client user could minimize browser if Windows taskbar is accessible.
- **Expected Result:** Full Windows desktop locked behind fullscreen kiosk / credential screen.
- **Actual Result:** Web app locked; OS desktop unlocked unless running in Windows Kiosk mode.
- **Workaround:** Configure client PCs in Windows Kiosk Mode or single-app browser shell.
- **Fix Status:** Documented limitation; Companion Windows service scheduled for v1.1.

#### DEF-15-002 (LOW) — Browser Print Dialog Interaction
- **Description:** ESC/POS USB thermal printing dispatched via standard browser dialog requires user to press "Enter" or configure silent printing (`--kiosk-printing`).
- **Reproduction:** Click "Print Receipt"; browser print preview dialog appears.
- **Expected Result:** Completely silent thermal paper cut without dialog prompt.
- **Workaround:** Launch desktop browser shortcut with `--kiosk-printing` flag.
- **Fix Status:** Documented in Operator Setup Manual.

#### DEF-15-003 (LOW) — High Concurrency Workstation State Conflicts
- **Description:** If two operators edit workstation status simultaneously on separate terminals while offline, last write wins without three-way merge.
- **Reproduction:** Modify PC-01 rate on Terminal A while Terminal B changes status offline; sync both.
- **Expected Result:** Operational warning on state collision.
- **Actual Result:** Later timestamp overwrites earlier timestamp cleanly.
- **Fix Status:** Acceptable for small shops (typically 1-2 billing counters).

---

### 3. Critical & High Defect Gate
- **Zero Critical Issues Open:** Confirmed.
- **Zero High Issues Open:** Confirmed.
