import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DB_PATH = process.env.LUMINA_DB_PATH || path.join(__dirname, 'data_server_authority.sqlite');
const LEGACY_JSON_DB_PATH = path.join(__dirname, 'data_server_authority_db.json');

let dbInstance: any = null;

export function getAuthorityDatabase(dbPath?: string): any {
  if (dbPath) {
    const customDb = new DatabaseSync(dbPath);
    customDb.exec('PRAGMA foreign_keys = ON;');
    customDb.exec('PRAGMA journal_mode = WAL;');
    initAuthorityTables(customDb);
    return customDb;
  }

  if (dbInstance) return dbInstance;

  try {
    dbInstance = new DatabaseSync(SERVER_DB_PATH);
    // Enable PRAGMA foreign keys and WAL mode
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  } catch (err) {
    console.warn('Fallback to in-memory SQLite adapter:', err);
    dbInstance = new DatabaseSync(':memory:');
  }

  initAuthorityTables(dbInstance);
  migrateLegacyJsonDb(dbInstance);
  return dbInstance;
}

function initAuthorityTables(db: any): void {
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

    -- Indexes & Unique Constraints
    CREATE INDEX IF NOT EXISTS idx_licenses_business_id ON licenses(business_id);
    CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
    CREATE INDEX IF NOT EXISTS idx_devices_license_id ON devices(license_id);
    CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_trials_device_unique ON trials(originating_device_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_trials_business_unique ON trials(business_id);
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
    CREATE INDEX IF NOT EXISTS idx_signing_keys_status ON signing_keys(status);
    CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_business_id ON operational_audit_events(business_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON operational_audit_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON operational_audit_events(action);
  `);

  // Safe migrations: Drop NOT NULL constraint on private_key_pem and sanitize all keys to NULL
  try {
    const tableInfo = db.prepare("PRAGMA table_info(signing_keys)").all() as any[];
    const privCol = tableInfo.find((c: any) => c.name === 'private_key_pem');
    if (privCol && privCol.notnull === 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS signing_keys_v2 (
          kid TEXT PRIMARY KEY,
          algorithm TEXT NOT NULL DEFAULT 'RS256',
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at TEXT NOT NULL,
          activated_at TEXT NOT NULL,
          retired_at TEXT,
          public_key_pem TEXT NOT NULL,
          private_key_pem TEXT DEFAULT NULL
        );
        INSERT OR IGNORE INTO signing_keys_v2 (kid, algorithm, status, created_at, activated_at, retired_at, public_key_pem, private_key_pem)
        SELECT kid, algorithm, status, created_at, activated_at, retired_at, public_key_pem, NULL FROM signing_keys;
        DROP TABLE signing_keys;
        ALTER TABLE signing_keys_v2 RENAME TO signing_keys;
      `);
    } else {
      db.exec(`UPDATE signing_keys SET private_key_pem = NULL WHERE private_key_pem IS NOT NULL;`);
    }
  } catch (e) {
    console.warn('signing_keys NULL migration note:', e);
  }

  try {
    db.exec(`ALTER TABLE idempotency_keys ADD COLUMN payload_hash TEXT NOT NULL DEFAULT '';`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE idempotency_keys ADD COLUMN status TEXT NOT NULL DEFAULT 'COMPLETED';`);
  } catch (_) {}
}

function migrateLegacyJsonDb(db: any): void {
  try {
    if (fs.existsSync(LEGACY_JSON_DB_PATH)) {
      const raw = fs.readFileSync(LEGACY_JSON_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      const now = new Date().toISOString();

      // Seed default plans if table empty
      const stmtPlanCheck = db.prepare('SELECT COUNT(*) as cnt FROM plans');
      const planCount = stmtPlanCheck.get().cnt;
      if (planCount === 0) {
        const stmtInsPlan = db.prepare(`
          INSERT INTO plans (id, plan_code, name, billing_period, price, currency, max_devices, max_users, feature_entitlements_json, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmtInsPlan.run('p_trial_14', 'trial_14', '14-Day Commercial Trial', 'days', 0, '₹', 2, 3, JSON.stringify(['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup']), 'ACTIVE', now, now);
        stmtInsPlan.run('p_yearly_1y', 'yearly_1y', 'Professional Annual', 'years', 7999, '₹', 3, 10, JSON.stringify(['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email']), 'ACTIVE', now, now);
        stmtInsPlan.run('p_lifetime', 'lifetime', 'Enterprise Lifetime', 'unlimited', 19999, '₹', 10, 25, JSON.stringify(['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email']), 'ACTIVE', now, now);
      }

      // Migrate trialsByDevice
      if (parsed.trialsByDevice) {
        const stmtCheckTrial = db.prepare('SELECT id FROM trials WHERE originating_device_id = ?');
        const stmtInsTrial = db.prepare(`
          INSERT INTO trials (id, customer_id, business_id, trial_type, start_at, expires_at, status, originating_device_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        Object.entries(parsed.trialsByDevice).forEach(([devId, licId]) => {
          const exists = stmtCheckTrial.get(devId);
          if (!exists) {
            const licenseData = parsed.licenses?.[licId as string];
            const bizId = licenseData?.businessId || `biz_mig_${devId.slice(0, 8)}`;
            const custId = licenseData?.customerId || `cust_${bizId}`;

            // Ensure customer & business exist
            db.exec(`INSERT OR IGNORE INTO commercial_customers (id, customer_code, legal_name, contact_name, status, created_at, updated_at) VALUES ('${custId}', 'CUST-${bizId}', 'Commercial Customer', 'Owner', 'ACTIVE', '${now}', '${now}')`);
            db.exec(`INSERT OR IGNORE INTO businesses (id, customer_id, business_code, business_name, status, created_at, updated_at) VALUES ('${bizId}', '${custId}', 'BIZ-${bizId}', 'Lumina Cyber Point', 'ACTIVE', '${now}', '${now}')`);

            stmtInsTrial.run(
              `tri_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              custId,
              bizId,
              'standard',
              now,
              licenseData?.expiryDate || new Date(Date.now() + 14 * 86400000).toISOString(),
              'ACTIVE',
              devId,
              now
            );
          }
        });
      }

      // Migrate licenses
      if (parsed.licenses) {
        const stmtCheckLic = db.prepare('SELECT id FROM licenses WHERE id = ?');
        const stmtInsLic = db.prepare(`
          INSERT INTO licenses (id, business_id, customer_id, plan_id, license_key, token_id, issued_at, starts_at, expires_at, status, device_limit, user_limit, key_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        Object.entries(parsed.licenses).forEach(([licId, licData]: [string, any]) => {
          if (!stmtCheckLic.get(licId)) {
            const bizId = licData.businessId || 'biz_default_01';
            const custId = licData.customerId || `cust_${bizId}`;

            db.exec(`INSERT OR IGNORE INTO commercial_customers (id, customer_code, legal_name, contact_name, status, created_at, updated_at) VALUES ('${custId}', 'CUST-${bizId}', 'Commercial Customer', 'Owner', 'ACTIVE', '${now}', '${now}')`);
            db.exec(`INSERT OR IGNORE INTO businesses (id, customer_id, business_code, business_name, status, created_at, updated_at) VALUES ('${bizId}', '${custId}', 'BIZ-${bizId}', 'Lumina Cyber Point', 'ACTIVE', '${now}', '${now}')`);

            stmtInsLic.run(
              licId,
              bizId,
              custId,
              licData.planId || 'yearly_1y',
              licData.licenseKey || `LCS-KEY-${licId}`,
              `jti_${licId}`,
              licData.issuedAt || now,
              licData.startDate || now,
              licData.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString(),
              licData.status || 'ACTIVE',
              licData.deviceLimit || 3,
              licData.userLimit || 10,
              'LUMINA_SERVER_KEY_2026_01',
              now,
              now
            );
          }
        });
      }
    }
  } catch (err) {
    console.warn('Legacy JSON migration warning:', err);
  }
}

export interface DurableAuditEventRecord {
  id?: string;
  auditEventId: string;
  timestamp: string;
  businessId: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetResource: string;
  outcome: string;
  correlationId: string;
  detailsJson: string;
}

export function insertDurableAuditEvent(event: DurableAuditEventRecord): void {
  try {
    const db = getAuthorityDatabase();
    const id = event.id || `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stmt = db.prepare(`
      INSERT INTO operational_audit_events (
        id, audit_event_id, timestamp, business_id, actor_id, actor_role, action, target_resource, outcome, correlation_id, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      event.auditEventId,
      event.timestamp,
      event.businessId,
      event.actorId,
      event.actorRole,
      event.action,
      event.targetResource,
      event.outcome,
      event.correlationId,
      event.detailsJson
    );
  } catch (err) {
    console.warn('Failed to insert durable audit event:', err);
  }
}

export function getDurableAuditEvents(businessId: string, limit = 100): DurableAuditEventRecord[] {
  try {
    const db = getAuthorityDatabase();
    const stmt = db.prepare(`
      SELECT 
        id,
        audit_event_id as auditEventId,
        timestamp,
        business_id as businessId,
        actor_id as actorId,
        actor_role as actorRole,
        action,
        target_resource as targetResource,
        outcome,
        correlation_id as correlationId,
        details_json as detailsJson
      FROM operational_audit_events
      WHERE business_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(businessId, limit) as DurableAuditEventRecord[];
  } catch (err) {
    console.warn('Failed to fetch durable audit events:', err);
    return [];
  }
}

export function clearDurableAuditEvents(businessId: string): void {
  try {
    const db = getAuthorityDatabase();
    const stmt = db.prepare('DELETE FROM operational_audit_events WHERE business_id = ?');
    stmt.run(businessId);
  } catch (err) {
    console.warn('Failed to clear durable audit events:', err);
  }
}

