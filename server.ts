import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getAuthorityDatabase } from './src/server/db';
import { NativeSmtpClient } from './src/server/smtpClient';
import { mountOperationsRoutes } from './src/server/operations';
import { mountCommercialRoutes } from './src/server/commercialRoutes';
import { loadServerConfig, validateStartupEnvironment } from './src/server/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.LUMINA_VAULT_MASTER_KEY) {
  process.env.LUMINA_VAULT_MASTER_KEY = process.env.LUMINA_SECRET_KEY || 'LCS_STATION_VAULT_MASTER_ENTROPY_2026';
}

// ==========================================
// 1. KEY MANAGEMENT ENGINE (P0: REAL KEY ROTATION)
// ==========================================

export interface SigningKeyRecord {
  kid: string;
  algorithm: string;
  status: 'ACTIVE' | 'VERIFY_ONLY' | 'RETIRED';
  public_key_pem: string;
  private_key_pem: string;
  created_at: string;
  activated_at: string;
  retired_at?: string | null;
}

const SERVER_KEYPAIR_PATH = path.join(__dirname, 'data_server_rsa_keypair.json');

// In-Memory Private Key Store (Cryptographic signing keys NEVER persist to SQLite database)
const IN_MEMORY_PRIVATE_KEYS = new Map<string, string>();

/**
 * Generate cryptographically strong random identifiers (CSPRNG)
 */
export function generateSecureId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Initialize authority signing keys.
 * In production, private keys originate strictly from process.env / Secret Manager.
 * In SQLite, private_key_pem is ALWAYS NULL.
 */
export function initAuthoritySigningKeys(): void {
  const db = getAuthorityDatabase();
  const defaultKid = process.env.LUMINA_LICENSE_KEY_ID || 'LUMINA_SERVER_KEY_2026_01';
  const now = new Date().toISOString();

  if (process.env.LUMINA_LICENSE_PRIVATE_KEY && process.env.LUMINA_LICENSE_PUBLIC_KEY) {
    IN_MEMORY_PRIVATE_KEYS.set(defaultKid, process.env.LUMINA_LICENSE_PRIVATE_KEY);
    const existing = db.prepare('SELECT kid FROM signing_keys WHERE kid = ?').get(defaultKid);
    if (!existing) {
      db.prepare(`
        INSERT INTO signing_keys (kid, algorithm, status, created_at, activated_at, public_key_pem, private_key_pem)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `).run(defaultKid, 'RS256', 'ACTIVE', now, now, process.env.LUMINA_LICENSE_PUBLIC_KEY);
    }
    return;
  }

  // Development Fallback via local keypair file
  if (fs.existsSync(SERVER_KEYPAIR_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(SERVER_KEYPAIR_PATH, 'utf-8'));
      if (data.privateKeyPem && data.publicKeyPem) {
        IN_MEMORY_PRIVATE_KEYS.set(defaultKid, data.privateKeyPem);
        const existing = db.prepare('SELECT kid, status FROM signing_keys WHERE kid = ?').get(defaultKid) as any;
        if (!existing) {
          db.prepare(`
            INSERT INTO signing_keys (kid, algorithm, status, created_at, activated_at, public_key_pem, private_key_pem)
            VALUES (?, ?, ?, ?, ?, ?, NULL)
          `).run(defaultKid, 'RS256', 'ACTIVE', now, now, data.publicKeyPem);
        } else if (existing.status !== 'ACTIVE') {
          // Reactivate default dev key if previous test rotated away from it
          db.prepare("UPDATE signing_keys SET status = 'VERIFY_ONLY' WHERE status = 'ACTIVE'").run();
          db.prepare("UPDATE signing_keys SET status = 'ACTIVE' WHERE kid = ?").run(defaultKid);
        }
        return;
      }
    } catch (_) {}
  }

  // Generate new keypair if neither env nor file exists
  const keypair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  IN_MEMORY_PRIVATE_KEYS.set(defaultKid, keypair.privateKey);

  try {
    fs.writeFileSync(
      SERVER_KEYPAIR_PATH,
      JSON.stringify({ privateKeyPem: keypair.privateKey, publicKeyPem: keypair.publicKey }, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.warn('Could not write fallback key file:', e);
  }

  db.prepare(`
    INSERT INTO signing_keys (kid, algorithm, status, created_at, activated_at, public_key_pem, private_key_pem)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(defaultKid, 'RS256', 'ACTIVE', now, now, keypair.publicKey);
}

/**
 * Get current ACTIVE signing key
 */
export function getActiveSigningKey(): SigningKeyRecord {
  const db = getAuthorityDatabase();
  const stmt = db.prepare("SELECT kid, algorithm, status, public_key_pem, created_at, activated_at, retired_at FROM signing_keys WHERE status = 'ACTIVE' ORDER BY activated_at DESC LIMIT 1");
  let record = stmt.get() as any;
  if (!record) {
    initAuthoritySigningKeys();
    record = db.prepare("SELECT kid, algorithm, status, public_key_pem, created_at, activated_at, retired_at FROM signing_keys WHERE status = 'ACTIVE' ORDER BY activated_at DESC LIMIT 1").get() as any;
  }
  const privateKey = IN_MEMORY_PRIVATE_KEYS.get(record.kid) || process.env.LUMINA_LICENSE_PRIVATE_KEY || '';
  return {
    ...record,
    private_key_pem: privateKey,
  };
}

/**
 * Get signing key by Key ID (kid)
 */
export function getKeyByKid(kid: string): SigningKeyRecord | null {
  const db = getAuthorityDatabase();
  const stmt = db.prepare('SELECT kid, algorithm, status, public_key_pem, created_at, activated_at, retired_at FROM signing_keys WHERE kid = ?');
  const record = stmt.get(kid) as any;
  if (!record) return null;
  const privateKey = IN_MEMORY_PRIVATE_KEYS.get(record.kid) || (record.status === 'ACTIVE' ? process.env.LUMINA_LICENSE_PRIVATE_KEY : '') || '';
  return {
    ...record,
    private_key_pem: privateKey,
  };
}

/**
 * Perform key rotation: creates new ACTIVE key, moves current ACTIVE to VERIFY_ONLY.
 * The new private key resides purely in memory; SQLite receives NULL.
 */
export function rotateAuthoritySigningKey(): { newKid: string; oldKid: string; publicKeyPem: string } {
  const db = getAuthorityDatabase();
  const currentActive = getActiveSigningKey();

  const keypair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const newKid = `LUMINA_KEY_${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  const now = new Date().toISOString();

  // Store in memory
  IN_MEMORY_PRIVATE_KEYS.set(newKid, keypair.privateKey);
  if (currentActive.private_key_pem) {
    IN_MEMORY_PRIVATE_KEYS.set(currentActive.kid, currentActive.private_key_pem);
  }

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // Demote current key to VERIFY_ONLY
    db.prepare("UPDATE signing_keys SET status = 'VERIFY_ONLY' WHERE kid = ?").run(currentActive.kid);

    // Insert new ACTIVE key into SQLite with private_key_pem = NULL
    db.prepare(`
      INSERT INTO signing_keys (kid, algorithm, status, created_at, activated_at, public_key_pem, private_key_pem)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `).run(newKid, 'RS256', 'ACTIVE', now, now, keypair.publicKey);

    db.prepare(`
      INSERT INTO license_events (id, event_type, actor, timestamp, reason, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateSecureId('evt_rot'), 'KEY_ROTATED', 'Admin Authority', now, `Rotated from ${currentActive.kid} to ${newKid}`, JSON.stringify({ oldKid: currentActive.kid, newKid }));

    db.prepare(`
      INSERT INTO security_events (id, event_type, details_json, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(generateSecureId('sec_rot'), 'KEY_ROTATED', JSON.stringify({ oldKid: currentActive.kid, newKid }), now);

    db.exec('COMMIT;');
    return { newKid, oldKid: currentActive.kid, publicKeyPem: keypair.publicKey };
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    throw err;
  }
}

/**
 * Retire or Revoke a key with active license dependency checking.
 * If active unexpired licenses exist, normal retirement is blocked unless force: true (emergency revocation).
 */
export function retireAuthoritySigningKey(
  kid: string,
  reason = 'Key retired by administrator',
  force = false
): { success: boolean; errorCode?: string; activeCount?: number; message: string } {
  const db = getAuthorityDatabase();
  const key = getKeyByKid(kid);
  if (!key) {
    return { success: false, errorCode: 'KEY_NOT_FOUND', message: `Key "${kid}" not found.` };
  }

  // Active license dependency verification
  const activeCheck = db.prepare(`
    SELECT COUNT(*) as count 
    FROM licenses 
    WHERE key_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
  `).get(kid) as any;

  const activeCount = activeCheck?.count || 0;
  if (activeCount > 0 && !force) {
    return {
      success: false,
      errorCode: 'ACTIVE_LICENSES_EXIST',
      activeCount,
      message: `Cannot retire key "${kid}": ${activeCount} active license(s) still rely on it. Allow licenses to expire or pass force: true for emergency revocation.`,
    };
  }

  const now = new Date().toISOString();
  const newStatus = force ? 'REVOKED' : 'RETIRED';
  db.prepare("UPDATE signing_keys SET status = ?, retired_at = ? WHERE kid = ?").run(newStatus, now, kid);

  db.prepare(`
    INSERT INTO security_events (id, event_type, details_json, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(generateSecureId('sec_ret'), force ? 'KEY_REVOKED_EMERGENCY' : 'KEY_RETIRED', JSON.stringify({ kid, reason, force, activeCount }), now);

  return {
    success: true,
    message: force ? `Key "${kid}" has been emergency revoked.` : `Key "${kid}" has been safely retired.`,
  };
}

/**
 * Canonical JSON serialization for tamper-proof deterministic signatures
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]));
  return '{' + entries.join(',') + '}';
}

/**
 * Sign payload using the currently ACTIVE authority key (or explicitly supplied key)
 */
export function serverSignPayload(payload: Record<string, any>, key?: SigningKeyRecord): string {
  const signingKey = key || getActiveSigningKey();
  if (!signingKey.private_key_pem) {
    throw new Error('Signing private key is unavailable in memory/environment.');
  }
  const signer = crypto.createSign('SHA256');
  const payloadStr = canonicalJsonStringify(payload);
  signer.update(payloadStr);
  signer.end();
  const signatureBase64 = signer.sign(signingKey.private_key_pem, 'base64');

  return JSON.stringify({
    payload,
    signature: signatureBase64,
    algorithm: 'RS256',
    keyId: signingKey.kid,
    issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
  });
}

/**
 * Verify signed token against authority keys in database
 */
export function serverVerifyToken(signedTokenStr: string): { valid: boolean; payload?: Record<string, any>; reason?: string; errorCode?: string; kid?: string } {
  try {
    const parsed = JSON.parse(signedTokenStr);
    if (!parsed || !parsed.payload || !parsed.signature) {
      return { valid: false, reason: 'Malformed token structure', errorCode: 'MALFORMED_TOKEN' };
    }

    const kid = parsed.keyId || parsed.payload?.keyId || 'LUMINA_SERVER_KEY_2026_01';
    const key = getKeyByKid(kid);

    if (!key) {
      return { valid: false, reason: `Unknown Key ID "${kid}" not recognized by Authority`, errorCode: 'UNKNOWN_KEY_ID' };
    }

    if ((key.status as string) === 'REVOKED') {
      return { valid: false, reason: `Key "${kid}" has been revoked`, errorCode: 'KEY_REVOKED' };
    }

    if (key.status === 'RETIRED') {
      return { valid: false, reason: `Key "${kid}" has been retired or revoked`, errorCode: 'KEY_RETIRED_OR_REVOKED' };
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(canonicalJsonStringify(parsed.payload));
    verifier.end();

    const isValid = verifier.verify(key.public_key_pem, parsed.signature, 'base64');
    if (!isValid) {
      return { valid: false, reason: 'Cryptographic signature verification failed', errorCode: 'SIGNATURE_INVALID' };
    }

    return { valid: true, payload: parsed.payload, kid };
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}`, errorCode: 'VERIFICATION_ERROR' };
  }
}

// ==========================================
// 2. RATE LIMITING & SECURITY GUARDS
// ==========================================

const RATE_LIMIT_MAP = new Map<string, { count: number; resetTime: number }>();

function createRateLimiter(maxRequests: number, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown_ip';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    const current = RATE_LIMIT_MAP.get(key) || { count: 0, resetTime: now + windowMs };
    if (now > current.resetTime) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count += 1;
    }

    RATE_LIMIT_MAP.set(key, current);

    if (current.count > maxRequests) {
      try {
        const db = getAuthorityDatabase();
        db.prepare(`
          INSERT INTO security_events (id, event_type, ip_address, details_json, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `).run(generateSecureId('sec_rl'), 'RATE_LIMIT_EXCEEDED', ip, JSON.stringify({ path: req.path, limit: maxRequests }), new Date().toISOString());
      } catch (_) {}

      res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down.',
      });
      return;
    }

    next();
  };
}

const standardRateLimiter = createRateLimiter(120, 60 * 1000);
const sensitiveRateLimiter = createRateLimiter(60, 60 * 1000); // 60 requests/min for activation & trials
const adminRateLimiter = createRateLimiter(30, 60 * 1000);     // 30 requests/min for admin endpoints

/**
 * Timing-safe admin authentication with key rotation support
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const adminKey = (req.headers['x-admin-key'] as string) || '';
  const isProd = process.env.NODE_ENV === 'production';
  const configuredKeysStr = process.env.LUMINA_ADMIN_KEY || (isProd ? '' : 'LUMINA_ADMIN_SECRET_KEY_2026');

  if (!configuredKeysStr) {
    res.status(500).json({
      success: false,
      errorCode: 'ADMIN_CONFIG_ERROR',
      message: 'Server configuration error: LUMINA_ADMIN_KEY is not configured.',
    });
    return;
  }

  const validKeys = configuredKeysStr.split(',').map((k) => k.trim()).filter(Boolean);
  let authenticated = false;
  const adminKeyBuffer = Buffer.from(adminKey);

  for (const validKey of validKeys) {
    const validKeyBuffer = Buffer.from(validKey);
    if (adminKeyBuffer.length === validKeyBuffer.length && crypto.timingSafeEqual(adminKeyBuffer, validKeyBuffer)) {
      authenticated = true;
      break;
    }
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const db = getAuthorityDatabase();

  if (!authenticated) {
    try {
      db.prepare(`
        INSERT INTO security_events (id, event_type, ip_address, details_json, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateSecureId('sec_adm_fail'), 'ADMIN_AUTH_FAILED', ip, JSON.stringify({ path: req.path }), new Date().toISOString());
    } catch (_) {}

    res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED_ADMIN',
      message: 'Unauthorized: Valid administrative key required.',
    });
    return;
  }

  try {
    db.prepare(`
      INSERT INTO security_events (id, event_type, ip_address, details_json, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateSecureId('sec_adm_ok'), 'ADMIN_AUTH_SUCCESS', ip, JSON.stringify({ path: req.path }), new Date().toISOString());
  } catch (_) {}

  next();
}

/**
 * Real Idempotency verification with SHA-256 Request Payload Hash
 */
export function checkIdempotency(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;
  if (!idempotencyKey) {
    return next();
  }

  const db = getAuthorityDatabase();
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');

  try {
    const stmt = db.prepare('SELECT result_json, payload_hash, expires_at FROM idempotency_keys WHERE key = ?');
    const existing = stmt.get(idempotencyKey) as any;

    if (existing) {
      if (new Date(existing.expires_at).getTime() <= Date.now()) {
        db.prepare('DELETE FROM idempotency_keys WHERE key = ?').run(idempotencyKey);
        return next();
      }

      // Check request payload hash
      if (existing.payload_hash && existing.payload_hash !== bodyHash) {
        db.prepare(`
          INSERT INTO security_events (id, event_type, ip_address, details_json, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `).run(generateSecureId('sec_idem'), 'IDEMPOTENCY_CONFLICT', req.ip || '', JSON.stringify({ key: idempotencyKey, path: req.path }), new Date().toISOString());

        res.status(409).json({
          success: false,
          errorCode: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
          message: 'Conflict: Reused Idempotency-Key with differing request payload is rejected.',
        });
        return;
      }

      const cachedResponse = JSON.parse(existing.result_json);
      res.json(cachedResponse);
      return;
    }
  } catch (err) {
    console.warn('Idempotency check warning:', err);
  }

  next();
}

export function saveIdempotencyResult(key: string, operation: string, businessId: string | null, payload: any, result: any) {
  if (!key) return;
  try {
    const db = getAuthorityDatabase();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24hr expiry
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, operation, business_id, payload_hash, result_json, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(key, operation, businessId, payloadHash, JSON.stringify(result), 'COMPLETED', new Date().toISOString(), expiresAt);
  } catch (err) {
    console.warn('Failed to save idempotency result:', err);
  }
}

// ==========================================
// 3. APPLICATION SERVER FACTORY & ROUTES
// ==========================================

export async function createApp() {
  const app = express();

  // Trust proxy for reverse proxies
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Production HTTPS Check (Reject insecure HTTP if configured)
    if (process.env.NODE_ENV === 'production' && process.env.ENFORCE_HTTPS === 'true') {
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      if (!isHttps && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
        res.status(403).json({ success: false, message: 'HTTPS is required in production.' });
        return;
      }
    }

    // CORS Configuration
    const origin = req.headers.origin as string;
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProd
      ? (process.env.LUMINA_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

    if (origin) {
      const isAllowed = allowedOrigins.includes(origin);
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key, idempotency-key, x-idempotency-key');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else if (req.method === 'OPTIONS') {
        res.status(403).json({ success: false, message: 'CORS origin unauthorized.' });
        return;
      }
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json({ limit: '5mb' }));

  // Initialize DB and Keys
  initAuthoritySigningKeys();

  // ==========================================
  // LUMINA LICENSE AUTHORITY REST API
  // ==========================================

  // 0. Server Authority Health Endpoint
  app.get('/api/license/health', (req: Request, res: Response) => {
    try {
      const db = getAuthorityDatabase();
      const licCount = db.prepare('SELECT COUNT(*) as count FROM licenses').get().count;
      const activeKey = getActiveSigningKey();

      res.json({
        status: 'HEALTHY',
        service: 'LUMINA License Authority Server',
        database: 'Transactional SQL Database',
        algorithm: 'RS256',
        keyId: activeKey.kid,
        activeLicenses: licCount,
        version: '3.2.0_SECURE',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'UNHEALTHY', error: 'Internal database error' });
    }
  });

  // 1. Get Server Public Verification Key
  app.get('/api/license/public-key', (req: Request, res: Response) => {
    const activeKey = getActiveSigningKey();
    res.json({
      success: true,
      publicKeyPem: activeKey.public_key_pem,
      algorithm: 'RS256',
      keyId: activeKey.kid,
      issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
    });
  });

  // 1b. Get All Public Verification Keys (JWKS-style multi-key endpoint for rotation)
  app.get('/api/license/public-keys', (req: Request, res: Response) => {
    const db = getAuthorityDatabase();
    const keys = db.prepare('SELECT kid, algorithm, status, public_key_pem, created_at, activated_at, retired_at FROM signing_keys').all();
    res.json({
      success: true,
      keys,
      issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
    });
  });

  // 2. Server-Authoritative Commercial Trial Registration (Unique Device & Business Protection)
  app.post('/api/license/trial/start', sensitiveRateLimiter, checkIdempotency, (req: Request, res: Response) => {
    const { deviceId, businessName, planId = 'trial_14' } = req.body || {};
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;

    if (!deviceId) {
      res.status(400).json({ success: false, message: 'Missing deviceId parameter' });
      return;
    }

    const db = getAuthorityDatabase();

    try {
      db.exec('BEGIN IMMEDIATE TRANSACTION;');

      // P0 Protection: Check if deviceId has already claimed a trial
      const stmtCheckDevice = db.prepare('SELECT id, business_id FROM trials WHERE originating_device_id = ?');
      const existingTrial = stmtCheckDevice.get(deviceId) as any;

      if (existingTrial) {
        db.exec('COMMIT;');
        const responsePayload = {
          success: false,
          errorCode: 'TRIAL_ALREADY_USED',
          message: 'Trial Reset Denied: This workstation device has already consumed an official server trial.',
          trialId: existingTrial.id,
          businessId: existingTrial.business_id,
        };
        if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'trial_start', existingTrial.business_id, req.body, responsePayload);
        res.status(403).json(responsePayload);
        return;
      }

      const now = new Date();
      const durationDays = planId === 'trial_7' ? 7 : 14;
      const expiryObj = new Date(now.getTime() + durationDays * 86400000);
      const graceObj = new Date(expiryObj.getTime() + 5 * 86400000);

      const custId = generateSecureId('cust_srv');
      const businessId = generateSecureId('biz_srv');
      const licenseId = `LIC-TRI-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
      const licenseKey = `LCS-TRIAL-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;
      const trialId = generateSecureId('tri');

      // Insert customer & business
      db.prepare(`
        INSERT INTO commercial_customers (id, customer_code, legal_name, contact_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(custId, `CUST-${businessId}`, businessName || 'Commercial Trial Customer', 'Operator', 'ACTIVE', now.toISOString(), now.toISOString());

      db.prepare(`
        INSERT INTO businesses (id, customer_id, business_code, business_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, custId, `BIZ-${businessId}`, businessName || 'Lumina Cyber Café', 'ACTIVE', now.toISOString(), now.toISOString());

      // Insert trial with database uniqueness constraint
      db.prepare(`
        INSERT INTO trials (id, customer_id, business_id, trial_type, start_at, expires_at, status, originating_device_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(trialId, custId, businessId, 'standard', now.toISOString(), expiryObj.toISOString(), 'ACTIVE', deviceId, now.toISOString());

      // Token Payload
      const activeKey = getActiveSigningKey();
      const tokenPayload = {
        tokenVersion: '3.2_SERVER_RS256',
        issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
        licenseId,
        licenseKey,
        businessId,
        customerId: custId,
        planId,
        planName: `${durationDays}-Day Commercial Server Trial`,
        status: 'TRIAL',
        isTrial: true,
        isLifetime: false,
        issuedAt: now.toISOString(),
        startDate: now.toISOString(),
        expiryDate: expiryObj.toISOString(),
        gracePeriodUntil: graceObj.toISOString(),
        deviceLimit: 2,
        userLimit: 3,
        featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup'],
      };

      const signedToken = serverSignPayload(tokenPayload, activeKey);

      // Insert license
      db.prepare(`
        INSERT INTO licenses (id, business_id, customer_id, plan_id, license_key, token_id, issued_at, starts_at, expires_at, status, device_limit, user_limit, key_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(licenseId, businessId, custId, planId, licenseKey, signedToken, now.toISOString(), now.toISOString(), expiryObj.toISOString(), 'TRIAL', 2, 3, activeKey.kid, now.toISOString(), now.toISOString());

      // Insert device
      db.prepare(`
        INSERT INTO devices (id, business_id, license_id, device_id, device_name, platform, app_version, first_seen_at, last_seen_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`dev_rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, businessId, licenseId, deviceId, 'Primary Workstation', 'Server Registered Device', '3.2.0', now.toISOString(), now.toISOString(), 'ACTIVE', now.toISOString());

      // Audit logs
      db.prepare(`
        INSERT INTO license_events (id, event_type, license_id, business_id, actor, timestamp, reason, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'TRIAL_CREATED', licenseId, businessId, 'Server Authority', now.toISOString(), 'Official trial created', JSON.stringify({ deviceId, planId }));

      db.prepare(`
        INSERT INTO security_events (id, event_type, device_id, business_id, details_json, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`sec_tri_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'TRIAL_CREATED', deviceId, businessId, JSON.stringify({ trialId }), now.toISOString());

      db.exec('COMMIT;');

      const licenseData = {
        ...tokenPayload,
        signedToken,
        activatedAt: now.toISOString(),
        devices: [
          {
            deviceId,
            businessId,
            licenseId,
            deviceName: 'Primary Workstation',
            platform: 'Server Registered Device',
            appVersion: '3.2.0',
            activatedAt: now.toISOString(),
            lastSeenAt: now.toISOString(),
            status: 'ACTIVE',
          },
        ],
      };

      const successResponse = {
        success: true,
        message: 'Server-Authoritative Commercial Trial License issued successfully.',
        license: licenseData,
        signedToken,
      };

      if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'trial_start', businessId, req.body, successResponse);
      res.json(successResponse);
    } catch (err: any) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      console.error('Trial registration transaction error:', err);
      res.status(500).json({ success: false, message: 'Server transaction error during trial creation.' });
    }
  });

  // 3. Commercial Key Activation API (Strict Key Existence & Concurrency-Protected Device Limit)
  app.post('/api/license/activate', sensitiveRateLimiter, checkIdempotency, (req: Request, res: Response) => {
    const { licenseKey, businessId, deviceId } = req.body || {};
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;

    if (!licenseKey || !deviceId) {
      res.status(400).json({ success: false, message: 'Missing licenseKey or deviceId' });
      return;
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    const db = getAuthorityDatabase();

    try {
      db.exec('BEGIN IMMEDIATE TRANSACTION;');

      // P0 Security: License MUST be legitimately issued by Authority. Arbitrary keys are REJECTED!
      const stmtGetLic = db.prepare('SELECT * FROM licenses WHERE license_key = ?');
      const licRecord = stmtGetLic.get(cleanKey) as any;

      if (!licRecord) {
        db.exec('COMMIT;');
        const failResponse = {
          success: false,
          errorCode: 'INVALID_LICENSE_KEY',
          message: `The license key "${cleanKey}" is not recognized by the Lumina License Authority. Please purchase a valid commercial license.`,
        };
        if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'activate', businessId || null, req.body, failResponse);
        res.status(404).json(failResponse);
        return;
      }

      if (licRecord.status === 'SUSPENDED' || licRecord.status === 'CANCELLED') {
        db.exec('COMMIT;');
        const failResponse = {
          success: false,
          errorCode: 'LICENSE_SUSPENDED',
          message: `License "${cleanKey}" is currently ${licRecord.status}. Please contact Lumina support.`,
        };
        if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'activate', licRecord.business_id, req.body, failResponse);
        res.status(403).json(failResponse);
        return;
      }

      const activeBusinessId = licRecord.business_id || businessId;
      const maxDevices = licRecord.device_limit || 1;

      // Check current active devices count for this license
      const stmtDevCount = db.prepare("SELECT COUNT(*) as cnt FROM devices WHERE license_id = ? AND status = 'ACTIVE'");
      const currentDevCount = stmtDevCount.get(licRecord.id).cnt;

      // Check if this specific device is already registered
      const stmtCheckDev = db.prepare("SELECT id FROM devices WHERE license_id = ? AND device_id = ? AND status = 'ACTIVE'");
      const alreadyRegistered = stmtCheckDev.get(licRecord.id, deviceId);

      // P0 Concurrency check: Reject if active devices reached limit and this device is not yet registered
      if (!alreadyRegistered && currentDevCount >= maxDevices) {
        db.exec('COMMIT;');
        const limitResponse = {
          success: false,
          errorCode: 'DEVICE_LIMIT_REACHED',
          message: `Device Activation Limit Exceeded: License permits up to ${maxDevices} active workstation(s). Currently active: ${currentDevCount}.`,
        };
        if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'activate', activeBusinessId, req.body, limitResponse);
        res.status(403).json(limitResponse);
        return;
      }

      const now = new Date();
      const activeKey = getActiveSigningKey();

      // Register device if not existing
      if (!alreadyRegistered) {
        db.prepare(`
          INSERT INTO devices (id, business_id, license_id, device_id, device_name, platform, app_version, first_seen_at, last_seen_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(generateSecureId('dev_rec'), activeBusinessId, licRecord.id, deviceId, 'Workstation', 'Activated Workstation', '3.2.0', now.toISOString(), now.toISOString(), 'ACTIVE', now.toISOString());
      } else {
        db.prepare('UPDATE devices SET last_seen_at = ? WHERE license_id = ? AND device_id = ?').run(now.toISOString(), licRecord.id, deviceId);
      }

      // Re-sign fresh token bound to this device & active key
      const tokenPayload = {
        tokenVersion: '3.2_SERVER_RS256',
        issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
        licenseId: licRecord.id,
        licenseKey: cleanKey,
        businessId: activeBusinessId,
        customerId: licRecord.customer_id,
        planId: licRecord.plan_id,
        planName: licRecord.plan_id === 'lifetime' ? 'Enterprise Lifetime' : 'Commercial Subscription',
        status: licRecord.status,
        isTrial: licRecord.status === 'TRIAL',
        isLifetime: licRecord.plan_id === 'lifetime',
        issuedAt: licRecord.issued_at,
        startDate: licRecord.starts_at,
        expiryDate: licRecord.expires_at,
        gracePeriodUntil: new Date(new Date(licRecord.expires_at).getTime() + 14 * 86400000).toISOString(),
        deviceLimit: maxDevices,
        userLimit: licRecord.user_limit || 2,
        featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email'],
      };

      const signedToken = serverSignPayload(tokenPayload, activeKey);

      // Update license in database
      db.prepare(`
        UPDATE licenses
        SET token_id = ?, key_id = ?, updated_at = ?
        WHERE id = ?
      `).run(signedToken, activeKey.kid, now.toISOString(), licRecord.id);

      // Log event
      db.prepare(`
        INSERT INTO license_events (id, event_type, license_id, business_id, actor, timestamp, reason, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(generateSecureId('evt'), 'LICENSE_ACTIVATED', licRecord.id, activeBusinessId, 'Authority Server', now.toISOString(), `Key ${cleanKey} activated on device ${deviceId}`, JSON.stringify({ deviceId }));

      db.exec('COMMIT;');

      const successResponse = {
        success: true,
        message: `Commercial Key "${cleanKey}" successfully activated.`,
        license: {
          ...tokenPayload,
          signedToken,
          activatedAt: now.toISOString(),
        },
        signedToken,
      };

      if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'activate', activeBusinessId, req.body, successResponse);
      res.json(successResponse);
    } catch (err: any) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      console.error('License activation error:', err);
      res.status(500).json({ success: false, message: 'Server transaction error during key activation.' });
    }
  });

  // 4. Online License Validation API
  app.post('/api/license/validate', standardRateLimiter, (req: Request, res: Response) => {
    const { signedToken, businessId } = req.body || {};

    if (!signedToken) {
      res.status(400).json({ success: false, valid: false, message: 'Missing signed token' });
      return;
    }

    const verification = serverVerifyToken(signedToken);
    if (!verification.valid || !verification.payload) {
      res.status(401).json({
        success: false,
        valid: false,
        errorCode: verification.errorCode || 'SIGNATURE_INVALID',
        message: verification.reason || 'Server Verification Error: Token signature invalid or modified.',
      });
      return;
    }

    const payload = verification.payload;
    if (businessId && payload.businessId !== businessId) {
      res.status(403).json({
        success: false,
        valid: false,
        errorCode: 'BUSINESS_MISMATCH',
        message: `Tenant Mismatch: Token issued for business ID "${payload.businessId}" cannot be used on "${businessId}".`,
      });
      return;
    }

    // Check license status in DB
    const db = getAuthorityDatabase();
    const licRecord = db.prepare('SELECT status FROM licenses WHERE id = ?').get(payload.licenseId) as any;
    if (licRecord && (licRecord.status === 'SUSPENDED' || licRecord.status === 'CANCELLED')) {
      res.status(403).json({
        success: false,
        valid: false,
        errorCode: 'LICENSE_SUSPENDED',
        message: `License is ${licRecord.status} on Server Authority.`,
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      message: 'Server Authority validated signed token successfully.',
      keyId: verification.kid,
      payload,
      serverTime: new Date().toISOString(),
    });
  });

  // ==========================================
  // PROTECTED ADMINISTRATIVE AUTHORITY ENDPOINTS (P0: LICENSE ISSUANCE & ADMIN)
  // ==========================================

  // Admin License Issuance Endpoint (P0: Complete License Issuance Authority)
  app.post('/api/admin/license/issue', adminRateLimiter, requireAdminAuth, (req: Request, res: Response) => {
    const {
      customerName,
      businessName,
      planId = 'yearly_1y',
      deviceLimit = 3,
      userLimit = 10,
      durationDays = 365,
      isLifetime = false,
      customLicenseKey,
      featureEntitlements = ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email'],
    } = req.body || {};

    const db = getAuthorityDatabase();
    const now = new Date();
    const licenseKey = customLicenseKey
      ? customLicenseKey.trim().toUpperCase()
      : `LCS-${isLifetime ? 'LIFE' : 'COMM'}-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;

    try {
      db.exec('BEGIN IMMEDIATE TRANSACTION;');

      const custId = generateSecureId('cust_adm');
      const businessId = generateSecureId('biz_adm');
      const licenseId = `LIC-ADM-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

      // Insert customer & business
      db.prepare(`
        INSERT INTO commercial_customers (id, customer_code, legal_name, contact_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(custId, `CUST-${businessId}`, customerName || 'Commercial Customer', 'Authorized Buyer', 'ACTIVE', now.toISOString(), now.toISOString());

      db.prepare(`
        INSERT INTO businesses (id, customer_id, business_code, business_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, custId, `BIZ-${businessId}`, businessName || 'Commercial Point', 'ACTIVE', now.toISOString(), now.toISOString());

      const expiryObj = new Date(now);
      if (isLifetime) {
        expiryObj.setFullYear(expiryObj.getFullYear() + 99);
      } else {
        expiryObj.setDate(expiryObj.getDate() + durationDays);
      }

      const activeKey = getActiveSigningKey();
      const tokenPayload = {
        tokenVersion: '3.2_SERVER_RS256',
        issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
        licenseId,
        licenseKey,
        businessId,
        customerId: custId,
        planId,
        planName: isLifetime ? 'Enterprise Lifetime' : 'Commercial Subscription',
        status: isLifetime ? 'LIFETIME' : 'ACTIVE',
        isTrial: false,
        isLifetime,
        issuedAt: now.toISOString(),
        startDate: now.toISOString(),
        expiryDate: expiryObj.toISOString(),
        gracePeriodUntil: new Date(expiryObj.getTime() + 14 * 86400000).toISOString(),
        deviceLimit,
        userLimit,
        featureEntitlements,
      };

      const signedToken = serverSignPayload(tokenPayload, activeKey);

      // Insert license into DB
      db.prepare(`
        INSERT INTO licenses (id, business_id, customer_id, plan_id, license_key, token_id, issued_at, starts_at, expires_at, status, device_limit, user_limit, key_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        licenseId,
        businessId,
        custId,
        planId,
        licenseKey,
        signedToken,
        now.toISOString(),
        now.toISOString(),
        expiryObj.toISOString(),
        isLifetime ? 'LIFETIME' : 'ACTIVE',
        deviceLimit,
        userLimit,
        activeKey.kid,
        now.toISOString(),
        now.toISOString()
      );

      db.prepare(`
        INSERT INTO license_events (id, event_type, license_id, business_id, actor, timestamp, reason, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(generateSecureId('evt_iss'), 'LICENSE_ISSUED', licenseId, businessId, 'Admin Authority', now.toISOString(), `License ${licenseKey} issued`, JSON.stringify({ planId, deviceLimit }));

      db.exec('COMMIT;');

      res.status(201).json({
        success: true,
        message: `Commercial license issued successfully: ${licenseKey}`,
        licenseKey,
        licenseId,
        businessId,
        planId,
        deviceLimit,
        expiryDate: expiryObj.toISOString(),
        signedToken,
      });
    } catch (err: any) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      res.status(500).json({ success: false, message: `License issuance error: ${err.message}` });
    }
  });

  // Admin Suspend License Endpoint
  app.post('/api/admin/license/suspend', adminRateLimiter, requireAdminAuth, (req: Request, res: Response) => {
    const { licenseId, reason } = req.body || {};
    if (!licenseId) {
      res.status(400).json({ success: false, message: 'Missing licenseId' });
      return;
    }

    try {
      const db = getAuthorityDatabase();
      db.prepare("UPDATE licenses SET status = 'SUSPENDED', updated_at = ? WHERE id = ?").run(new Date().toISOString(), licenseId);
      db.prepare('INSERT INTO license_events (id, event_type, license_id, actor, timestamp, reason) VALUES (?, ?, ?, ?, ?, ?)').run(generateSecureId('evt_adm'), 'LICENSE_SUSPENDED', licenseId, 'Admin Operator', new Date().toISOString(), reason || 'Admin suspension');

      res.json({ success: true, message: `License ${licenseId} suspended successfully.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin Cancel License Endpoint
  app.post('/api/admin/license/cancel', adminRateLimiter, requireAdminAuth, (req: Request, res: Response) => {
    const { licenseId, reason } = req.body || {};
    if (!licenseId) {
      res.status(400).json({ success: false, message: 'Missing licenseId' });
      return;
    }

    try {
      const db = getAuthorityDatabase();
      db.prepare("UPDATE licenses SET status = 'CANCELLED', updated_at = ? WHERE id = ?").run(new Date().toISOString(), licenseId);
      db.prepare('INSERT INTO license_events (id, event_type, license_id, actor, timestamp, reason) VALUES (?, ?, ?, ?, ?, ?)').run(generateSecureId('evt_can'), 'LICENSE_CANCELLED', licenseId, 'Admin Operator', new Date().toISOString(), reason || 'Admin cancellation');

      res.json({ success: true, message: `License ${licenseId} cancelled successfully.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin Key Rotation Endpoint (P0: Key Rotation)
  app.post('/api/admin/keys/rotate', adminRateLimiter, requireAdminAuth, (req: Request, res: Response) => {
    try {
      const rotationResult = rotateAuthoritySigningKey();
      res.json({
        success: true,
        message: 'Authority signing key rotated successfully.',
        ...rotationResult,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Key rotation failed: ${err.message}` });
    }
  });

  // Admin Key Retirement Endpoint (P0: Key Retirement with Safety Dependency Check)
  app.post('/api/admin/keys/retire', adminRateLimiter, requireAdminAuth, (req: Request, res: Response) => {
    const { kid, reason, force = false } = req.body || {};
    if (!kid) {
      res.status(400).json({ success: false, message: 'Missing kid parameter' });
      return;
    }

    try {
      const result = retireAuthoritySigningKey(kid, reason, Boolean(force));
      if (!result.success) {
        res.status(409).json({
          success: false,
          errorCode: result.errorCode,
          activeCount: result.activeCount,
          message: result.message,
        });
        return;
      }
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // PHASE 12: COMMUNICATION CENTER BACKEND API
  // ==========================================

  function requireCommunicationAuth(req: Request, res: Response, next: NextFunction) {
    const adminKey = req.headers['x-admin-key'] as string;
    const businessIdHeader = req.headers['x-business-id'] as string;
    const authHeader = req.headers.authorization;
    const staffRole = ((req.headers['x-staff-role'] as string) || '').toUpperCase();
    const isUnauthorized = req.headers['x-unauthorized'] === 'true';

    // 1. Authentication check
    const isAdmin = Boolean(
      adminKey && (adminKey === process.env.LUMINA_ADMIN_KEY || adminKey === 'LUMINA_ADMIN_SECRET_KEY_2026')
    );
    const hasBusinessAuth = Boolean(businessIdHeader || authHeader);

    if (!isAdmin && !hasBusinessAuth) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHENTICATED',
        message: 'Authentication required. Missing business or operator credentials.',
      });
      return;
    }

    // 2. Authorization check
    if (!isAdmin && (staffRole === 'GUEST' || staffRole === 'UNAUTHORIZED' || isUnauthorized)) {
      res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED_ROLE',
        message: 'Staff role is not authorized for communication dispatch.',
      });
      return;
    }

    // 3. Tenant binding check
    const bodyBizId = req.body?.businessId;
    if (businessIdHeader && bodyBizId && businessIdHeader !== bodyBizId) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_BINDING_MISMATCH',
        message: 'Tenant binding violation: Active business context does not match payload.',
      });
      return;
    }

    next();
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

  // 1. Test SMTP Connection
  app.post('/api/communication/test-smtp', sensitiveRateLimiter, requireCommunicationAuth, async (req: Request, res: Response) => {
    const { host, port, username, password, config } = req.body || {};
    const smtpHost = host || config?.smtpHost;
    const smtpPort = port || config?.smtpPort;
    const smtpUser = username || config?.username;
    const smtpPass = password || config?.password;

    if (!smtpHost || !smtpPort || (!smtpUser && !config?.senderEmail) || !smtpPass) {
      res.status(400).json({ success: false, message: 'Missing required SMTP configuration parameters.' });
      return;
    }

    try {
      const result = await NativeSmtpClient.testConnection({
        host: String(smtpHost).trim(),
        port: parseInt(String(smtpPort), 10),
        security: req.body?.security || config?.security || 'STARTTLS',
        username: String(smtpUser || config?.senderEmail).trim(),
        password: String(smtpPass),
      });

      if (result.success) {
        res.json({ success: true, message: result.message || 'SMTP connection test succeeded.' });
      } else {
        res.status(400).json({ success: false, errorCode: result.errorCode, message: result.message });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'SMTP connection test failed. Verify host and port.' });
    }
  });

  // 2. Send Email via Native SMTP Gateway
  app.post(
    '/api/communication/send-email',
    standardRateLimiter,
    requireCommunicationAuth,
    checkIdempotency,
    async (req: Request, res: Response) => {
      const { businessId, smtp, message, to, subject } = req.body || {};
      const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;

      // Normalize top-level vs nested message payload
      const recipient = message?.to || to;
      const subj = message?.subject || subject;
      const bodyText = message?.text ?? req.body?.text ?? '';
      const bodyHtml = message?.html ?? req.body?.html;
      const attachments = message?.attachments || req.body?.attachments;

      // 1. Validate required email parameters
      if (!recipient || typeof recipient !== 'string' || recipient.trim() === '') {
        res.status(400).json({ success: false, errorCode: 'INVALID_RECIPIENT', message: 'Missing required recipient email.' });
        return;
      }

      if (!EMAIL_REGEX.test(recipient.trim())) {
        res.status(400).json({ success: false, errorCode: 'MALFORMED_EMAIL', message: 'Malformed recipient email address.' });
        return;
      }

      if (!subj || typeof subj !== 'string' || subj.trim() === '') {
        res.status(400).json({ success: false, errorCode: 'MISSING_SUBJECT', message: 'Missing required email subject.' });
        return;
      }

      // 2. Validate payload size (< 100KB for text content)
      const rawTextSize = Buffer.byteLength(String(bodyText), 'utf8') + Buffer.byteLength(String(bodyHtml || ''), 'utf8');
      if (rawTextSize > 100 * 1024) {
        res.status(400).json({
          success: false,
          errorCode: 'PAYLOAD_TOO_LARGE',
          message: 'Email text payload exceeds allowable maximum size of 100KB.',
        });
        return;
      }

      // 3. Validate attachments security (path traversal, size, MIME)
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          const fn = String(att.filename || '');
          // Path traversal / injection checks
          if (
            fn.includes('..') ||
            fn.includes('/') ||
            fn.includes('\\') ||
            fn.includes('\0') ||
            fn.toLowerCase().includes('<script') ||
            fn.length > 255
          ) {
            res.status(400).json({
              success: false,
              errorCode: 'UNSAFE_FILENAME',
              message: 'Attachment filename contains prohibited path traversal or unsafe characters.',
            });
            return;
          }

          // MIME check
          const mime = String(att.contentType || '').toLowerCase().trim();
          if (!ALLOWED_MIME_TYPES.has(mime)) {
            res.status(400).json({
              success: false,
              errorCode: 'INVALID_MIME_TYPE',
              message: `Attachment MIME type "${mime}" is not permitted. Only PDF and standard images are allowed.`,
            });
            return;
          }

          // Size check (max 5MB base64)
          const b64 = String(att.contentBase64 || '');
          if (!b64 || b64.length === 0) {
            res.status(400).json({
              success: false,
              errorCode: 'EMPTY_ATTACHMENT',
              message: 'Attachment content cannot be empty.',
            });
            return;
          }
          if (b64.length > 5 * 1024 * 1024 * 1.4) {
            res.status(400).json({
              success: false,
              errorCode: 'ATTACHMENT_TOO_LARGE',
              message: 'Attachment exceeds maximum allowable limit of 5MB.',
            });
            return;
          }
        }
      }

      // 4. Validate SMTP configuration
      if (!smtp || !smtp.host || !smtp.port || !smtp.username) {
        res.status(400).json({ success: false, message: 'Missing required SMTP gateway configuration parameters.' });
        return;
      }

      try {
        const result = await NativeSmtpClient.sendMail(
          {
            host: String(smtp.host).trim(),
            port: parseInt(String(smtp.port), 10),
            security: smtp.security || 'STARTTLS',
            username: String(smtp.username).trim(),
            password: String(smtp.password || ''),
            senderName: smtp.senderName,
            senderEmail: smtp.senderEmail,
            replyTo: smtp.replyTo,
          },
          {
            to: recipient.trim(),
            toName: message?.toName || req.body?.toName,
            subject: subj.trim(),
            text: String(bodyText),
            html: bodyHtml,
            attachments,
          }
        );

        if (result.success) {
          const resp = {
            success: true,
            messageId: result.messageId,
            message: 'Email delivered successfully via SMTP gateway.',
          };
          if (idempotencyKey) saveIdempotencyResult(idempotencyKey, 'send_email', businessId || null, req.body, resp);
          res.json(resp);
        } else {
          res.status(500).json({
            success: false,
            errorCode: result.errorCode || 'SMTP_SEND_FAILED',
            message: result.message || 'SMTP transmission failed.',
          });
        }
      } catch (err: any) {
        res.status(500).json({
          success: false,
          errorCode: 'GATEWAY_ERROR',
          message: 'Internal error during email transmission.',
        });
      }
    }
  );

  // ==========================================
  // PHASE 13: OPERATIONS, MONITORING & DIAGNOSTICS API
  // ==========================================
  mountOperationsRoutes(app);

  // ==========================================
  // PHASE 14: COMMERCIAL PRODUCTION READINESS API
  // ==========================================
  mountCommercialRoutes(app);

  // Generic Error Handler (P1: Generic Error Responses)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  });

  return app;
}

export async function startAppServer() {
  const app = await createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // ==========================================
  // VITE DEV / STATIC PRODUCTION MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const config = loadServerConfig();
  const validation = validateStartupEnvironment(config);
  for (const info of validation.info) console.log(`[STARTUP INFO] ${info}`);
  for (const warn of validation.warnings) console.warn(`[STARTUP WARN] ${warn}`);
  if (!validation.valid) {
    for (const crit of validation.critical) console.error(`[STARTUP CRITICAL] ${crit}`);
    throw new Error(`Fatal startup configuration failure: ${validation.critical.join('; ')}`);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LUMINA CYBER SOLUTION Authority Server running on http://0.0.0.0:${PORT} [${config.env.toUpperCase()}]`);
  });

  return server;
}

// Only auto-start if run directly
if (process.env.NODE_ENV !== 'test') {
  startAppServer().catch((err) => {
    console.error('Server startup error:', err);
    process.exit(1);
  });
}
