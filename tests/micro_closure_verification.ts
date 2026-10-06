/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — PHASE 13 MICRO-CLOSURE FORENSIC VERIFICATION SUITE
 * Independent closure challenge verifying:
 * - RESTORE-006: Simulated Mid-Restore Failure Safety (Atomic Rollback & State Fingerprint Match)
 * - AUDIT-001: Strict Cross-Tenant Audit Isolation
 * - AUDIT-002: Audit Role Matrix Enforcement
 * - AUDIT-003: Audit Tamper Resistance & Immutability
 * - RATE-001: Tenant-Isolated Rate Limiting (Flood Isolation & Zero Cross-Tenant DoS)
 * - OPS-SUPPORT-SEC-011 to 025: 15 Extended Adversarial Secret Injection Patterns
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { safeStorage, StorageService } from '../src/services/storage';
import { getAuthorityDatabase, getDurableAuditEvents, clearDurableAuditEvents } from '../src/server/db';
import {
  scrubSupportReport,
  resetOperationsRateLimits,
  logOperationalAuditEvent,
} from '../src/server/operations';
import {
  BackupHealthService,
  computeProductionStateFingerprint,
} from '../src/services/operations/backupHealthService';
import { CloudBackupService } from '../src/services/cloudBackup';
import { BusinessContextService } from '../src/services/businessContext';
import { DeviceDiagnosticsService } from '../src/services/operations/deviceDiagnosticsService';

// Ensure localStorage polyfill
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = safeStorage;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.LUMINA_AUTHORITY_URL || 'http://127.0.0.1:3000';
const ADMIN_KEY = process.env.LUMINA_ADMIN_KEY || 'LUMINA_ADMIN_SECRET_KEY_2026';
const TENANT_A = 'biz_test_audit_tenant_alpha';
const TENANT_B = 'biz_test_audit_tenant_beta';

let passedTests = 0;
let failedTests = 0;
const results: Array<{ id: string; name: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

function assert(condition: boolean, testId: string, testName: string, detail = ''): void {
  if (condition) {
    passedTests++;
    results.push({ id: testId, name: testName, status: 'PASS', details: detail });
    console.log(`  [PASS] ${testId} — ${testName}`);
    if (detail) console.log(`         Evidence: ${detail}`);
  } else {
    failedTests++;
    results.push({ id: testId, name: testName, status: 'FAIL', details: detail });
    console.error(`  [FAIL] ${testId} — ${testName}`);
    if (detail) console.error(`         Failure Reason: ${detail}`);
  }
}

async function request(
  urlPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlPath, BASE_URL);
    const postData = options.body ? JSON.stringify(options.body) : undefined;

    const reqHeaders: Record<string, string> = {
      ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData).toString() } : {}),
      ...options.headers,
    };

    const req = http.request(
      parsedUrl,
      {
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(body);
          } catch (_) {
            parsed = body;
          }
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            data: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runMicroClosureSuite(): Promise<void> {
  console.log('======================================================================');
  console.log('   PHASE 13 MICRO-CLOSURE FORENSIC EVIDENCE SUITE');
  console.log('======================================================================\n');

  // =========================================================================
  // PRIORITY 1: RESTORE-006 — Simulated Mid-Restore Failure Safety
  // =========================================================================
  console.log('--- PRIORITY 1: RESTORE FAILURE-SAFETY FORENSIC TEST ---');

  // Step 1: Create known production dataset for test tenant
  const prodTenant = 'biz_restore_failure_safety_test';
  BusinessContextService.setCurrentBusinessId(prodTenant);

  const knownConfig = {
    profile: {
      businessId: prodTenant,
      businessName: 'Lumina Cyber Solution Flagship Node',
      gstNumber: '29ABCDE1234F1Z5',
      phone: '9876543210',
    },
    printerMode: 'thermal80',
    lastBackupDate: new Date().toISOString(),
  };
  StorageService.saveConfig(knownConfig as any);

  const knownCustomer = {
    id: `cust_prod_001`,
    businessId: prodTenant,
    name: 'Aaditya Vikram Verma',
    phone: '9811223344',
    email: 'aaditya.verma@example.com',
    createdAt: new Date().toISOString(),
  };
  StorageService.saveCustomers([knownCustomer as any]);

  const knownJob = {
    id: `job_prod_001`,
    businessId: prodTenant,
    customerId: knownCustomer.id,
    customerName: knownCustomer.name,
    serviceId: 'srv_cyber_consult',
    serviceName: 'Cyber Security Risk Audit',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };
  StorageService.saveJobs([knownJob as any]);

  const knownInvoice = {
    id: `inv_prod_001`,
    businessId: prodTenant,
    customerId: knownCustomer.id,
    customerName: knownCustomer.name,
    subtotal: 15000,
    gstAmount: 2700,
    total: 17700,
    paymentMethod: 'UPI',
    createdAt: new Date().toISOString(),
  };
  StorageService.saveInvoices([knownInvoice as any]);

  // Step 2: Record deterministic production-state fingerprint BEFORE restore begins
  const beforeFingerprint = computeProductionStateFingerprint(prodTenant);

  // Step 3: Create valid incoming restore snapshot (different payload)
  const incomingCustomer = {
    id: `cust_incoming_999`,
    businessId: prodTenant,
    name: 'Incoming Test Corporation',
    phone: '9900112233',
  };
  const incomingInvoice = {
    id: `inv_incoming_999`,
    businessId: prodTenant,
    customerId: incomingCustomer.id,
    total: 8888,
  };
  const incomingSnapshotPayload = JSON.stringify({
    config: { profile: { businessName: 'Restored Business Corp' } },
    customers: [incomingCustomer],
    jobs: [{ id: 'job_incoming_999', customerId: incomingCustomer.id, status: 'PENDING' }],
    invoices: [incomingInvoice],
  });

  CloudBackupService.saveSnapshots([]);
  const validSnapshot = CloudBackupService.createSnapshot('manual');
  validSnapshot.payloadJson = incomingSnapshotPayload;
  CloudBackupService.saveSnapshots([validSnapshot]);

  // Step 4 to 11: Execute Adversarial Mid-Restore Failure Safety Test
  const restoreResult = BackupHealthService.safeRestoreFromSnapshot(
    validSnapshot.id,
    true, // confirmed by operator
    {
      simulateMidRestoreFailure: true,
      failureStep: 'mid-restore: after customers, before invoices',
    }
  );

  // Measure state after rollback
  const afterFingerprint = computeProductionStateFingerprint(prodTenant);
  const currentInvoices = StorageService.getInvoices();
  const currentCustomers = StorageService.getCustomers();
  const currentJobs = StorageService.getJobs();
  const currentConfig = StorageService.getConfig();

  const originalRecordsRecoverable =
    currentCustomers.some((c) => c.id === knownCustomer.id) &&
    currentInvoices.some((i) => i.id === knownInvoice.id) &&
    currentJobs.some((j) => j.id === knownJob.id) &&
    (currentConfig.profile as any)?.gstNumber === knownConfig.profile.gstNumber;

  const noHalfRestoredState =
    !currentCustomers.some((c) => c.id === incomingCustomer.id) &&
    !currentInvoices.some((i) => i.id === incomingInvoice.id);

  console.log(`  > Before Fingerprint:         ${beforeFingerprint}`);
  console.log(`  > Failure Injection Point:    ${restoreResult.failurePoint}`);
  console.log(`  > After Fingerprint:          ${afterFingerprint}`);
  console.log(`  > Fingerprints Match:         ${beforeFingerprint === afterFingerprint}`);
  console.log(`  > Rollback Executed:          ${restoreResult.rollbackExecuted}`);
  console.log(`  > Rolled Back Successfully:   ${restoreResult.rolledBackSuccessfully}`);
  console.log(`  > Pre-Restore Snapshot ID:    ${restoreResult.preRestoreBackupId}`);
  console.log(`  > Audit Event ID:             ${restoreResult.auditEventId}`);

  assert(
    restoreResult.allowed === false &&
      restoreResult.rollbackExecuted === true &&
      restoreResult.rolledBackSuccessfully === true &&
      beforeFingerprint === afterFingerprint &&
      originalRecordsRecoverable &&
      noHalfRestoredState &&
      Boolean(restoreResult.preRestoreBackupId),
    'RESTORE-006',
    'Simulated Mid-Restore Failure Safety & Atomic Rollback',
    `Before: ${beforeFingerprint.slice(0, 12)}..., After: ${afterFingerprint.slice(0, 12)}..., Original Records: ${originalRecordsRecoverable}`
  );

  // =========================================================================
  // PRIORITY 2 & 3: DURABLE AUDIT TRAIL FORENSICS & TENANT ISOLATION (AUDIT-001)
  // =========================================================================
  console.log('\n--- PRIORITY 2 & 3: DURABLE AUDIT TRAIL & TENANT ISOLATION ---');

  // Insert operational audit events for Tenant A
  clearDurableAuditEvents(TENANT_A);
  clearDurableAuditEvents(TENANT_B);

  const eventA1 = logOperationalAuditEvent({
    businessId: TENANT_A,
    actorId: 'usr_alpha_admin',
    actorRole: 'ADMIN',
    action: 'BACKUP_VALIDATION',
    targetResource: 'backup_system',
    outcome: 'SUCCESS',
    details: { validatedSnapshots: 3 },
  });

  const eventA2 = logOperationalAuditEvent({
    businessId: TENANT_A,
    actorId: 'usr_alpha_manager',
    actorRole: 'MANAGER',
    action: 'SUPPORT_REPORT_GENERATION',
    targetResource: '/api/system/support-report',
    outcome: 'SUCCESS',
    details: { reportId: 'REP-ALPHA-01' },
  });

  // Insert operational audit events for Tenant B
  const eventB1 = logOperationalAuditEvent({
    businessId: TENANT_B,
    actorId: 'usr_beta_admin',
    actorRole: 'ADMIN',
    action: 'PRINTER_TEST',
    targetResource: '/api/system/printer/test',
    outcome: 'SUCCESS',
    details: { printer: 'thermal80' },
  });

  // Test 1: Tenant A fetches only Tenant A events
  const resAuditA = await request('/api/system/audit', {
    headers: {
      'x-business-id': TENANT_A,
      'x-staff-role': 'ADMIN',
    },
  });

  const eventsA = resAuditA.data?.events || [];
  const tenantASeesOnlyTenantA =
    eventsA.length >= 2 &&
    eventsA.every((e: any) => e.businessId === TENANT_A) &&
    !eventsA.some((e: any) => e.businessId === TENANT_B);

  // Test 2: Tenant B fetches only Tenant B events
  const resAuditB = await request('/api/system/audit', {
    headers: {
      'x-business-id': TENANT_B,
      'x-staff-role': 'ADMIN',
    },
  });

  const eventsB = resAuditB.data?.events || [];
  const tenantBSeesOnlyTenantB =
    eventsB.length >= 1 &&
    eventsB.every((e: any) => e.businessId === TENANT_B) &&
    !eventsB.some((e: any) => e.businessId === TENANT_A);

  // Test 3: Tenant A explicitly tries to query Tenant B audit logs via query parameter
  const resCrossTenantQuery = await request(`/api/system/audit?businessId=${TENANT_B}`, {
    headers: {
      'x-business-id': TENANT_A,
      'x-staff-role': 'ADMIN',
    },
  });

  const crossTenantBlocked =
    resCrossTenantQuery.statusCode === 403 &&
    (resCrossTenantQuery.data?.errorCode === 'CROSS_TENANT_DENIAL' ||
      resCrossTenantQuery.data?.errorCode === 'TENANT_BINDING_MISMATCH');

  assert(
    tenantASeesOnlyTenantA && tenantBSeesOnlyTenantB && crossTenantBlocked,
    'AUDIT-001',
    'Tenant Audit Isolation (Strict Cross-Tenant Denial)',
    `Tenant A events: ${eventsA.length}, Tenant B events: ${eventsB.length}, Cross-tenant access: HTTP ${resCrossTenantQuery.statusCode}`
  );

  // =========================================================================
  // PRIORITY 4: AUDIT ROLE MATRIX (AUDIT-002)
  // =========================================================================
  console.log('\n--- PRIORITY 4: AUDIT ROLE MATRIX ---');

  const rolesToTest: Array<{ role: string; unauth?: boolean; expectedStatus: number }> = [
    { role: '', unauth: true, expectedStatus: 401 },
    { role: 'GUEST', expectedStatus: 403 },
    { role: 'BILLING_STAFF', expectedStatus: 403 },
    { role: 'STAFF', expectedStatus: 403 },
    { role: 'MANAGER', expectedStatus: 200 },
    { role: 'ADMIN', expectedStatus: 200 },
    { role: 'OWNER', expectedStatus: 200 },
  ];

  let roleMatrixPassed = true;
  for (const r of rolesToTest) {
    const headers: Record<string, string> = {};
    if (!r.unauth) {
      headers['x-business-id'] = TENANT_A;
      headers['x-staff-role'] = r.role;
    }

    const res = await request('/api/system/audit', { headers });
    const match = res.statusCode === r.expectedStatus;
    if (!match) roleMatrixPassed = false;
    console.log(`    Role [${r.role || 'UNAUTHENTICATED'}]: Expected HTTP ${r.expectedStatus}, Got ${res.statusCode} (${match ? 'OK' : 'MISMATCH'})`);
  }

  assert(
    roleMatrixPassed,
    'AUDIT-002',
    'Audit Retrieval Role Authorization Matrix',
    'Ordinary staff/guests blocked (401/403); Manager/Admin/Owner permitted (200)'
  );

  // =========================================================================
  // PRIORITY 5: AUDIT TAMPER RESISTANCE (AUDIT-003)
  // =========================================================================
  console.log('\n--- PRIORITY 5: AUDIT TAMPER RESISTANCE ---');

  // Attempt PUT, PATCH, DELETE on audit endpoint
  const putRes = await request('/api/system/audit', {
    method: 'PUT',
    headers: { 'x-business-id': TENANT_A, 'x-staff-role': 'ADMIN' },
    body: { auditEventId: eventA1, outcome: 'TAMPERED' },
  });

  const patchRes = await request(`/api/system/audit/${eventA1}`, {
    method: 'PATCH',
    headers: { 'x-business-id': TENANT_A, 'x-staff-role': 'ADMIN' },
    body: { outcome: 'TAMPERED' },
  });

  const deleteRes = await request(`/api/system/audit/${eventA1}`, {
    method: 'DELETE',
    headers: { 'x-business-id': TENANT_A, 'x-staff-role': 'ADMIN' },
  });

  const tamperPrevented =
    putRes.statusCode === 405 &&
    (patchRes.statusCode === 405 || patchRes.statusCode === 404) &&
    (deleteRes.statusCode === 405 || deleteRes.statusCode === 404);

  // Verify historical audit events remain completely intact in SQLite
  const eventsAfterTamper = getDurableAuditEvents(TENANT_A);
  const eventUntouched = eventsAfterTamper.find((e) => e.auditEventId === eventA1);
  const outcomePreserved = eventUntouched && eventUntouched.outcome === 'SUCCESS';

  assert(
    Boolean(tamperPrevented && outcomePreserved),
    'AUDIT-003',
    'Audit Tamper Resistance (Immutable Append-Only Audit Trail)',
    `PUT: ${putRes.statusCode}, PATCH: ${patchRes.statusCode}, DELETE: ${deleteRes.statusCode}, Historical Outcome: ${eventUntouched?.outcome}`
  );

  // =========================================================================
  // PRIORITY 6: RATE-LIMIT FORENSICS & TENANT ISOLATION (RATE-001)
  // =========================================================================
  console.log('\n--- PRIORITY 6: RATE-LIMIT FORENSICS & TENANT ISOLATION ---');

  // Reset rate limits cleanly
  await request('/api/system/reset-limits', {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
  });

  const floodTenant = 'biz_rate_flood_alpha';
  const victimTenant = 'biz_rate_normal_beta';

  let first429Index = -1;
  let retryAfterHeader = '';

  // Flood Tenant A on sensitive endpoint (limit 40 req/min)
  for (let i = 1; i <= 43; i++) {
    const res = await request('/api/system/support-report', {
      method: 'POST',
      headers: {
        'x-business-id': floodTenant,
        'x-staff-role': 'ADMIN',
      },
      body: { businessName: 'Flood Corp' },
    });

    if (res.statusCode === 429 && first429Index === -1) {
      first429Index = i;
      retryAfterHeader = (res.headers['retry-after'] as string) || '';
    }
  }

  // Verify Tenant B remains 100% operational on the exact same endpoint
  const victimRes = await request('/api/system/support-report', {
    method: 'POST',
    headers: {
      'x-business-id': victimTenant,
      'x-staff-role': 'ADMIN',
    },
    body: { businessName: 'Victim Corp' },
  });

  console.log(`  > Flood Tenant A throttled at request #${first429Index} (Limit: 40)`);
  console.log(`  > Retry-After header present: ${retryAfterHeader}`);
  console.log(`  > Victim Tenant B response status: HTTP ${victimRes.statusCode} (${victimRes.statusCode === 200 ? 'UNAFFECTED' : 'AFFECTED'})`);

  assert(
    first429Index > 0 &&
      first429Index <= 42 &&
      victimRes.statusCode === 200 &&
      Boolean(retryAfterHeader),
    'RATE-001',
    'Rate-Limit Tenant Isolation (Tenant A Flooding Does NOT DoS Tenant B)',
    `Tenant A throttled at req #${first429Index}, Tenant B status: ${victimRes.statusCode}, Retry-After: ${retryAfterHeader}s`
  );

  // =========================================================================
  // PRIORITY 7: SUPPORT SANITIZER EXTENSION (OPS-SUPPORT-SEC-011 to 025)
  // =========================================================================
  console.log('\n--- PRIORITY 7: SUPPORT SANITIZER EXTENSION ---');

  const adversarialCases: Array<{ id: string; name: string; payload: any; forbiddenStrings: string[] }> = [
    {
      id: 'OPS-SUPPORT-SEC-011',
      name: 'Direct apiKey key removal',
      payload: { app: 'Lumina', apiKey: 'ak_live_99887766554433221100' },
      forbiddenStrings: ['ak_live_99887766554433221100', 'apiKey'],
    },
    {
      id: 'OPS-SUPPORT-SEC-012',
      name: 'Snake-case api_key key removal',
      payload: { system: 'Core', api_key: 'sk_live_secret_key_prod_001' },
      forbiddenStrings: ['sk_live_secret_key_prod_001', 'api_key'],
    },
    {
      id: 'OPS-SUPPORT-SEC-013',
      name: 'access_token field scrub',
      payload: { auth: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload' } },
      forbiddenStrings: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload', 'access_token'],
    },
    {
      id: 'OPS-SUPPORT-SEC-014',
      name: 'refresh_token field scrub',
      payload: { tokens: { refresh_token: 'rtk_live_super_refresh_token_999' } },
      forbiddenStrings: ['rtk_live_super_refresh_token_999', 'refresh_token'],
    },
    {
      id: 'OPS-SUPPORT-SEC-015',
      name: 'authorization header / field scrub',
      payload: { headers: { authorization: 'Bearer secret_auth_bearer_val' } },
      forbiddenStrings: ['secret_auth_bearer_val', 'authorization'],
    },
    {
      id: 'OPS-SUPPORT-SEC-016',
      name: 'Raw Bearer token embedded in string log',
      payload: { log: 'Outbound request with Bearer eyJhbGciOiJIUzI1NiJ9' },
      forbiddenStrings: ['eyJhbGciOiJIUzI1NiJ9'],
    },
    {
      id: 'OPS-SUPPORT-SEC-017',
      name: 'clientSecret field removal',
      payload: { oauth: { clientSecret: 'cs_live_ultra_secret_client_001' } },
      forbiddenStrings: ['cs_live_ultra_secret_client_001', 'clientSecret'],
    },
    {
      id: 'OPS-SUPPORT-SEC-018',
      name: 'client_secret field removal',
      payload: { creds: { client_secret: 'cs_snake_secret_002' } },
      forbiddenStrings: ['cs_snake_secret_002', 'client_secret'],
    },
    {
      id: 'OPS-SUPPORT-SEC-019',
      name: 'private_key field and RSA PEM scrub',
      payload: { key: { private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----' } },
      forbiddenStrings: ['MIIEowIBAAKCAQEA0', 'private_key'],
    },
    {
      id: 'OPS-SUPPORT-SEC-020',
      name: 'secretKey field removal',
      payload: { aws: { secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' } },
      forbiddenStrings: ['wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'secretKey'],
    },
    {
      id: 'OPS-SUPPORT-SEC-021',
      name: 'masterKey field removal',
      payload: { vault: { masterKey: 'LUMINA_MASTER_VAULT_KEY_2026_ADVERSARIAL' } },
      forbiddenStrings: ['LUMINA_MASTER_VAULT_KEY_2026_ADVERSARIAL', 'masterKey'],
    },
    {
      id: 'OPS-SUPPORT-SEC-022',
      name: 'smtp_password field removal',
      payload: { mailer: { smtp_password: 'super_smtp_mail_password_123!' } },
      forbiddenStrings: ['super_smtp_mail_password_123!', 'smtp_password'],
    },
    {
      id: 'OPS-SUPPORT-SEC-023',
      name: 'URL-encoded passwords and query secrets',
      payload: { dbUrl: 'postgres://admin:secretPass123@db.internal:5432/lumina?apiKey=secretVal99' },
      forbiddenStrings: ['secretPass123', 'secretVal99'],
    },
    {
      id: 'OPS-SUPPORT-SEC-024',
      name: 'Nested arrays and deeply nested objects',
      payload: {
        cluster: [
          { node: 1, credentials: [{ token: 'nested_secret_token_alpha' }] },
          { node: 2, meta: { deep: { deeper: { secretKey: 'deep_vault_pass' } } } },
        ],
      },
      forbiddenStrings: ['nested_secret_token_alpha', 'deep_vault_pass', 'secretKey'],
    },
    {
      id: 'OPS-SUPPORT-SEC-025',
      name: 'JSON serialized inside string and stack trace containing credentials',
      payload: {
        serializedLog: '{"status":"failed","apiKey":"embedded_stringified_key_443"}',
        stackTrace: 'Error: Auth failure\n    at authenticate (apiKey="leak_in_stack_trace_999")\n    at process.run',
      },
      forbiddenStrings: ['embedded_stringified_key_443', 'leak_in_stack_trace_999'],
    },
  ];

  for (const c of adversarialCases) {
    const scrubbed = scrubSupportReport(c.payload);
    const serialized = JSON.stringify(scrubbed);
    let leaked = false;
    let leakedItem = '';

    for (const forbidden of c.forbiddenStrings) {
      if (serialized.includes(forbidden)) {
        leaked = true;
        leakedItem = forbidden;
        break;
      }
    }

    assert(!leaked, c.id, c.name, leaked ? `LEAKED: "${leakedItem}" found in output` : 'Zero leakage confirmed');
  }

  // =========================================================================
  // PRIORITY 8: PRINTER TERMINOLOGY FINAL VERIFICATION
  // =========================================================================
  console.log('\n--- PRIORITY 8: PRINTER TERMINOLOGY VERIFICATION ---');

  const testReceipt = DeviceDiagnosticsService.generateControlledTestReceipt('thermal80', 80);
  const terminologyAccurate =
    testReceipt.includes('CONFIGURED (DRIVER-DETECTED)') &&
    testReceipt.includes('PRINT DISPATCHED (LOCAL DRIVER)') &&
    !testReceipt.includes('PHYSICAL OUTPUT VERIFIED') &&
    !testReceipt.includes('Status: READY / HEALTHY');

  assert(
    terminologyAccurate,
    'OPS-PRINTER-001',
    'Printer Diagnostic Terminology (Driver Dispatched vs Physical Verification)',
    'Verified receipt uses "CONFIGURED (DRIVER-DETECTED)" and "PRINT DISPATCHED (LOCAL DRIVER)"'
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`   MICRO-CLOSURE SUMMARY: ${passedTests} PASSED / ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMicroClosureSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
