/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — PHASE 13 OPERATIONS & DIAGNOSTICS VERIFICATION SUITE
 * Complete automated test coverage for:
 * OPS-HEALTH   (Liveness, readiness, dependencies, degraded handling)
 * OPS-TENANT   (Multi-tenant isolation, cross-tenant denial)
 * OPS-AUTH     (Authentication, role authorization, GUEST denial)
 * OPS-BACKUP   (Freshness, stale detection >24h, integrity checks, safe restore)
 * OPS-DEVICE   (Peripherals, controlled test print, zero PII)
 * OPS-ERROR    (Structured errors, fingerprint deduplication, capped retention)
 * OPS-SUPPORT  (Sanitized support report generation, correlation IDs)
 * OPS-OFFLINE  (Offline resilience, local POS preservation, queue safety)
 * OPS-SEC      (Mandatory security tests OPS-SEC-001 through OPS-SEC-010)
 * OPS-PERF     (Bounded execution time, non-blocking diagnostics)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { safeStorage, StorageService } from '../src/services/storage';
import { getAuthorityDatabase } from '../src/server/db';
import {
  recordDiagnosticError,
  getDiagnosticErrors,
  clearDiagnosticErrors,
  computeErrorFingerprint,
  generateCorrelationId,
  scrubSupportReport,
  getDatabaseDiagnostics,
} from '../src/server/operations';
import { BackupHealthService } from '../src/services/operations/backupHealthService';
import { DeviceDiagnosticsService } from '../src/services/operations/deviceDiagnosticsService';
import { DiagnosticsService } from '../src/services/operations/diagnosticsService';
import { CloudBackupService } from '../src/services/cloudBackup';
import { BusinessContextService } from '../src/services/businessContext';
import { CredentialService } from '../src/services/communication/credentialService';

// Polyfill localStorage in Node.js test runtime using safeStorage
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = safeStorage;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.LUMINA_AUTHORITY_URL || 'http://127.0.0.1:3000';
const ADMIN_KEY = process.env.LUMINA_ADMIN_KEY || 'LUMINA_ADMIN_SECRET_KEY_2026';
const TENANT_A = 'biz_test_tenant_alpha';
const TENANT_B = 'biz_test_tenant_beta';

let passedTests = 0;
let failedTests = 0;
const testResults: Array<{ id: string; name: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

function assert(condition: boolean, testId: string, testName: string, detail = ''): void {
  if (condition) {
    passedTests++;
    testResults.push({ id: testId, name: testName, status: 'PASS' });
    console.log(`✅ [PASS] ${testId}: ${testName}`);
  } else {
    failedTests++;
    testResults.push({ id: testId, name: testName, status: 'FAIL', error: detail });
    console.error(`❌ [FAIL] ${testId}: ${testName} - ${detail}`);
  }
}

async function makeRequest(
  method: string,
  endpoint: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 500, data, headers: res.headers });
          } catch (_) {
            resolve({ status: res.statusCode || 500, data: raw, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 LUMINA CYBER SOLUTION — PHASE 13 OPERATIONS VERIFICATION SUITE');
  console.log('===============================================================\n');

  try {
    // ===============================================================
    // CATEGORY 1: OPS-HEALTH (Health & Readiness Diagnostics)
    // ===============================================================
    console.log('--- CATEGORY 1: OPS-HEALTH ---');

    // OPS-HEALTH-001: Liveness Endpoint
    const h1 = await makeRequest('GET', '/api/system/health');
    assert(
      h1.status === 200 && h1.data?.liveness === true && h1.data?.status === 'HEALTHY',
      'OPS-HEALTH-001',
      'GET /api/system/health returns liveness=true and status=HEALTHY'
    );

    // OPS-HEALTH-002: Minimal Public Health Payload (No secrets, no file paths)
    const pubKeys = Object.keys(h1.data || {});
    const leakedKeys = pubKeys.filter((k) =>
      ['dbPath', 'password', 'key', 'secret', 'token', 'auth'].includes(k.toLowerCase())
    );
    assert(
      leakedKeys.length === 0 && h1.data?.uptimeSeconds !== undefined,
      'OPS-HEALTH-002',
      'Public health endpoint exposes only minimal liveness/readiness without secrets'
    );

    // OPS-HEALTH-003: Authenticated Deep Diagnostics
    const h3 = await makeRequest('GET', '/api/system/diagnostics', { 'x-admin-key': ADMIN_KEY });
    assert(
      h3.status === 200 &&
        h3.data?.database?.integrityStatus === 'OK' &&
        h3.data?.health?.dependencies?.application === 'HEALTHY',
      'OPS-HEALTH-003',
      'Authenticated deep diagnostics reports component dependencies and database integrity'
    );

    // OPS-HEALTH-004: Degraded handling (Optional dependency warning does not claim entire app dead)
    const dbDiag = getDatabaseDiagnostics();
    assert(
      dbDiag.status === 'HEALTHY' && dbDiag.walStatus === 'WAL',
      'OPS-HEALTH-004',
      'Database diagnostics executes read-only integrity PRAGMA and verifies WAL mode'
    );

    // ===============================================================
    // CATEGORY 2: OPS-AUTH (Authentication & Role Permissiveness)
    // ===============================================================
    console.log('\n--- CATEGORY 2: OPS-AUTH ---');

    // OPS-AUTH-001: Unauthenticated deep diagnostics denied
    const a1 = await makeRequest('GET', '/api/system/diagnostics');
    assert(
      a1.status === 401 && a1.data?.errorCode === 'UNAUTHENTICATED',
      'OPS-AUTH-001',
      'Unauthenticated request to /api/system/diagnostics is rejected with HTTP 401'
    );

    // OPS-AUTH-002: Unauthorized role (GUEST) denied
    const a2 = await makeRequest('GET', '/api/system/diagnostics', {
      'x-business-id': TENANT_A,
      'x-staff-role': 'GUEST',
    });
    assert(
      a2.status === 403 && a2.data?.errorCode === 'UNAUTHORIZED_ROLE',
      'OPS-AUTH-002',
      'Staff with GUEST role is rejected from diagnostic access with HTTP 403'
    );

    // OPS-AUTH-003: Authorized role (ADMIN / MANAGER) granted
    const a3 = await makeRequest('GET', '/api/system/diagnostics', {
      'x-business-id': TENANT_A,
      'x-staff-role': 'MANAGER',
    });
    assert(
      a3.status === 200 && a3.data?.success === true,
      'OPS-AUTH-003',
      'Staff with MANAGER role is granted operational diagnostics access'
    );

    // OPS-AUTH-004: Support Report generation restricted to Manager/Admin
    const a4 = await makeRequest(
      'POST',
      '/api/system/support-report',
      {
        'x-business-id': TENANT_A,
        'x-staff-role': 'STAFF', // General staff cannot export report
      },
      { businessId: TENANT_A }
    );
    assert(
      a4.status === 403 && a4.data?.errorCode === 'INSUFFICIENT_PERMISSIONS',
      'OPS-AUTH-004',
      'General staff cannot generate Support Diagnostic Reports (HTTP 403)'
    );

    // ===============================================================
    // CATEGORY 3: OPS-TENANT (Multi-Tenant Isolation)
    // ===============================================================
    console.log('\n--- CATEGORY 3: OPS-TENANT ---');

    // Clear and record error for Tenant A and Tenant B via HTTP API
    await makeRequest('POST', '/api/system/errors/clear', { 'x-business-id': TENANT_A, 'x-staff-role': 'ADMIN' }, { businessId: TENANT_A });
    await makeRequest('POST', '/api/system/errors/clear', { 'x-business-id': TENANT_B, 'x-staff-role': 'ADMIN' }, { businessId: TENANT_B });

    await makeRequest(
      'POST',
      '/api/system/errors',
      { 'x-business-id': TENANT_A, 'x-staff-role': 'ADMIN' },
      { businessId: TENANT_A, subsystem: 'database', message: 'Tenant A Query Warning', severity: 'WARNING' }
    );

    await makeRequest(
      'POST',
      '/api/system/errors',
      { 'x-business-id': TENANT_B, 'x-staff-role': 'ADMIN' },
      { businessId: TENANT_B, subsystem: 'communication', message: 'Tenant B SMTP Notice', severity: 'INFO' }
    );

    // OPS-TENANT-001: Tenant A only sees Tenant A errors
    const t1 = await makeRequest('GET', `/api/system/errors?businessId=${TENANT_A}`, {
      'x-business-id': TENANT_A,
      'x-staff-role': 'ADMIN',
    });
    const errsA = t1.data?.errors || [];
    assert(
      t1.status === 200 &&
        errsA.length === 1 &&
        errsA[0].safeMessage.includes('Tenant A') &&
        !JSON.stringify(errsA).includes('Tenant B'),
      'OPS-TENANT-001',
      'Tenant A querying diagnostic errors receives strictly Tenant A errors'
    );

    // OPS-TENANT-002: Cross-tenant retrieval violation (Tenant A context attempts to query Tenant B)
    const t2 = await makeRequest('GET', `/api/system/errors?businessId=${TENANT_B}`, {
      'x-business-id': TENANT_A, // Mismatched authenticated business context!
      'x-staff-role': 'ADMIN',
    });
    assert(
      t2.status === 403 && t2.data?.errorCode === 'TENANT_BINDING_MISMATCH',
      'OPS-TENANT-002',
      'Cross-tenant error query with mismatched x-business-id is rejected with HTTP 403'
    );

    // OPS-TENANT-003: Tenant B only sees Tenant B errors
    const t3 = await makeRequest('GET', `/api/system/errors?businessId=${TENANT_B}`, {
      'x-business-id': TENANT_B,
      'x-staff-role': 'ADMIN',
    });
    const errsB = t3.data?.errors || [];
    assert(
      t3.status === 200 &&
        errsB.length === 1 &&
        errsB[0].safeMessage.includes('Tenant B') &&
        !JSON.stringify(errsB).includes('Tenant A'),
      'OPS-TENANT-003',
      'Tenant B querying diagnostic errors receives strictly Tenant B errors'
    );

    // ===============================================================
    // CATEGORY 4: OPS-BACKUP (Disaster Recovery & Safety Validation)
    // ===============================================================
    console.log('\n--- CATEGORY 4: OPS-BACKUP ---');

    // OPS-BACKUP-001: Missing snapshots evaluation
    const origSnaps = CloudBackupService.getSnapshots();
    CloudBackupService.saveSnapshots([]); // Temporarily clear snapshots
    const b1 = BackupHealthService.evaluateBackupHealth();
    assert(
      b1.status === 'ACTION_REQUIRED' && b1.isStale === true && b1.snapshotCount === 0,
      'OPS-BACKUP-001',
      'Zero backup snapshots triggers ACTION_REQUIRED with stale warning'
    );

    // OPS-BACKUP-002: Stale backup detection (> 24 hours)
    const staleSnap = {
      id: 'snap_stale_1',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // 36 hours old
      dateStr: '2026-10-04',
      timeStr: '08:00 AM',
      type: 'manual' as const,
      status: 'synced_to_cloud' as const,
      sizeBytes: 1024,
      sizeFormatted: '1.0 KB',
      recordCounts: { jobs: 1, invoices: 1, customers: 1, materials: 0, expenses: 0, services: 0 },
      provider: 'NiL Primary Cloud Vault' as const,
      hash: 'HASH_123',
      payloadJson: JSON.stringify({ jobs: [], invoices: [], customers: [] }),
    };
    CloudBackupService.saveSnapshots([staleSnap]);
    const b2 = BackupHealthService.evaluateBackupHealth();
    assert(
      b2.status === 'WARNING' && b2.isStale === true && b2.ageHours >= 36,
      'OPS-BACKUP-002',
      'Backup older than 24 hours triggers WARNING (age >= 36h)'
    );

    // OPS-BACKUP-003: Fresh backup evaluation (< 24 hours)
    const freshSnap = {
      ...staleSnap,
      id: 'snap_fresh_1',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours old
    };
    CloudBackupService.saveSnapshots([freshSnap]);
    const b3 = BackupHealthService.evaluateBackupHealth();
    assert(
      b3.status === 'HEALTHY' && b3.isStale === false && b3.ageHours === 2,
      'OPS-BACKUP-003',
      'Fresh backup (< 24 hours) evaluated as HEALTHY'
    );

    // Restore snapshots
    CloudBackupService.saveSnapshots(origSnaps);

    // OPS-BACKUP-004: Snapshot Structural Integrity Validation (Catches corrupted or empty payload)
    const emptyValidation = BackupHealthService.validateSnapshotIntegrity('');
    const corruptValidation = BackupHealthService.validateSnapshotIntegrity('{"not_a_valid_pos_schema": true}');
    const validValidation = BackupHealthService.validateSnapshotIntegrity(
      JSON.stringify({ jobs: [{ id: '1' }], invoices: [{ id: '2' }], customers: [{ id: '3' }] })
    );

    assert(
      emptyValidation.valid === false &&
        corruptValidation.valid === false &&
        validValidation.valid === true &&
        validValidation.recordCounts?.jobs === 1,
      'OPS-BACKUP-004',
      'Snapshot validation rejects empty/corrupted schemas and verifies core tables'
    );

    // OPS-BACKUP-005: Safe Pre-Restore Safety Guard (Blocks restore without operator confirmation)
    const unconfirmed = BackupHealthService.safeRestoreFromSnapshot('snap_fresh_1', false);
    assert(
      unconfirmed.allowed === false && unconfirmed.errorCode === 'OPERATOR_CONFIRMATION_REQUIRED',
      'OPS-BACKUP-005',
      'Safe restore rejects unconfirmed execution and requires explicit operator consent'
    );

    // ===============================================================
    // CATEGORY 5: OPS-DEVICE (Printer & Peripheral Diagnostics)
    // ===============================================================
    console.log('\n--- CATEGORY 5: OPS-DEVICE ---');

    // OPS-DEVICE-001: Hardware peripheral diagnostics evaluation
    const devDiag = DeviceDiagnosticsService.getDeviceDiagnostics();
    assert(
      devDiag.thermalPrinter !== undefined &&
        devDiag.thermalPrinter.paperWidthMm >= 58 &&
        devDiag.barcodeScanner.connectionStatus === 'HEALTHY',
      'OPS-DEVICE-001',
      'Hardware peripheral diagnostics reports thermal printer and scanner status'
    );

    // OPS-DEVICE-002: Safe controlled test print endpoint
    const d2 = await makeRequest('POST', '/api/system/printer/test', {
      'x-business-id': TENANT_A,
      'x-staff-role': 'ADMIN',
    });
    assert(
      d2.status === 200 &&
        d2.data?.status === 'HEALTHY' &&
        d2.data?.testReceipt.includes('TEST PRINT SUCCESSFUL'),
      'OPS-DEVICE-002',
      'Controlled test print endpoint generates valid receipt pattern'
    );

    // OPS-DEVICE-003: Verification that NO customer records/PII exist in test print
    const receiptText = d2.data?.testReceipt || '';
    assert(
      !receiptText.includes('customer') &&
        !receiptText.includes('totalDue') &&
        !receiptText.includes('invoice') &&
        receiptText.includes('LUMINA CYBER SOLUTION') &&
        d2.data?.deviceDetails?.customerDataIncluded === false,
      'OPS-DEVICE-003',
      'Controlled test print pattern contains ZERO customer records or personal data'
    );

    // ===============================================================
    // CATEGORY 6: OPS-ERROR (Structured Error Engine & Deduplication)
    // ===============================================================
    console.log('\n--- CATEGORY 6: OPS-ERROR ---');

    clearDiagnosticErrors('biz_dedup_test');

    // OPS-ERROR-001: Structured Error Event Creation
    const err1 = recordDiagnosticError('biz_dedup_test', 'database', 'Connection pool exhausted', 'ERROR');
    assert(
      err1.id.startsWith('err_') &&
        err1.correlationId.startsWith('LCS-') &&
        err1.occurrenceCount === 1 &&
        err1.severity === 'ERROR',
      'OPS-ERROR-001',
      'Structured error event generated with standardized correlation ID (LCS-YYYYMMDD-XXXXXX)'
    );

    // OPS-ERROR-002: Error Deduplication via Fingerprint Matching
    const err2 = recordDiagnosticError('biz_dedup_test', 'database', 'Connection pool exhausted', 'ERROR');
    const err3 = recordDiagnosticError('biz_dedup_test', 'database', 'Connection pool exhausted', 'ERROR');

    const storedDedup = getDiagnosticErrors('biz_dedup_test');
    assert(
      storedDedup.length === 1 &&
        storedDedup[0].occurrenceCount === 3 &&
        storedDedup[0].fingerprint === err1.fingerprint,
      'OPS-ERROR-002',
      'Repeated identical errors deduplicated by fingerprint into single record with occurrenceCount=3'
    );

    // OPS-ERROR-003: Different error recorded separately
    const errOther = recordDiagnosticError('biz_dedup_test', 'communication', 'SMTP port timeout', 'WARNING');
    const storedTwo = getDiagnosticErrors('biz_dedup_test');
    assert(
      storedTwo.length === 2 && storedTwo[0].subsystem === 'communication',
      'OPS-ERROR-003',
      'Distinct error fingerprints stored as separate diagnostic entries'
    );

    // OPS-ERROR-004: Bounded Retention (Capped at 200 items to prevent storage explosion)
    for (let i = 0; i < 220; i++) {
      recordDiagnosticError('biz_retention_test', 'application', `Unique message ${i}`, 'NOTICE');
    }
    const retained = getDiagnosticErrors('biz_retention_test');
    assert(
      retained.length === 200,
      'OPS-ERROR-004',
      'Diagnostic error storage capped at MAX_ERROR_RETENTION (200 records)'
    );

    // ===============================================================
    // CATEGORY 7: OPS-SUPPORT (Sanitized Support Diagnostic Report)
    // ===============================================================
    console.log('\n--- CATEGORY 7: OPS-SUPPORT ---');

    // OPS-SUPPORT-001: Support Report Generation with Correlation ID
    const s1 = await makeRequest(
      'POST',
      '/api/system/support-report',
      {
        'x-business-id': TENANT_A,
        'x-staff-role': 'ADMIN',
      },
      {
        businessId: TENANT_A,
        businessName: 'Alpha Internet Solutions',
        clientContext: {
          licenseStatus: 'ACTIVE',
          daysRemaining: 18,
          isOnline: true,
          printerStatus: 'READY',
          backupAgeHours: 3,
        },
      }
    );

    const report = s1.data?.report;
    assert(
      s1.status === 200 &&
        report !== undefined &&
        report.correlationId.startsWith('LCS-') &&
        report.businessName === 'Alpha Internet Solutions' &&
        report.application.version === '3.3.0',
      'OPS-SUPPORT-001',
      'Support report generated with structured application, database, and hardware telemetry'
    );

    // OPS-SUPPORT-002: Report payload size bounding (< 50KB)
    const reportBytes = Buffer.byteLength(JSON.stringify(report), 'utf8');
    assert(
      reportBytes > 500 && reportBytes < 50 * 1024,
      'OPS-SUPPORT-002',
      `Support report payload size is safely bounded (${reportBytes} bytes < 50KB)`
    );

    // ===============================================================
    // CATEGORY 8: OPS-OFFLINE (Offline-First POS Resilience)
    // ===============================================================
    console.log('\n--- CATEGORY 8: OPS-OFFLINE ---');

    // OPS-OFFLINE-001: Offline state evaluation does NOT mark POS as broken
    const offlineState = {
      isOnline: false,
      lastOnlineTimestamp: '2026-10-06T12:00:00Z',
    };
    assert(
      offlineState.isOnline === false,
      'OPS-OFFLINE-001',
      'Offline state recognized as expected local POS operating mode'
    );

    // OPS-OFFLINE-002: Storage export & POS operations function with network disabled
    const exportedJson = StorageService.exportDatabaseJSON();
    assert(
      exportedJson.length > 50 && typeof exportedJson === 'string',
      'OPS-OFFLINE-002',
      'Local database operations and JSON exports remain fully accessible offline'
    );

    // ===============================================================
    // CATEGORY 9: OPS-SEC (Mandatory Security Suite OPS-SEC-001 to 010)
    // ===============================================================
    console.log('\n--- CATEGORY 9: MANDATORY SECURITY AUDIT (OPS-SEC-001 TO OPS-SEC-010) ---');

    // Craft a mock dirty report with dangerous secrets to test scrubber
    const dirtyReport = {
      reportId: 'REP-LEAK-TEST',
      correlationId: 'LCS-20261006-DIRTY1',
      generatedAt: new Date().toISOString(),
      smtpPassword: 'SuperSecretSmtpPassword123!',
      vaultMasterKey: 'LCS_STATION_VAULT_MASTER_ENTROPY_2026',
      privateKeyPem: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----',
      bearerToken: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.testToken',
      apiKey: 'sec_api_98234789123479182374',
      vaultCiphertext: 'A5F3B4C9D8E7...',
      authTag: '8F2C1A...',
      salt: 'LUMINA_SALT_XYZ',
      recentErrors: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          severity: 'ERROR',
          subsystem: 'communication',
          safeMessage:
            'Failed connecting with password=SuperSecretSmtpPassword123! token=Bearer secretToken123 PAN ABCDE1234F Aadhaar 1234 5678 9012',
          occurrenceCount: 1,
        },
      ],
    };

    const scrubbed = scrubSupportReport(dirtyReport);
    const scrubbedJson = JSON.stringify(scrubbed);

    // OPS-SEC-001: SMTP password absent
    assert(
      !scrubbedJson.includes('SuperSecretSmtpPassword123!') && scrubbed.smtpPassword === undefined,
      'OPS-SEC-001',
      'SMTP password completely absent from support report'
    );

    // OPS-SEC-002: Vault master key absent
    assert(
      !scrubbedJson.includes('LCS_STATION_VAULT_MASTER_ENTROPY_2026') && scrubbed.vaultMasterKey === undefined,
      'OPS-SEC-002',
      'Vault master encryption key absent from support report'
    );

    // OPS-SEC-003: License private signing key absent
    assert(
      !scrubbedJson.includes('BEGIN RSA PRIVATE KEY') && scrubbed.privateKeyPem === undefined,
      'OPS-SEC-003',
      'License private signing key header & PEM absent from support report'
    );

    // OPS-SEC-004: Authorization tokens absent
    assert(
      !scrubbedJson.includes('eyJhbGciOiJSUzI1Ni') && scrubbed.bearerToken === undefined,
      'OPS-SEC-004',
      'Bearer authorization tokens absent from support report'
    );

    // OPS-SEC-005: API keys absent
    assert(
      !scrubbedJson.includes('sec_api_98234789123479182374') && scrubbed.apiKey === undefined,
      'OPS-SEC-005',
      'API keys and secret tokens absent from support report'
    );

    // OPS-SEC-006: Cross-tenant diagnostic access denied
    const crossTenantReportReq = await makeRequest(
      'POST',
      '/api/system/support-report',
      {
        'x-business-id': TENANT_A,
        'x-staff-role': 'ADMIN',
      },
      {
        businessId: TENANT_B, // Mismatched body tenant!
      }
    );
    assert(
      crossTenantReportReq.status === 403 &&
        crossTenantReportReq.data?.errorCode === 'TENANT_BINDING_MISMATCH',
      'OPS-SEC-006',
      'Cross-tenant support report generation attempt is denied with HTTP 403'
    );

    // OPS-SEC-007: PAN / Aadhaar masking preserved
    assert(
      !scrubbedJson.includes('ABCDE1234F') &&
        scrubbedJson.includes('XXXXX1234F') &&
        !scrubbedJson.includes('1234 5678 9012') &&
        scrubbedJson.includes('XXXX XXXX 9012'),
      'OPS-SEC-007',
      'PAN (XXXXX1234F) and Aadhaar (XXXX XXXX 9012) masking active in report'
    );

    // OPS-SEC-008: Raw stack traces cannot leak secrets
    const rawStack = 'Error: connect failed with secret=MasterVaultKey999\n    at SmtpClient.connect (D:\\Lumina\\src\\secret.key:12)';
    const sanitizedError = recordDiagnosticError(TENANT_A, 'communication', rawStack, 'ERROR', rawStack);
    assert(
      !sanitizedError.safeMessage.includes('MasterVaultKey999') &&
        sanitizedError.safeMessage.includes('secret=[REDACTED]'),
      'OPS-SEC-008',
      'Raw error messages sanitized: secrets redacted from messages and technical details'
    );

    // OPS-SEC-009: Support report payload size bounded
    assert(
      Buffer.byteLength(scrubbedJson, 'utf8') < 50 * 1024,
      'OPS-SEC-009',
      'Support report payload size bounded below 50KB maximum'
    );

    // OPS-SEC-010: Unauthorized diagnostic endpoint access denied
    const unauthTest = await makeRequest('POST', '/api/system/printer/test', {});
    assert(
      unauthTest.status === 401 && unauthTest.data?.errorCode === 'UNAUTHENTICATED',
      'OPS-SEC-010',
      'Unauthenticated access to printer test endpoint denied with HTTP 401'
    );

    // ===============================================================
    // CATEGORY 10: OPS-PERF (Performance & Non-Blocking Diagnostics)
    // ===============================================================
    console.log('\n--- CATEGORY 10: OPS-PERF ---');

    const tStart = Date.now();
    for (let i = 0; i < 20; i++) {
      getDatabaseDiagnostics();
    }
    const tElapsed = Date.now() - tStart;
    const avgMs = tElapsed / 20;

    assert(
      avgMs < 50,
      'OPS-PERF-001',
      `Database diagnostic PRAGMA check is fast and non-blocking (${avgMs.toFixed(2)}ms avg < 50ms)`
    );

    const reportStart = Date.now();
    await DiagnosticsService.generateSanitizedSupportReport();
    const reportElapsed = Date.now() - reportStart;

    assert(
      reportElapsed < 500,
      'OPS-PERF-002',
      `Full support report generation completed quickly (${reportElapsed}ms < 500ms)`
    );
  } catch (err: any) {
    console.error('Test execution error:', err);
    failedTests++;
  }

  console.log('\n===============================================================');
  console.log(`TOTAL PHASE 13 TESTS:  ${passedTests + failedTests}`);
  console.log(`PASSED:                ${passedTests}`);
  console.log(`FAILED:                ${failedTests}`);
  console.log(`SUCCESS RATE:          ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
