/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Centralized Server & Production Configuration
 * Phase 14 Commercial Production Readiness
 */

import fs from 'node:fs';
import path from 'node:path';

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface ServerConfig {
  env: AppEnvironment;
  version: string;
  schemaVersion: number;
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  database: {
    path: string;
    walEnabled: boolean;
    busyTimeoutMs: number;
  };
  backup: {
    directory: string;
    retentionDays: number;
    maxSnapshots: number;
  };
  storage: {
    attachmentsDir: string;
    tempDir: string;
  };
  security: {
    adminKey: string;
    sessionSecret: string;
    tokenTtlSeconds: number;
    isUsingDefaultAdminKey: boolean;
  };
  licensing: {
    authorityIssuer: string;
    defaultKeyId: string;
    enforcementMode: 'STRICT' | 'PERMISSIVE';
  };
  communication: {
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: 'STARTTLS' | 'TLS' | 'NONE';
    smtpUser: string;
    hasPassword: boolean;
  };
  rateLimiting: {
    standardMax: number;
    sensitiveMax: number;
    windowMs: number;
  };
  diagnostics: {
    enabled: boolean;
    deepChecksAllowed: boolean;
  };
  updates: {
    channel: 'stable' | 'beta' | 'pilot';
    autoUpdateEnabled: boolean;
    releaseId: string;
    buildId: string;
  };
}

const DEFAULT_DEV_ADMIN_KEY = 'LUMINA_ADMIN_SECRET_KEY_2026';

export function loadServerConfig(): ServerConfig {
  const rawEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  let env: AppEnvironment = 'development';
  if (rawEnv === 'production' || rawEnv === 'prod') env = 'production';
  else if (rawEnv === 'staging') env = 'staging';
  else if (rawEnv === 'test') env = 'test';

  const defaultDbPath = path.resolve(process.cwd(), 'src', 'server', 'data_server_authority.sqlite');
  const dbPath = process.env.LUMINA_DB_PATH ? path.resolve(process.env.LUMINA_DB_PATH) : defaultDbPath;

  const defaultBackupDir = path.resolve(path.dirname(dbPath), 'backups');

  const backupDir = process.env.LUMINA_BACKUP_DIR
    ? path.resolve(process.env.LUMINA_BACKUP_DIR)
    : defaultBackupDir;

  const defaultAttachmentsDir = path.resolve(path.dirname(dbPath), 'storage', 'attachments');
  const attachmentsDir = process.env.LUMINA_STORAGE_DIR
    ? path.resolve(process.env.LUMINA_STORAGE_DIR)
    : defaultAttachmentsDir;

  const adminKey = process.env.LUMINA_ADMIN_KEY || DEFAULT_DEV_ADMIN_KEY;
  const isUsingDefaultAdminKey = adminKey === DEFAULT_DEV_ADMIN_KEY;

  const corsOriginsRaw = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173';
  const corsOrigins = corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);

  return {
    env,
    version: '3.4.0_PROD',
    schemaVersion: 2,
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      corsOrigins,
    },
    database: {
      path: dbPath,
      walEnabled: true,
      busyTimeoutMs: parseInt(process.env.LUMINA_SQLITE_TIMEOUT || '5000', 10),
    },
    backup: {
      directory: backupDir,
      retentionDays: parseInt(process.env.LUMINA_BACKUP_RETENTION_DAYS || '30', 10),
      maxSnapshots: parseInt(process.env.LUMINA_BACKUP_MAX_SNAPSHOTS || '50', 10),
    },
    storage: {
      attachmentsDir,
      tempDir: path.resolve(path.dirname(dbPath), 'storage', 'temp'),
    },
    security: {
      adminKey,
      sessionSecret: process.env.LUMINA_SESSION_SECRET || 'dev_session_secret_change_in_prod',
      tokenTtlSeconds: parseInt(process.env.LUMINA_TOKEN_TTL || '86400', 10),
      isUsingDefaultAdminKey,
    },
    licensing: {
      authorityIssuer: 'LUMINA_LICENSE_AUTHORITY',
      defaultKeyId: 'LUMINA_SERVER_KEY_2026_01',
      enforcementMode: env === 'production' ? 'STRICT' : 'PERMISSIVE',
    },
    communication: {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpSecurity: (process.env.SMTP_SECURITY as any) || 'STARTTLS',
      smtpUser: process.env.SMTP_USER || '',
      hasPassword: Boolean(process.env.SMTP_PASSWORD),
    },
    rateLimiting: {
      standardMax: parseInt(process.env.RATE_LIMIT_STANDARD || '120', 10),
      sensitiveMax: parseInt(process.env.RATE_LIMIT_SENSITIVE || '40', 10),
      windowMs: 60 * 1000,
    },
    diagnostics: {
      enabled: true,
      deepChecksAllowed: env !== 'production' || !isUsingDefaultAdminKey,
    },
    updates: {
      channel: (process.env.UPDATE_CHANNEL as any) || 'stable',
      autoUpdateEnabled: false, // Update Method = MANUAL / ADMINISTRATOR CONTROLLED
      releaseId: 'REL-2026-PHASE14-PROD',
      buildId: 'BUILD-3ECDC90',
    },
  };
}

export interface EnvironmentValidationResult {
  valid: boolean;
  critical: string[];
  warnings: string[];
  info: string[];
}

export function validateStartupEnvironment(config: ServerConfig): EnvironmentValidationResult {
  const critical: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  info.push(`Active Environment Profile: ${config.env.toUpperCase()}`);
  info.push(`App Version: ${config.version} | Schema Version: ${config.schemaVersion}`);
  info.push(`Database Target: ${config.database.path}`);

  // 1. Production Mode Security Enforcement
  if (config.env === 'production') {
    if (config.security.isUsingDefaultAdminKey) {
      critical.push(
        'SECURITY CRITICAL: Default administrative secret key (LUMINA_ADMIN_KEY) is in use in production mode. A secure, unique LUMINA_ADMIN_KEY must be configured.'
      );
    }

    if (config.security.sessionSecret === 'dev_session_secret_change_in_prod') {
      warnings.push(
        'SECURITY WARNING: Default development session secret is active. Configure LUMINA_SESSION_SECRET for hardened production deployments.'
      );
    }
  } else {
    if (config.security.isUsingDefaultAdminKey) {
      info.push('Notice: Development default administrative key is active.');
    }
  }

  // 2. Database Directory Usability
  try {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    // Check write capability
    const testProbe = path.join(dbDir, `.probe_write_${Date.now()}`);
    fs.writeFileSync(testProbe, 'ok');
    fs.unlinkSync(testProbe);
    info.push(`Database storage directory verified writable: ${dbDir}`);
  } catch (err: any) {
    critical.push(`FILESYSTEM CRITICAL: Database directory is not writable: ${err.message}`);
  }

  // 3. Backup Directory Usability
  try {
    if (!fs.existsSync(config.backup.directory)) {
      fs.mkdirSync(config.backup.directory, { recursive: true });
    }
    const backupProbe = path.join(config.backup.directory, `.probe_backup_${Date.now()}`);
    fs.writeFileSync(backupProbe, 'ok');
    fs.unlinkSync(backupProbe);
    info.push(`Backup destination directory verified usable: ${config.backup.directory}`);
  } catch (err: any) {
    critical.push(`FILESYSTEM CRITICAL: Backup directory is not usable: ${err.message}`);
  }

  // 4. Port Configuration Validity
  if (isNaN(config.server.port) || config.server.port < 1 || config.server.port > 65535) {
    critical.push(`NETWORK CRITICAL: Server port ${config.server.port} is outside valid port range (1-65535).`);
  }

  // 5. CORS Configuration Audit
  if (config.server.corsOrigins.includes('*') && config.env === 'production') {
    warnings.push('SECURITY WARNING: Wildcard CORS origin (*) is configured in production environment.');
  }

  const valid = critical.length === 0;
  return {
    valid,
    critical,
    warnings,
    info,
  };
}

/**
 * Returns a fully sanitized copy of the server configuration safe for diagnostics and logging
 */
export function getSanitizedConfigForDiagnostics(config: ServerConfig): Record<string, any> {
  return {
    env: config.env,
    version: config.version,
    schemaVersion: config.schemaVersion,
    server: {
      port: config.server.port,
      host: config.server.host,
      corsOrigins: config.server.corsOrigins,
    },
    database: {
      path: '[CONFIGURED_PATH]',
      walEnabled: config.database.walEnabled,
      busyTimeoutMs: config.database.busyTimeoutMs,
    },
    backup: {
      directory: '[CONFIGURED_BACKUP_DIR]',
      retentionDays: config.backup.retentionDays,
      maxSnapshots: config.backup.maxSnapshots,
    },
    security: {
      adminKeyConfigured: !config.security.isUsingDefaultAdminKey,
      tokenTtlSeconds: config.security.tokenTtlSeconds,
    },
    licensing: {
      authorityIssuer: config.licensing.authorityIssuer,
      defaultKeyId: config.licensing.defaultKeyId,
      enforcementMode: config.licensing.enforcementMode,
    },
    communication: {
      smtpHost: config.communication.smtpHost,
      smtpPort: config.communication.smtpPort,
      smtpSecurity: config.communication.smtpSecurity,
      hasSmtpUser: Boolean(config.communication.smtpUser),
      hasPassword: config.communication.hasPassword,
    },
    rateLimiting: config.rateLimiting,
    updates: config.updates,
    secretsRedacted: true,
  };
}
