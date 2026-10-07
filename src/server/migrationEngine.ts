/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Deterministic SQLite Database Migration Engine
 * Phase 14 Commercial Production Readiness
 */

import fs from 'node:fs';
import path from 'node:path';
import { logOperationalAuditEvent } from './operations';

export interface MigrationRecord {
  id: number;
  migrationId: string;
  name: string;
  appliedAt: string;
  executionTimeMs: number;
  batch: number;
}

export interface MigrationDefinition {
  id: string; // e.g. "001_initial_authority_tables"
  name: string;
  up: (db: any) => void;
}

const MIGRATIONS: MigrationDefinition[] = [
  {
    id: '001_initial_authority_tables',
    name: 'Initial Licensing & Authority Tables Baseline',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS commercial_customers (
          id TEXT PRIMARY KEY,
          customer_code TEXT UNIQUE NOT NULL,
          legal_name TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          business_code TEXT UNIQUE NOT NULL,
          business_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES commercial_customers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY,
          plan_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          billing_period TEXT NOT NULL,
          price REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT '₹',
          max_devices INTEGER NOT NULL DEFAULT 1,
          max_users INTEGER NOT NULL DEFAULT 2,
          feature_entitlements_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trials (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          business_id TEXT UNIQUE NOT NULL,
          trial_type TEXT NOT NULL DEFAULT 'standard',
          start_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          originating_device_id TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS licenses (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          license_key TEXT UNIQUE NOT NULL,
          token_id TEXT UNIQUE NOT NULL,
          issued_at TEXT NOT NULL,
          starts_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          device_limit INTEGER NOT NULL DEFAULT 1,
          user_limit INTEGER NOT NULL DEFAULT 2,
          key_id TEXT NOT NULL DEFAULT 'LUMINA_SERVER_KEY_2026_01',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          license_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          device_name TEXT,
          platform TEXT,
          app_version TEXT,
          first_seen_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          UNIQUE(license_id, device_id),
          FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS license_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          license_id TEXT,
          business_id TEXT,
          actor TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          reason TEXT,
          metadata_json TEXT
        );

        CREATE TABLE IF NOT EXISTS signing_keys (
          kid TEXT PRIMARY KEY,
          algorithm TEXT NOT NULL DEFAULT 'RS256',
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          activated_at TEXT NOT NULL,
          retired_at TEXT,
          public_key_pem TEXT NOT NULL,
          private_key_pem TEXT DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key TEXT PRIMARY KEY,
          operation TEXT NOT NULL,
          business_id TEXT,
          payload_hash TEXT NOT NULL DEFAULT '',
          result_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'COMPLETED',
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          ip_address TEXT,
          device_id TEXT,
          business_id TEXT,
          details_json TEXT,
          timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS operational_audit_events (
          id TEXT PRIMARY KEY,
          audit_event_id TEXT UNIQUE NOT NULL,
          timestamp TEXT NOT NULL,
          business_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          action TEXT NOT NULL,
          target_resource TEXT NOT NULL,
          outcome TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          details_json TEXT NOT NULL
        );
      `);
    },
  },
  {
    id: '002_commercial_subscriptions_and_onboarding',
    name: 'Commercial Subscriptions and Multi-Step Onboarding Engine',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS commercial_subscriptions (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'TRIAL',
          billing_interval TEXT NOT NULL DEFAULT 'monthly',
          current_period_start TEXT NOT NULL,
          current_period_end TEXT NOT NULL,
          grace_period_end TEXT,
          trial_end TEXT,
          cancelled_at TEXT,
          suspended_at TEXT,
          suspension_reason TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS commercial_onboarding (
          id TEXT PRIMARY KEY,
          business_id TEXT UNIQUE NOT NULL,
          current_step INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
          completed_steps_json TEXT NOT NULL DEFAULT '[]',
          checklist_json TEXT NOT NULL DEFAULT '{}',
          initial_backup_id TEXT,
          first_transaction_id TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON commercial_subscriptions(business_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON commercial_subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_onboarding_business ON commercial_onboarding(business_id);
      `);
    },
  },
  {
    id: '003_commercial_billing_and_ledger',
    name: 'Commercial Invoicing and Manual Payment Ledger',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS commercial_invoices (
          id TEXT PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          subscription_id TEXT NOT NULL,
          business_id TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT '₹',
          status TEXT NOT NULL DEFAULT 'ISSUED',
          due_date TEXT NOT NULL,
          paid_at TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS commercial_payments (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          business_id TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT '₹',
          payment_method TEXT NOT NULL, -- 'MANUAL_CASH', 'MANUAL_UPI', 'MANUAL_BANK_TRANSFER', etc.
          payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
          transaction_reference TEXT,
          notes TEXT,
          recorded_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (invoice_id) REFERENCES commercial_invoices(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_comm_invoices_biz ON commercial_invoices(business_id);
        CREATE INDEX IF NOT EXISTS idx_comm_invoices_status ON commercial_invoices(status);
        CREATE INDEX IF NOT EXISTS idx_comm_payments_inv ON commercial_payments(invoice_id);
      `);
    },
  },
  {
    id: '004_support_center_and_sla',
    name: 'Support Ticketing Center and Incident SLA Tracking',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id TEXT PRIMARY KEY,
          ticket_number TEXT UNIQUE NOT NULL,
          business_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'GENERAL',
          priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
          status TEXT NOT NULL DEFAULT 'OPEN',     -- 'OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
          sla_due_at TEXT,
          assigned_to TEXT,
          resolution_notes TEXT,
          sanitized_diagnostic_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS support_ticket_messages (
          id TEXT PRIMARY KEY,
          ticket_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          sender_role TEXT NOT NULL,
          message TEXT NOT NULL,
          is_internal INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_support_tickets_biz ON support_tickets(business_id);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
        CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_ticket_messages(ticket_id);
      `);
    },
  },
];

/**
 * Initializes schema_migrations tracking table and executes any pending migrations in deterministic order.
 */
export function runDatabaseMigrations(db: any, dbFilePath?: string): {
  success: boolean;
  appliedCount: number;
  totalMigrations: number;
  history: MigrationRecord[];
} {
  // 1. Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      batch INTEGER NOT NULL
    );
  `);

  // 2. Fetch applied migrations
  const appliedRows = db.prepare('SELECT * FROM schema_migrations ORDER BY id ASC').all() as any[];
  const appliedIds = new Set(appliedRows.map((r) => r.migration_id));

  // Determine current batch number
  const maxBatch = appliedRows.length > 0 ? Math.max(...appliedRows.map((r) => r.batch || 1)) : 0;
  const currentBatch = maxBatch + 1;

  let newlyApplied = 0;

  for (const m of MIGRATIONS) {
    if (appliedIds.has(m.id)) {
      continue; // Idempotent: already applied
    }

    // Optional pre-migration backup for file-backed databases
    if (dbFilePath && fs.existsSync(dbFilePath)) {
      try {
        const backupDir = path.resolve(path.dirname(dbFilePath), 'backups', 'pre-migration');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `pre_migration_${m.id}_${Date.now()}.sqlite`);
        fs.copyFileSync(dbFilePath, backupFile);
      } catch (_) {}
    }

    const startTime = performance.now();
    try {
      db.exec('BEGIN IMMEDIATE;');
      m.up(db);
      const elapsed = Math.round(performance.now() - startTime);

      const recordStmt = db.prepare(`
        INSERT INTO schema_migrations (migration_id, name, applied_at, execution_time_ms, batch)
        VALUES (?, ?, ?, ?, ?)
      `);
      recordStmt.run(m.id, m.name, new Date().toISOString(), elapsed, currentBatch);
      db.exec('COMMIT;');

      newlyApplied++;
      console.log(`[MIGRATION SUCCESS] Applied ${m.id} (${m.name}) in ${elapsed}ms`);
    } catch (err: any) {
      try {
        db.exec('ROLLBACK;');
      } catch (_) {}
      console.error(`[MIGRATION FAILED] Failed applying migration ${m.id}:`, err);
      logOperationalAuditEvent({
        businessId: 'system',
        actorId: 'migration_runner',
        actorRole: 'SYSTEM',
        action: 'MIGRATION_FAILURE',
        targetResource: `migration:${m.id}`,
        outcome: 'FAILED',
        details: { error: err.message, migrationId: m.id },
      });
      throw new Error(`Database migration failed on ${m.id}: ${err.message}`);
    }
  }

  const updatedHistory = db.prepare('SELECT * FROM schema_migrations ORDER BY id ASC').all() as any[];
  const history: MigrationRecord[] = updatedHistory.map((r) => ({
    id: r.id,
    migrationId: r.migration_id,
    name: r.name,
    appliedAt: r.applied_at,
    executionTimeMs: r.execution_time_ms,
    batch: r.batch,
  }));

  return {
    success: true,
    appliedCount: newlyApplied,
    totalMigrations: MIGRATIONS.length,
    history,
  };
}

export function getMigrationStatus(db: any): {
  currentVersion: number;
  totalMigrations: number;
  appliedCount: number;
  pendingCount: number;
  applied: MigrationRecord[];
  pending: Array<{ id: string; name: string }>;
} {
  try {
    const appliedRows = db.prepare('SELECT * FROM schema_migrations ORDER BY id ASC').all() as any[];
    const appliedIds = new Set(appliedRows.map((r) => r.migration_id));
    const pending = MIGRATIONS.filter((m) => !appliedIds.has(m.id)).map((m) => ({ id: m.id, name: m.name }));

    return {
      currentVersion: appliedRows.length,
      totalMigrations: MIGRATIONS.length,
      appliedCount: appliedRows.length,
      pendingCount: pending.length,
      applied: appliedRows.map((r) => ({
        id: r.id,
        migrationId: r.migration_id,
        name: r.name,
        appliedAt: r.applied_at,
        executionTimeMs: r.execution_time_ms,
        batch: r.batch,
      })),
      pending,
    };
  } catch (_) {
    return {
      currentVersion: 0,
      totalMigrations: MIGRATIONS.length,
      appliedCount: 0,
      pendingCount: MIGRATIONS.length,
      applied: [],
      pending: MIGRATIONS.map((m) => ({ id: m.id, name: m.name })),
    };
  }
}
