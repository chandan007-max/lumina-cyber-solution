import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getAuthorityDatabase } from '../src/server/db';
import { StorageService } from '../src/services/storage';
import { BusinessContextService } from '../src/services/businessContext';
import { BusinessConfigService } from '../src/services/businessConfig';
import { LicenseService } from '../src/services/licenseService';
import { LicenseAuthorityService } from '../src/services/licenseAuthority';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.LUMINA_ADMIN_KEY || 'LUMINA_ADMIN_SECRET_KEY_2026';

export interface TestResult {
  id: string;
  category: string;
  name: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

function recordTest(res: TestResult) {
  results.push(res);
  const color = res.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}[${res.status}]\x1b[0m ${res.id} - ${res.name}`);
  if (res.status === 'FAIL') {
    console.error(`       Expected: ${res.expected}`);
    console.error(`       Actual:   ${res.actual}`);
  }
}

async function postJson(endpoint: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

async function getJson(endpoint: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

export async function runSecuritySuite() {
  console.log('\n================================================================');
  console.log('   LUMINA CYBER SOLUTION — PHASE 11.2.2 SECURITY TEST SUITE   ');
  console.log('================================================================\n');

  const testRunId = Date.now().toString(36).toUpperCase();

  // -------------------------------------------------------------
  // CATEGORY 1: UNIQUE TRIAL PROTECTION (P0: Section 3 & Section 16)
  // -------------------------------------------------------------
  console.log('--- CATEGORY 1: Unique Trial Protection ---');

  const trialDevice1 = `DEV_TEST_TRIAL_${testRunId}_A`;
  const trialBiz1 = `biz_trial_${testRunId}_A`;

  // SEC-001: First trial request from device1
  const trial1 = await postJson('/api/license/trial/start', {
    deviceId: trialDevice1,
    businessName: 'Legitimate Cyber Café A',
  });
  recordTest({
    id: 'SEC-001',
    category: 'Trial Protection',
    name: 'First Legitimate Trial Request',
    input: `deviceId: ${trialDevice1}`,
    expected: 'HTTP 200 with issued server trial license',
    actual: `HTTP ${trial1.status}: success=${trial1.data.success}, status=${trial1.data.license?.status}`,
    status: trial1.status === 200 && trial1.data.success && trial1.data.license?.status === 'TRIAL' ? 'PASS' : 'FAIL',
  });

  // SEC-002: Same device requests trial twice (Sequential Abuse Attempt)
  const trial2 = await postJson('/api/license/trial/start', {
    deviceId: trialDevice1,
    businessName: 'Repeated Trial Attempt',
  });
  recordTest({
    id: 'SEC-002',
    category: 'Trial Protection',
    name: 'Duplicate Device Trial Rejection',
    input: `Same deviceId: ${trialDevice1}`,
    expected: 'HTTP 403 with TRIAL_ALREADY_USED',
    actual: `HTTP ${trial2.status}: errorCode=${trial2.data.errorCode}`,
    status: trial2.status === 403 && trial2.data.errorCode === 'TRIAL_ALREADY_USED' ? 'PASS' : 'FAIL',
  });

  // SEC-003: Concurrent trial requests from same device (Race Condition Protection)
  const trialDeviceConcurrent = `DEV_TEST_CONC_${testRunId}`;
  const [concTrial1, concTrial2] = await Promise.all([
    postJson('/api/license/trial/start', { deviceId: trialDeviceConcurrent, businessName: 'Race Café 1' }),
    postJson('/api/license/trial/start', { deviceId: trialDeviceConcurrent, businessName: 'Race Café 2' }),
  ]);
  const acceptedConc = [concTrial1, concTrial2].filter((r) => r.status === 200).length;
  const rejectedConc = [concTrial1, concTrial2].filter((r) => r.status === 403).length;
  recordTest({
    id: 'SEC-003',
    category: 'Trial Protection',
    name: 'Concurrent Trial Request Atomic Uniqueness',
    input: '2 simultaneous requests with same deviceId',
    expected: 'Exactly 1 accepted (HTTP 200), 1 rejected (HTTP 403)',
    actual: `${acceptedConc} accepted, ${rejectedConc} rejected`,
    status: acceptedConc === 1 && rejectedConc === 1 ? 'PASS' : 'FAIL',
  });

  // SEC-004: Independent legitimate businesses can receive independent trials
  const trialDevice2 = `DEV_TEST_TRIAL_${testRunId}_B`;
  const trialIndependent = await postJson('/api/license/trial/start', {
    deviceId: trialDevice2,
    businessName: 'Legitimate Cyber Café B',
  });
  recordTest({
    id: 'SEC-004',
    category: 'Trial Protection',
    name: 'Independent Business Trial Issuance',
    input: `Different deviceId: ${trialDevice2}`,
    expected: 'HTTP 200 with new independent trial',
    actual: `HTTP ${trialIndependent.status}: success=${trialIndependent.data.success}`,
    status: trialIndependent.status === 200 && trialIndependent.data.success ? 'PASS' : 'FAIL',
  });

  // SEC-005: DEMO_MODE distinction
  const demoFallback = LicenseService.initializeDefaultTrial('trial_14');
  recordTest({
    id: 'SEC-005',
    category: 'Trial Protection',
    name: 'DEMO_MODE vs Official Server Trial Distinction',
    input: 'Local evaluation initialization when offline',
    expected: 'License marked as DEMO_MODE (not false server trial)',
    actual: `License status: ${demoFallback.status}`,
    status: demoFallback.status === 'DEMO_MODE' ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 2: REAL HTTP CONCURRENCY TEST (P0: Section 4)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 2: Real HTTP Concurrency & Device Limits ---');

  // Step 1: Admin issues a 3-device license
  const customKey = `LCS-TEST-3DEV-${testRunId}`;
  const issue3Dev = await postJson(
    '/api/admin/license/issue',
    {
      customerName: 'Concurrency Test Customer',
      businessName: 'Concurrency Test Cyber Point',
      planId: 'yearly_1y',
      deviceLimit: 3,
      customLicenseKey: customKey,
    },
    { 'x-admin-key': ADMIN_KEY }
  );

  recordTest({
    id: 'SEC-006',
    category: 'License Issuance',
    name: 'Admin Issuance of 3-Device Commercial Key',
    input: `Key: ${customKey}, Device Limit: 3`,
    expected: 'HTTP 201 with issued license',
    actual: `HTTP ${issue3Dev.status}: success=${issue3Dev.data.success}`,
    status: issue3Dev.status === 201 && issue3Dev.data.success ? 'PASS' : 'FAIL',
  });

  // Step 2: Fire 10 simultaneous HTTP activation requests against the real Express endpoint
  const deviceRequests = Array.from({ length: 10 }, (_, i) => ({
    licenseKey: customKey,
    deviceId: `DEV_RACE_${testRunId}_${i + 1}`,
  }));

  const activationResponses = await Promise.all(
    deviceRequests.map((req) => postJson('/api/license/activate', req))
  );

  const successfulActivations = activationResponses.filter((r) => r.status === 200).length;
  const rejectedLimitActivations = activationResponses.filter(
    (r) => r.status === 403 && r.data.errorCode === 'DEVICE_LIMIT_REACHED'
  ).length;

  recordTest({
    id: 'SEC-007',
    category: 'Concurrency Protection',
    name: '10 Simultaneous HTTP Activations on 3-Device Plan',
    input: '10 concurrent HTTP POST /api/license/activate requests',
    expected: 'Exactly 3 accepted (HTTP 200), exactly 7 rejected (HTTP 403 DEVICE_LIMIT_REACHED)',
    actual: `${successfulActivations} accepted, ${rejectedLimitActivations} rejected (DEVICE_LIMIT_REACHED)`,
    status: successfulActivations === 3 && rejectedLimitActivations === 7 ? 'PASS' : 'FAIL',
  });

  // Step 3: Verify Authority Database state directly
  const db = getAuthorityDatabase();
  const licRecord = db.prepare('SELECT id FROM licenses WHERE license_key = ?').get(customKey);
  const activeDevsInDb = licRecord
    ? db.prepare("SELECT COUNT(*) as cnt FROM devices WHERE license_id = ? AND status = 'ACTIVE'").get(licRecord.id).cnt
    : 0;

  recordTest({
    id: 'SEC-008',
    category: 'Concurrency Protection',
    name: 'Database Active Device Slot Verification',
    input: `Query devices table for license ${customKey}`,
    expected: 'Exactly 3 active devices recorded in SQL database',
    actual: `${activeDevsInDb} active devices in DB`,
    status: activeDevsInDb === 3 ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 3: REAL IDEMPOTENCY VERIFICATION (P0: Section 5)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 3: Real Idempotency Verification ---');

  const idemKey = `IDEM_TEST_${testRunId}_1`;
  const idemPayloadA = {
    deviceId: `DEV_IDEM_${testRunId}_A`,
    businessName: 'Idempotency Testing Lab',
  };

  // Test A: Same request (same Idempotency-Key + same payload) returns same result
  const idemReq1 = await postJson('/api/license/trial/start', idemPayloadA, { 'idempotency-key': idemKey });
  const idemReq2 = await postJson('/api/license/trial/start', idemPayloadA, { 'idempotency-key': idemKey });

  const sameLogicalResult =
    idemReq1.status === idemReq2.status &&
    idemReq1.data.license?.licenseKey === idemReq2.data.license?.licenseKey;

  recordTest({
    id: 'SEC-009',
    category: 'Idempotency',
    name: 'Test A: Replay Same Key & Same Payload',
    input: `idempotency-key: ${idemKey}, payload A`,
    expected: 'Identical cached response returned',
    actual: `Req1 status ${idemReq1.status}, Req2 status ${idemReq2.status}, key matched: ${sameLogicalResult}`,
    status: sameLogicalResult ? 'PASS' : 'FAIL',
  });

  // Test B: Same Idempotency-Key + different payload MUST be rejected (409 Conflict)
  const idemPayloadB = {
    deviceId: `DEV_IDEM_${testRunId}_DIFFERENT`,
    businessName: 'Tampered Idempotency Payload',
  };
  const idemReqMismatch = await postJson('/api/license/trial/start', idemPayloadB, { 'idempotency-key': idemKey });

  recordTest({
    id: 'SEC-010',
    category: 'Idempotency',
    name: 'Test B: Reused Key with Differing Payload Mismatch',
    input: `Same idempotency-key ${idemKey}, payload B`,
    expected: 'HTTP 409 Conflict with IDEMPOTENCY_PAYLOAD_MISMATCH',
    actual: `HTTP ${idemReqMismatch.status}: errorCode=${idemReqMismatch.data.errorCode}`,
    status: idemReqMismatch.status === 409 && idemReqMismatch.data.errorCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH' ? 'PASS' : 'FAIL',
  });

  // Test C: 10 concurrent duplicate requests with same Idempotency-Key
  const idemConcKey = `IDEM_CONC_${testRunId}`;
  const idemConcPayload = {
    deviceId: `DEV_IDEM_CONC_${testRunId}`,
    businessName: 'Concurrent Idempotency Lab',
  };

  const concIdemResponses = await Promise.all(
    Array.from({ length: 10 }, () =>
      postJson('/api/license/trial/start', idemConcPayload, { 'idempotency-key': idemConcKey })
    )
  );

  const concSuccessCodes = concIdemResponses.map((r) => r.status);
  const allSucceeded = concSuccessCodes.every((s) => s === 200);
  const distinctLicenses = new Set(concIdemResponses.map((r) => r.data.license?.licenseKey)).size;

  recordTest({
    id: 'SEC-011',
    category: 'Idempotency',
    name: 'Test C: 10 Concurrent Requests with Same Idempotency Key',
    input: '10 parallel requests with same key & payload',
    expected: 'All return HTTP 200 with exactly ONE distinct logical operation created',
    actual: `All HTTP 200: ${allSucceeded}, distinct license keys created: ${distinctLicenses}`,
    status: allSucceeded && distinctLicenses === 1 ? 'PASS' : 'FAIL',
  });

  // Test D: Different keys treated as separate operations
  const keyAlpha = `IDEM_ALPHA_${testRunId}`;
  const keyBeta = `IDEM_BETA_${testRunId}`;
  const resAlpha = await postJson(
    '/api/license/trial/start',
    { deviceId: `DEV_ALPHA_${testRunId}`, businessName: 'Alpha' },
    { 'idempotency-key': keyAlpha }
  );
  const resBeta = await postJson(
    '/api/license/trial/start',
    { deviceId: `DEV_BETA_${testRunId}`, businessName: 'Beta' },
    { 'idempotency-key': keyBeta }
  );

  recordTest({
    id: 'SEC-012',
    category: 'Idempotency',
    name: 'Test D: Different Keys Treated as Separate Operations',
    input: `keyAlpha vs keyBeta`,
    expected: 'Both execute independently with distinct license IDs',
    actual: `Alpha Lic: ${resAlpha.data.license?.licenseKey}, Beta Lic: ${resBeta.data.license?.licenseKey}`,
    status:
      resAlpha.status === 200 &&
      resBeta.status === 200 &&
      resAlpha.data.license?.licenseKey !== resBeta.data.license?.licenseKey
        ? 'PASS'
        : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 4: LICENSE ISSUANCE AUTHORITY (P0: Section 6)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 4: Complete License Issuance Authority ---');

  // SEC-013: Arbitrary client-side key minting is REJECTED
  const fakeKey = `LCS-MINTED-BY-CLIENT-${testRunId}`;
  const fakeActivation = await postJson('/api/license/activate', {
    licenseKey: fakeKey,
    deviceId: `DEV_HACKER_${testRunId}`,
  });

  recordTest({
    id: 'SEC-013',
    category: 'License Issuance',
    name: 'Unissued Arbitrary Key Activation Rejection',
    input: `Random fabricated key: ${fakeKey}`,
    expected: 'HTTP 404 with INVALID_LICENSE_KEY (arbitrary minting prevented)',
    actual: `HTTP ${fakeActivation.status}: errorCode=${fakeActivation.data.errorCode}`,
    status: fakeActivation.status === 404 && fakeActivation.data.errorCode === 'INVALID_LICENSE_KEY' ? 'PASS' : 'FAIL',
  });

  // SEC-014: Official Admin Issuance creates valid verifiable license
  const legitimateKey = `LCS-OFFICIAL-${testRunId}`;
  const officialIssue = await postJson(
    '/api/admin/license/issue',
    {
      customerName: 'Prime Cyber Services',
      businessName: 'Prime Point',
      planId: 'yearly_1y',
      deviceLimit: 5,
      userLimit: 15,
      durationDays: 365,
      customLicenseKey: legitimateKey,
    },
    { 'x-admin-key': ADMIN_KEY }
  );

  recordTest({
    id: 'SEC-014',
    category: 'License Issuance',
    name: 'Authority Server License Issuance',
    input: `Issue key: ${legitimateKey}`,
    expected: 'HTTP 201 with signed RS256 token',
    actual: `HTTP ${officialIssue.status}: signedToken=${Boolean(officialIssue.data.signedToken)}`,
    status: officialIssue.status === 201 && officialIssue.data.success && Boolean(officialIssue.data.signedToken) ? 'PASS' : 'FAIL',
  });

  // SEC-015: Legitimate key activation on workstation
  const officialActivation = await postJson('/api/license/activate', {
    licenseKey: legitimateKey,
    deviceId: `DEV_PRIME_01_${testRunId}`,
  });

  recordTest({
    id: 'SEC-015',
    category: 'License Issuance',
    name: 'Workstation Activation of Issued Key',
    input: `Activate key: ${legitimateKey}`,
    expected: 'HTTP 200 with activated token',
    actual: `HTTP ${officialActivation.status}: success=${officialActivation.data.success}`,
    status: officialActivation.status === 200 && officialActivation.data.success ? 'PASS' : 'FAIL',
  });

  // SEC-016: Admin License Suspension
  const suspendRes = await postJson(
    '/api/admin/license/suspend',
    { licenseId: officialIssue.data.licenseId, reason: 'Payment dispute' },
    { 'x-admin-key': ADMIN_KEY }
  );

  // Attempting activation of suspended license must fail
  const activateSuspended = await postJson('/api/license/activate', {
    licenseKey: legitimateKey,
    deviceId: `DEV_PRIME_02_${testRunId}`,
  });

  recordTest({
    id: 'SEC-016',
    category: 'License Issuance',
    name: 'Suspended License Activation Rejection',
    input: `Activate suspended key ${legitimateKey}`,
    expected: 'HTTP 403 with LICENSE_SUSPENDED',
    actual: `HTTP ${activateSuspended.status}: errorCode=${activateSuspended.data.errorCode}`,
    status: activateSuspended.status === 403 && activateSuspended.data.errorCode === 'LICENSE_SUSPENDED' ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 5: ADMIN AUTHENTICATION & TIMING SAFETY (P0: Section 7)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 5: Admin Authentication Review ---');

  // SEC-017: Missing admin key
  const noAdminAuth = await postJson('/api/admin/license/issue', { planId: 'yearly_1y' });
  recordTest({
    id: 'SEC-017',
    category: 'Admin Security',
    name: 'Missing Admin Header Authentication Rejection',
    input: 'POST /api/admin/license/issue with no x-admin-key',
    expected: 'HTTP 401 with UNAUTHORIZED_ADMIN',
    actual: `HTTP ${noAdminAuth.status}: errorCode=${noAdminAuth.data.errorCode}`,
    status: noAdminAuth.status === 401 && noAdminAuth.data.errorCode === 'UNAUTHORIZED_ADMIN' ? 'PASS' : 'FAIL',
  });

  // SEC-018: Invalid admin key
  const badAdminAuth = await postJson(
    '/api/admin/license/issue',
    { planId: 'yearly_1y' },
    { 'x-admin-key': 'WRONG_SECRET_GUESS' }
  );
  recordTest({
    id: 'SEC-018',
    category: 'Admin Security',
    name: 'Invalid Admin Key Constant-Time Rejection',
    input: 'x-admin-key: WRONG_SECRET_GUESS',
    expected: 'HTTP 401 with UNAUTHORIZED_ADMIN',
    actual: `HTTP ${badAdminAuth.status}: errorCode=${badAdminAuth.data.errorCode}`,
    status: badAdminAuth.status === 401 && badAdminAuth.data.errorCode === 'UNAUTHORIZED_ADMIN' ? 'PASS' : 'FAIL',
  });

  // SEC-019: Admin Security Event Audit Logging
  const secEvents = db
    .prepare("SELECT event_type FROM security_events WHERE event_type = 'ADMIN_AUTH_FAILED' ORDER BY timestamp DESC LIMIT 1")
    .get() as any;
  recordTest({
    id: 'SEC-019',
    category: 'Admin Security',
    name: 'Admin Authentication Failure Audit Event Logged',
    input: 'Query security_events for ADMIN_AUTH_FAILED',
    expected: 'ADMIN_AUTH_FAILED record exists in security_events',
    actual: `Found event: ${secEvents?.event_type}`,
    status: secEvents?.event_type === 'ADMIN_AUTH_FAILED' ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 6: REAL KEY ROTATION & RETIREMENT (P0: Section 11)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 6: Real Key Rotation Lifecycle ---');

  // Issue license with initial key
  const preRotationKey = `LCS-PRE-ROT-${testRunId}`;
  const preRotIssue = await postJson(
    '/api/admin/license/issue',
    { customLicenseKey: preRotationKey, planId: 'yearly_1y' },
    { 'x-admin-key': ADMIN_KEY }
  );
  const oldKid = JSON.parse(preRotIssue.data.signedToken).keyId;

  // SEC-020: Validate pre-rotation token
  const val1 = await postJson('/api/license/validate', { signedToken: preRotIssue.data.signedToken });
  recordTest({
    id: 'SEC-020',
    category: 'Key Rotation',
    name: 'Validation of Token with Initial Key',
    input: `Token with kid: ${oldKid}`,
    expected: 'HTTP 200 valid: true',
    actual: `HTTP ${val1.status}: valid=${val1.data.valid}`,
    status: val1.status === 200 && val1.data.valid ? 'PASS' : 'FAIL',
  });

  // SEC-021: Admin rotates signing key
  const rotRes = await postJson('/api/admin/keys/rotate', {}, { 'x-admin-key': ADMIN_KEY });
  const newKid = rotRes.data.newKid;
  recordTest({
    id: 'SEC-021',
    category: 'Key Rotation',
    name: 'Authority Key Rotation Endpoint Execution',
    input: 'POST /api/admin/keys/rotate',
    expected: `HTTP 200 with new active kid, old kid moved to VERIFY_ONLY`,
    actual: `HTTP ${rotRes.status}: old=${rotRes.data.oldKid}, new=${rotRes.data.newKid}`,
    status: rotRes.status === 200 && rotRes.data.newKid && rotRes.data.oldKid === oldKid ? 'PASS' : 'FAIL',
  });

  // SEC-022: Issue new license — must be signed by NEW key
  const postRotationKey = `LCS-POST-ROT-${testRunId}`;
  const postRotIssue = await postJson(
    '/api/admin/license/issue',
    { customLicenseKey: postRotationKey, planId: 'yearly_1y' },
    { 'x-admin-key': ADMIN_KEY }
  );
  const postRotTokenParsed = JSON.parse(postRotIssue.data.signedToken);

  recordTest({
    id: 'SEC-022',
    category: 'Key Rotation',
    name: 'New Token Signed with Rotated ACTIVE Key',
    input: `Issue key: ${postRotationKey}`,
    expected: `Token signed with new kid: ${newKid}`,
    actual: `Token signed with kid: ${postRotTokenParsed.keyId}`,
    status: postRotTokenParsed.keyId === newKid ? 'PASS' : 'FAIL',
  });

  // SEC-023: Old token continues to validate (VERIFY_ONLY status)
  const valOldToken = await postJson('/api/license/validate', { signedToken: preRotIssue.data.signedToken });
  recordTest({
    id: 'SEC-023',
    category: 'Key Rotation',
    name: 'Old Token Continues Validating via VERIFY_ONLY Key',
    input: `Validate token with previous kid ${oldKid}`,
    expected: 'HTTP 200 valid: true (backward compatibility preserved)',
    actual: `HTTP ${valOldToken.status}: valid=${valOldToken.data.valid}`,
    status: valOldToken.status === 200 && valOldToken.data.valid ? 'PASS' : 'FAIL',
  });

  // SEC-024: Retire the old key (with force: true to decommission key with active licenses)
  const retireRes = await postJson(
    '/api/admin/keys/retire',
    { kid: oldKid, reason: 'Scheduled key lifecycle retirement', force: true },
    { 'x-admin-key': ADMIN_KEY }
  );
  recordTest({
    id: 'SEC-024',
    category: 'Key Rotation',
    name: 'Authority Key Retirement Execution',
    input: `Retire kid: ${oldKid} with force: true`,
    expected: 'HTTP 200 success: true',
    actual: `HTTP ${retireRes.status}: success=${retireRes.data.success}`,
    status: retireRes.status === 200 && retireRes.data.success ? 'PASS' : 'FAIL',
  });

  // SEC-025: Old token signed by RETIRED/REVOKED key is now rejected
  const valRetiredToken = await postJson('/api/license/validate', { signedToken: preRotIssue.data.signedToken });
  recordTest({
    id: 'SEC-025',
    category: 'Key Rotation',
    name: 'Tokens Signed by RETIRED Key Are Rejected',
    input: `Validate token with retired kid ${oldKid}`,
    expected: 'HTTP 401 with KEY_REVOKED or KEY_RETIRED_OR_REVOKED',
    actual: `HTTP ${valRetiredToken.status}: errorCode=${valRetiredToken.data.errorCode}`,
    status: valRetiredToken.status === 401 && (valRetiredToken.data.errorCode === 'KEY_REVOKED' || valRetiredToken.data.errorCode === 'KEY_RETIRED_OR_REVOKED') ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 7: CRYPTOGRAPHIC INTEGRITY & ANTI-TAMPERING (P0)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 7: Cryptographic Integrity & Anti-Tampering ---');

  // SEC-026: Tamper with expiry date
  const validTokenObj = JSON.parse(postRotIssue.data.signedToken);
  const tamperedExpiryObj = {
    ...validTokenObj,
    payload: {
      ...validTokenObj.payload,
      expiryDate: '2099-12-31T23:59:59.000Z', // Tampered 99-year expiry
    },
  };
  const valTamperedExpiry = await postJson('/api/license/validate', { signedToken: JSON.stringify(tamperedExpiryObj) });
  recordTest({
    id: 'SEC-026',
    category: 'Cryptography',
    name: 'Tampered Expiry Date Signature Rejection',
    input: 'Modified expiry date with unchanged signature',
    expected: 'HTTP 401 with SIGNATURE_INVALID',
    actual: `HTTP ${valTamperedExpiry.status}: errorCode=${valTamperedExpiry.data.errorCode}`,
    status: valTamperedExpiry.status === 401 && valTamperedExpiry.data.errorCode === 'SIGNATURE_INVALID' ? 'PASS' : 'FAIL',
  });

  // SEC-027: Tamper with plan ID
  const tamperedPlanObj = {
    ...validTokenObj,
    payload: {
      ...validTokenObj.payload,
      planId: 'lifetime',
    },
  };
  const valTamperedPlan = await postJson('/api/license/validate', { signedToken: JSON.stringify(tamperedPlanObj) });
  recordTest({
    id: 'SEC-027',
    category: 'Cryptography',
    name: 'Tampered Plan ID Signature Rejection',
    input: 'Modified planId to lifetime',
    expected: 'HTTP 401 with SIGNATURE_INVALID',
    actual: `HTTP ${valTamperedPlan.status}: errorCode=${valTamperedPlan.data.errorCode}`,
    status: valTamperedPlan.status === 401 && valTamperedPlan.data.errorCode === 'SIGNATURE_INVALID' ? 'PASS' : 'FAIL',
  });

  // SEC-028: Cross-Tenant Business ID Mismatch
  const valTenantMismatch = await postJson('/api/license/validate', {
    signedToken: postRotIssue.data.signedToken,
    businessId: 'biz_FOREIGN_ATTACKER_TENANT',
  });
  recordTest({
    id: 'SEC-028',
    category: 'Cryptography',
    name: 'Token Business Tenant Binding Enforcement',
    input: 'Validate valid token with mismatched businessId',
    expected: 'HTTP 403 with BUSINESS_MISMATCH',
    actual: `HTTP ${valTenantMismatch.status}: errorCode=${valTenantMismatch.data.errorCode}`,
    status: valTenantMismatch.status === 403 && valTenantMismatch.data.errorCode === 'BUSINESS_MISMATCH' ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 8: TENANT ISOLATION AUDIT & PENETRATION (P0: Section 14 & 15)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 8: Multi-Tenant Isolation Penetration Test ---');

  // Setup: Simulate Business A and Business B environments
  const BIZ_A = `biz_alpha_${testRunId}`;
  const BIZ_B = `biz_beta_${testRunId}`;

  // Configure Business A
  BusinessConfigService.saveConfig({
    ...BusinessConfigService.getConfig(),
    profile: {
      ...BusinessConfigService.getConfig().profile,
      businessId: BIZ_A,
      businessName: 'Alpha Cyber Center',
    },
  });

  // Create Business A customer
  const custA = StorageService.upsertCustomer({
    name: 'Customer Alpha John',
    phone: '9800011111',
  });

  // Create Business A job
  const jobA = StorageService.addJob({
    id: `JOB_A_${testRunId}`,
    customerId: custA.id,
    customerName: custA.name,
    customerPhone: custA.phone,
    serviceName: 'A4 Printing Alpha',
    serviceCategory: 'Printing',
    customSpecsSummary: '10x A4 Printing Alpha',
    quantity: 10,
    subtotal: 50,
    discount: 0,
    tax: 0,
    totalAmount: 50,
    advancePaid: 50,
    balanceDue: 0,
    paymentHistory: [],
    status: 'delivered',
    priority: 'normal',
    createdByStaff: 'Operator A',
    createdAt: new Date().toISOString(),
  });

  // Create Business A invoice
  const invA = StorageService.addInvoice({
    id: `NP-INV-A-${testRunId}`,
    date: new Date().toISOString(),
    type: 'quick',
    customer: {
      id: custA.id,
      name: custA.name,
      phone: custA.phone,
    },
    items: [],
    subtotal: 50,
    discount: 0,
    tax: 0,
    total: 50,
    paid: 50,
    balance: 0,
    paymentMethod: 'Cash',
    staff: 'Operator A',
  });

  // Switch context to Business B
  BusinessConfigService.saveConfig({
    ...BusinessConfigService.getConfig(),
    profile: {
      ...BusinessConfigService.getConfig().profile,
      businessId: BIZ_B,
      businessName: 'Beta Cyber Point',
    },
  });

  // SEC-029: Cross-Tenant Customer Read Isolation
  const customersSeenByB = StorageService.getCustomers();
  const seesCustomerA = customersSeenByB.some((c) => c.id === custA.id || c.name === custA.name);
  recordTest({
    id: 'SEC-029',
    category: 'Tenant Isolation',
    name: 'Cross-Tenant Customer Read Isolation',
    input: `Logged into Business B (${BIZ_B}), querying customers`,
    expected: 'Customer A is NOT visible in Business B customer list',
    actual: `Customer Alpha visible in B: ${seesCustomerA}`,
    status: !seesCustomerA ? 'PASS' : 'FAIL',
  });

  // SEC-030: Cross-Tenant Job Read Isolation
  const jobsSeenByB = StorageService.getJobs();
  const seesJobA = jobsSeenByB.some((j) => j.id === jobA.id);
  recordTest({
    id: 'SEC-030',
    category: 'Tenant Isolation',
    name: 'Cross-Tenant Job Read Isolation',
    input: `Logged into Business B, querying jobs`,
    expected: 'Job A is NOT visible in Business B job list',
    actual: `Job A visible in B: ${seesJobA}`,
    status: !seesJobA ? 'PASS' : 'FAIL',
  });

  // SEC-031: Cross-Tenant Invoice Read Isolation
  const invoicesSeenByB = StorageService.getInvoices();
  const seesInvoiceA = invoicesSeenByB.some((i) => i.id === invA.id);
  recordTest({
    id: 'SEC-031',
    category: 'Tenant Isolation',
    name: 'Cross-Tenant Invoice Read Isolation',
    input: `Logged into Business B, querying invoices`,
    expected: 'Invoice A is NOT visible in Business B invoices',
    actual: `Invoice A visible in B: ${seesInvoiceA}`,
    status: !seesInvoiceA ? 'PASS' : 'FAIL',
  });

  // SEC-032: Database Export Isolation
  const exportFromB = StorageService.exportDatabaseJSON();
  const parsedExportB = JSON.parse(exportFromB);
  const exportContainsA =
    parsedExportB.customers.some((c: any) => c.businessId === BIZ_A) ||
    parsedExportB.jobs.some((j: any) => j.businessId === BIZ_A) ||
    parsedExportB.invoices.some((i: any) => i.businessId === BIZ_A);

  recordTest({
    id: 'SEC-032',
    category: 'Tenant Isolation',
    name: 'Database JSON Export Multi-Tenant Scoping',
    input: `Exporting database while in Business B`,
    expected: 'Export excludes all operational records from Business A',
    actual: `Export contains Business A records: ${exportContainsA}`,
    status: !exportContainsA ? 'PASS' : 'FAIL',
  });

  // SEC-033: Malicious Backup Import Remapping
  const maliciousBackup = JSON.stringify({
    version: '3.2_TENANT_SECURE',
    timestamp: new Date().toISOString(),
    businessId: BIZ_A, // Foreign business
    customers: [{ id: `cust_foreign_${testRunId}`, name: 'Foreign Customer', phone: '9999900000', businessId: BIZ_A }],
  });
  StorageService.importDatabaseJSON(maliciousBackup);
  const importedCustomers = StorageService.getCustomers();
  const importedCustomer = importedCustomers.find((c) => c.name === 'Foreign Customer');
  const properlyBound = importedCustomer && importedCustomer.businessId === BIZ_B;

  recordTest({
    id: 'SEC-033',
    category: 'Tenant Isolation',
    name: 'Malicious Backup Import Tenant Boundary Remapping',
    input: `Import file claiming businessId: ${BIZ_A} into active tenant ${BIZ_B}`,
    expected: 'Imported records safely remapped to active tenant B (no tenant collision)',
    actual: `Imported customer businessId: ${importedCustomer?.businessId}`,
    status: properlyBound ? 'PASS' : 'FAIL',
  });

  // Reset to default config
  BusinessConfigService.saveConfig({
    ...BusinessConfigService.getConfig(),
    profile: {
      ...BusinessConfigService.getConfig().profile,
      businessId: 'biz_nil_printers_001',
      businessName: 'NiL Printers',
    },
  });

  // -------------------------------------------------------------
  // CATEGORY 9: AUTHORITY DATABASE BACKUP & RECOVERY (P0: Section 12 & 13)
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 9: Authority Database Backup & Recovery ---');

  const mainDbPath = path.resolve(__dirname, '../src/server/data_server_authority.sqlite');
  const backupDbPath = path.resolve(__dirname, `../src/server/data_server_authority_backup_${testRunId}.sqlite`);

  // SEC-034: Create Authority SQLite Backup Snapshot
  let backupSuccessful = false;
  try {
    // Flush WAL to disk first so all pages are written into main file
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    fs.copyFileSync(mainDbPath, backupDbPath);
    backupSuccessful = fs.existsSync(backupDbPath) && fs.statSync(backupDbPath).size > 0;
  } catch (e: any) {
    console.error('Backup snapshot failed:', e);
  }

  recordTest({
    id: 'SEC-034',
    category: 'Backup & Recovery',
    name: 'Authority SQLite Database Snapshot Backup',
    input: `Copy ${mainDbPath} -> ${backupDbPath}`,
    expected: 'Backup snapshot created with non-zero byte size',
    actual: `File exists: ${backupSuccessful}`,
    status: backupSuccessful ? 'PASS' : 'FAIL',
  });

  // SEC-035: Verify Backup Database Integrity by opening and querying
  let backupRestoredOk = false;
  let licCountInBackup = 0;
  try {
    const backupDb = getAuthorityDatabase(backupDbPath);
    const countRow = backupDb.prepare('SELECT COUNT(*) as cnt FROM licenses').get() as any;
    licCountInBackup = countRow.cnt;
    backupRestoredOk = licCountInBackup >= 1;
    if (typeof backupDb.close === 'function') {
      backupDb.close();
    }
  } catch (e: any) {
    console.error('Backup query verification error:', e);
  }

  // Cleanup test backup file
  try {
    if (fs.existsSync(backupDbPath)) {
      fs.unlinkSync(backupDbPath);
    }
  } catch (_) {}

  recordTest({
    id: 'SEC-035',
    category: 'Backup & Recovery',
    name: 'Authority Database Restore & Table Query Verification',
    input: `Query licenses table from restored backup snapshot`,
    expected: 'Database opens cleanly with all license & key tables intact',
    actual: `Licenses recovered from backup: ${licCountInBackup}`,
    status: backupRestoredOk ? 'PASS' : 'FAIL',
  });

  // -------------------------------------------------------------
  // CATEGORY 10: SECURITY HEADERS & OFFLINE RESILIENCE
  // -------------------------------------------------------------
  console.log('\n--- CATEGORY 10: Security Headers & Offline Resilience ---');

  // SEC-036: Security headers check
  const healthHead = await getJson('/api/license/health');
  const xContentType = healthHead.headers.get('x-content-type-options');
  const xFrame = healthHead.headers.get('x-frame-options');
  const referrerPolicy = healthHead.headers.get('referrer-policy');

  const headersOk =
    xContentType === 'nosniff' &&
    xFrame === 'SAMEORIGIN' &&
    referrerPolicy === 'strict-origin-when-cross-origin';

  recordTest({
    id: 'SEC-036',
    category: 'Security Headers',
    name: 'Standard Express Security Headers Verification',
    input: 'GET /api/license/health response headers',
    expected: 'X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy',
    actual: `nosniff=${xContentType}, frame=${xFrame}, referrer=${referrerPolicy}`,
    status: headersOk ? 'PASS' : 'FAIL',
  });

  // SEC-037: Offline valid license validation
  const offlineLicense = {
    ...LicenseService.getLicense(),
    status: 'ACTIVE' as const,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    lastValidationAt: new Date().toISOString(),
  };
  const offlineVal = LicenseService.validateLicense();
  recordTest({
    id: 'SEC-037',
    category: 'Offline Resilience',
    name: 'Local Valid License Evaluation',
    input: 'Offline validation of active license',
    expected: 'Validation succeeds with valid: true',
    actual: `valid=${offlineVal.valid}, status=${offlineVal.status}`,
    status: offlineVal.valid ? 'PASS' : 'FAIL',
  });

  // SEC-038: Anti-clock manipulation detection (System clock moved backward > 24 hours)
  const clockTamperedLicense = {
    ...LicenseService.getLicense(),
    status: 'ACTIVE' as const,
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    lastValidationAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // Future validation timestamp
  };
  LicenseService.saveLicense(clockTamperedLicense);
  const tamperedClockVal = LicenseService.validateLicense();

  recordTest({
    id: 'SEC-038',
    category: 'Offline Resilience',
    name: 'Anti-Clock Manipulation Detection (Backward Rewind)',
    input: 'Current time is > 24 hours earlier than lastValidationAt',
    expected: 'License flagged as tampered / suspended due to clock discrepancy',
    actual: `valid=${tamperedClockVal.valid}, isTampered=${tamperedClockVal.isTampered}`,
    status: !tamperedClockVal.valid && tamperedClockVal.isTampered ? 'PASS' : 'FAIL',
  });

  // Reset license state
  LicenseService.initializeDefaultTrial('trial_14');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log('\n================================================================');
  console.log(`   SUITE COMPLETE: ${passCount} PASSED / ${failCount} FAILED (TOTAL: ${results.length})   `);
  console.log('================================================================\n');

  return results;
}

// Self-executing runner if called directly
runSecuritySuite()
  .then((res) => {
    const hasFailures = res.some((r) => r.status === 'FAIL');
    process.exit(hasFailures ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal test suite runner error:', err);
    process.exit(1);
  });
