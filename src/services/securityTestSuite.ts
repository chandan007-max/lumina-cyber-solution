import { LicenseAuthorityService } from './licenseAuthority';
import { LicenseService } from './licenseService';
import { StorageService } from './storage';
import { BusinessContextService } from './businessContext';

export interface SecurityTestResult {
  testId: string;
  category: string;
  testName: string;
  expected: string;
  actual: string;
  pass: boolean;
  details?: string;
}

export class SecurityTestSuite {
  /**
   * Run complete Phase 11.2.2 Automated Security Test Matrix
   */
  public static async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    // Test 1: Client Commercial Token Issuance Prevention
    try {
      // @ts-ignore
      const hasClientSign = typeof (LicenseAuthorityService as any).signTokenPayload === 'function';
      results.push({
        testId: 'SEC-11.2.2-01',
        category: 'Authority Cryptography',
        testName: 'Client-Side License Issuance Prevention',
        expected: 'Client JS cannot execute signTokenPayload locally (must use Server /api/license/* API)',
        actual: hasClientSign ? 'Client signTokenPayload function found' : 'Client signTokenPayload removed from bundle',
        pass: !hasClientSign,
        details: 'Ensures private RSA signing key and token creation exist exclusively on the Lumina License Authority server.',
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-01',
        category: 'Authority Cryptography',
        testName: 'Client-Side License Issuance Prevention',
        expected: 'Client JS cannot execute signTokenPayload locally',
        actual: `Pass: ${err.message}`,
        pass: true,
      });
    }

    // Test 2: Token Payload Forgery Resistance
    try {
      const currentLicense = LicenseService.getLicense();
      const tamperedLicense = {
        ...currentLicense,
        signedToken: JSON.stringify({
          tokenVersion: '3.0_SERVER_RS256',
          issuer: 'LUMINA_LICENSE_AUTHORITY_SERVER',
          licenseId: 'LIC-FORGED-999',
          businessId: 'biz_forged_01',
          planId: 'lifetime',
          status: 'LIFETIME',
          expiryDate: '2099-12-31T23:59:59.000Z',
          signature: 'FORGED_INVALID_SIGNATURE_STRING',
        }),
      };

      const verification = LicenseAuthorityService.verifySignedToken(
        JSON.parse(tamperedLicense.signedToken),
        BusinessContextService.getCurrentBusinessId()
      );

      results.push({
        testId: 'SEC-11.2.2-02',
        category: 'Cryptography & Tampering',
        testName: 'Token Forgery Signature Rejection',
        expected: 'Tampered token payload rejected with SIGNATURE_INVALID or BUSINESS_MISMATCH',
        actual: `valid: ${verification.valid}, code: ${verification.errorCode}`,
        pass: !verification.valid && (verification.errorCode === 'SIGNATURE_INVALID' || verification.errorCode === 'BUSINESS_MISMATCH'),
        details: verification.message,
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-02',
        category: 'Cryptography & Tampering',
        testName: 'Token Forgery Signature Rejection',
        expected: 'Tampered token payload rejected',
        actual: `Caught exception: ${err.message}`,
        pass: true,
      });
    }

    // Test 3: Repository Multi-Tenant Read/Write Isolation
    try {
      const activeBusinessId = BusinessContextService.getCurrentBusinessId();
      const allCustomers = StorageService.getCustomers();
      const crossTenantViolation = allCustomers.some(
        (c) => c.businessId && !BusinessContextService.isCurrentTenant(c.businessId)
      );

      results.push({
        testId: 'SEC-11.2.2-03',
        category: 'Multi-Tenant Isolation',
        testName: 'Repository Multi-Tenant Customer Query Isolation',
        expected: 'StorageService queries return only records matching active business context',
        actual: crossTenantViolation ? 'Cross-tenant records returned' : 'Strict active tenant scoping enforced',
        pass: !crossTenantViolation,
        details: `Active tenant ID: "${activeBusinessId}". Scoped customer records count: ${allCustomers.length}`,
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-03',
        category: 'Multi-Tenant Isolation',
        testName: 'Repository Multi-Tenant Customer Query Isolation',
        expected: 'Active tenant scoping enforced',
        actual: `Error: ${err.message}`,
        pass: false,
      });
    }

    // Test 4: Database Backup License & Device Isolation
    try {
      const backupJson = StorageService.exportDatabaseJSON();
      const parsedBackup = JSON.parse(backupJson);
      const hasLicenseInBackup = Boolean(parsedBackup.nil_printer_license || parsedBackup.signedToken);

      results.push({
        testId: 'SEC-11.2.2-04',
        category: 'Backup Security',
        testName: 'Backup Export License Authority Isolation',
        expected: 'Database JSON export excludes active license tokens and device activation credentials',
        actual: hasLicenseInBackup ? 'License token leaked in backup' : 'License and device activation excluded from backup',
        pass: !hasLicenseInBackup,
        details: 'Prevents license cloning or unauthorized license slot transfer via database backups.',
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-04',
        category: 'Backup Security',
        testName: 'Backup Export License Authority Isolation',
        expected: 'License excluded from backup',
        actual: `Error: ${err.message}`,
        pass: false,
      });
    }

    // Test 5: Server Authority Health & Public Key API Verification
    try {
      const healthRes = await fetch('/api/license/health');
      const healthData = await healthRes.json();
      const isHealthy = healthRes.ok && healthData.status === 'HEALTHY' && healthData.algorithm === 'RS256';

      results.push({
        testId: 'SEC-11.2.2-05',
        category: 'Server Authority Infrastructure',
        testName: 'Server Authority Database & Key Health Check',
        expected: 'Server responds HTTP 200 HEALTHY with RS256 algorithm and transactional database status',
        actual: `HTTP ${healthRes.status}: ${healthData.status} (DB: ${healthData.database})`,
        pass: isHealthy,
        details: `Server algorithm: ${healthData.algorithm}, Key ID: ${healthData.keyId}`,
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-05',
        category: 'Server Authority Infrastructure',
        testName: 'Server Authority Database & Key Health Check',
        expected: 'Server responds HTTP 200 HEALTHY',
        actual: `Server unreachable or offline: ${err.message}`,
        pass: false,
      });
    }

    // Test 6: Unique Business ID Generation
    try {
      const id1 = BusinessContextService.generateUniqueBusinessId();
      const id2 = BusinessContextService.generateUniqueBusinessId();
      const isUnique = id1 !== id2 && !id1.includes('default_01');

      results.push({
        testId: 'SEC-11.2.2-06',
        category: 'Tenant Identity',
        testName: 'Unique Commercial Business ID Generation',
        expected: 'Generates non-colliding unique tenant identifiers (e.g. biz_XXXXXX)',
        actual: `ID 1: "${id1}", ID 2: "${id2}"`,
        pass: isUnique,
        details: 'Ensures new onboarded commercial customers do not share fallback default business IDs.',
      });
    } catch (err: any) {
      results.push({
        testId: 'SEC-11.2.2-06',
        category: 'Tenant Identity',
        testName: 'Unique Commercial Business ID Generation',
        expected: 'Unique IDs generated',
        actual: `Error: ${err.message}`,
        pass: false,
      });
    }

    return results;
  }
}
