# HEALTH & READINESS SEMANTICS FORENSIC REPORT

## 1. Route Registration & Semantics Matrix
| Endpoint | Authentication | Purpose | Liveness | Readiness | Deep Diagnostics |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `/api/system/health?probe=live` | Public (None) | Process heartbeat check | YES (200) | NO | NO |
| `/api/system/health?probe=ready` | Public (None) | Mandatory dependency check (DB) | NO | YES (200/503) | NO |
| `/api/system/health` | Public (None) | Default health indicator | YES (200) | YES (200/503) | NO |
| `/api/system/diagnostics` | Authenticated (Manager/Admin) | Deep subsystem inspection | NO | NO | YES (200) |

## 2. Probe Failure Evidence
- Simulated DB Degradation: Liveness HTTP 200 | Readiness HTTP 503
- Result: Liveness confirms process vitality while Readiness appropriately signals container scheduler/load balancer.