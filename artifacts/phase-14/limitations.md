# PHASE 14 — DOCUMENTED TECHNICAL & COMMERCIAL LIMITATIONS

## 1. Executive Summary
In accordance with the forensic standards of LUMINA CYBER SOLUTION, all architectural boundaries, operational constraints, and technical limitations are explicitly documented. No false claims of automated or external cloud infrastructure are permitted.

## 2. Documented Limitations Register

### 2.1 Billing & Payment Gateway Integration
- **Classification**: `MANUAL` / `NOT CONFIGURED`
- **Limitation**: The system does not feature automated payment gateway integrations (e.g., Stripe, Razorpay, UPI Webhooks). All invoice settlements are recorded via the `MANUAL PAYMENT` ledger following operator verification.
- **Guidance**: Operators must verify incoming cash, cheque, or NEFT/IMPS bank transfers before recording settlement in the billing console.

### 2.2 Thermal Printing & Hardware Verification
- **Classification**: `IMPLEMENTED (DRIVER-DETECTED)` / `HUMAN VERIFICATION REQUIRED`
- **Limitation**: The system generates ESC/POS compliant receipt byte buffers and dispatches them to configured printer device endpoints or OS driver queues. The software cannot physically verify paper feed, jam status, or ink/ribbon levels without a human operator present at the terminal.
- **Guidance**: Operators must visually confirm receipt output during initial device setup.

### 2.3 Rate Limiting Architecture
- **Classification**: `IMPLEMENTED (INSTANCE-LOCAL)`
- **Limitation**: Rate limiting uses an in-memory sliding window algorithm scoped per tenant. In a multi-node horizontal cluster behind a load balancer without a shared Redis store, rate limit counters are not shared across nodes.
- **Guidance**: The single-workstation POS deployment model is fully protected. Distributed clustering requires configuring a central cache.

### 2.4 Software Update Mechanism
- **Classification**: `MANUAL / ADMINISTRATOR CONTROLLED`
- **Limitation**: The application does not execute unattended Over-The-Air (OTA) self-updates. Updates require an administrator to pull new distributions, execute database migrations, and verify post-boot diagnostics.
- **Guidance**: Follow the manual update runbook documented in `update-results.md`.

### 2.5 Cloud Backup & Remote Replication
- **Classification**: `IMPLEMENTED (LOCAL SNAPSHOTS)` / `CONFIGURATION-ONLY (CLOUD REPLICATION)`
- **Limitation**: Automated database snapshots are stored in the local file system backup directory with WAL truncate checkpoints. Off-site cloud replication (e.g., AWS S3, Google Cloud Storage) requires configuring external synchronization scripts or object storage credentials.
- **Guidance**: Operators must regularly copy backup archives to external physical media or cloud storage.

### 2.6 High Availability & Zero Downtime
- **Classification**: `NOT IMPLEMENTED` (Single-Workstation Architecture)
- **Limitation**: LUMINA CYBER SOLUTION is designed as an offline-first single-instance workstation POS. It does not provide multi-master database replication or zero-downtime failover clusters.
- **Guidance**: Maintain current local database snapshots to ensure rapid disaster recovery within SLA targets.
