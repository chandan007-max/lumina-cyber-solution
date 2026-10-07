# PHASE-15-PILOT-BASELINE
## Lumina Cyber Solution — Commercial Pilot Environment Specification

**Product Identity:** Cyber Café / Computer Center POS & Business Management Software  
**Target Deployment:** Cyber Cafés, Online Form & Digital Service Centers, Xerox / Document Hubs  
**Phase:** Phase 15 — Commercial Pilot & Customer Acceptance  
**Status:** FROZEN — BASELINE VERIFIED  

---

### 1. Build & Runtime Environment

| Component | Identifier / Version | Description |
| :--- | :--- | :--- |
| **Application Version** | `3.4.0-pilot` | Cyber Café Commercial Edition |
| **Build ID** | `LCS-PILOT-2026.10-01` | Reproducible Pilot Distribution Build |
| **Release Date** | October 2026 | Scheduled Pilot Customer Rollout |
| **Frontend Framework** | React 19 + TypeScript 5.8 | Client POS, Workstation & Dashboard UI |
| **Bundler & Dev Server** | Vite 8.3.3 | ESM Production Bundle (`dist/assets/`) |
| **Runtime Engine** | Node.js v20+ / Windows Shell | Local Workstation Execution Runtime |
| **Backend API Server** | Express 4.21.2 | Local Authority & Commercial API Gateway |
| **Database Engine** | Better-SQLite3 11.8.1 | WAL Mode, Foreign Keys, Embedded Zero-Admin DB |
| **Database Schema** | PRAGMA user_version = 15 | Multi-Tenant Commercial Schema + Session Subsystems |

---

### 2. Architecture & Subsystem Versions

| Subsystem | Baseline Version | Architectural Boundary |
| :--- | :--- | :--- |
| **License Authority** | `v11.2.2-ed25519` | Ed25519 Asymmetric Signatures; zero private key leakage in client bundles |
| **Communication Center** | `v12.0.0-aes256gcm` | AEAD AES-256-GCM Credential Vault; resilient offline email/WhatsApp queue |
| **Operations & Diagnostics** | `v13.0.0-forensic` | Zero-knowledge secret scrubber, immutable append-only audit, pre-restore snapshot rollback |
| **Commercial Core** | `v14.0.0-prod` | Subscription state machine, tenant onboarding transaction, 4-tier SLA support engine |
| **Cyber Café Workstation Engine** | `v15.0.0-pilot` | Computer session timers, rate calculators, state reconciliation on crash |
| **Print Classification Pipeline** | `v15.0.0-pilot` | Honest 4-stage print status gate: `GENERATED` → `QUEUED` → `DRIVER ACCEPTED` → `PHYSICAL` |
| **Offline Sync Subsystem** | `v15.0.0-pilot` | Offline action queue with deduplication, reconnection flush, corrupt record quarantine |

---

### 3. Feature Flags & Configurations

| Feature Flag | Default State | Rationale |
| :--- | :--- | :--- |
| `FEATURE_COMPUTER_SESSIONS` | `ENABLED` | Core cyber café workstation billing & session tracking |
| `FEATURE_HONEST_PRINT_GATE` | `ENABLED` | Prevents software from falsely claiming paper printed without driver confirmation |
| `FEATURE_OFFLINE_POS_QUEUE` | `ENABLED` | Allows instant billing and printing when internet/broadband goes down |
| `FEATURE_PROD_CONFIG_REDACTION` | `ENABLED` | All diagnostic reports scrub passwords, tokens, Aadhaar, and PAN numbers |
| `FEATURE_OS_LOCKSCREEN_DAEMON` | `CONFIGURATION-ONLY` | External Windows lock daemon interface defined; emulated in browser client |

---

### 4. Known Baseline Limitations & Low-Severity Issues

1. **OS Workstation Lock Screen**: Screen locking is managed at the application / browser timer level. Full Windows OS desktop lockouts require the companion Windows service daemon (planned Phase 16).
2. **Physical Paper Print Confirmation**: Web applications can only confirm driver dispatch (`DRIVER ACCEPTED`); physical paper feed confirmation requires operator visual verification.
3. **Multi-device Offline Sync**: Offline queuing functions perfectly for local transactions. Simultaneous offline updates to the exact same workstation from multiple clients resolve via Last-Write-Wins.
