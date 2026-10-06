# KNOWN ARCHITECTURAL LIMITATIONS

1. **Restore Atomicity Classification**: Restore uses application-level exception compensation (`inMemoryRollbackSnapshot` + `StorageService.save*`), NOT database transaction rollback (`SQL ROLLBACK`). Physical power-loss recovery was not demonstrated.
2. **Audit Immutability**: Historical audit events are append-only at the Application/API level (HTTP PUT/PATCH/DELETE return 405 Method Not Allowed). Direct filesystem SQLite mutations remain technically possible for host OS administrators.
3. **Rate Limiting**: Rate limiter state is process-local and resets upon Node.js server restart.
4. **Offline Storage**: Client-side data is persisted in browser `localStorage`. Unencrypted at rest on client workstations; protected against privilege elevation by ensuring zero privileged credentials reside in `safeStorage`.
5. **Printer Hardware Output**: Software telemetry confirms delivery to operating system spooler (`PRINT DISPATCHED`); physical paper delivery requires visual operator confirmation.