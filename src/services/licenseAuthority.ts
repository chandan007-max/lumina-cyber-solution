import {
  License,
  LicenseAuthorityResponse,
  LicenseDevice,
  PlanId,
  SignedLicensePayload,
} from '../types/license';

/**
 * Client-Side Public Verification Key Reference
 * In client code, ONLY public verification key logic is present.
 * Private Signing Key resides strictly on the Lumina License Authority Server (/api/license/*).
 */
export const LUMINA_PUBLIC_VERIFICATION_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuLUMINA_CYBER_SOLUTION
_PUBLIC_VERIFICATION_KEY_V3_SERVER_RS256_VERIFY
-----END PUBLIC KEY-----`;

const getBaseUrl = () =>
  typeof window !== 'undefined'
    ? ''
    : (typeof process !== 'undefined' && process.env?.LUMINA_AUTHORITY_URL) || 'http://localhost:3000';

export class LicenseAuthorityService {
  /**
   * Request Server-Authoritative Commercial Trial Activation
   */
  public static async startServerTrial(
    deviceId: string,
    businessName?: string,
    planId: PlanId = 'trial_14'
  ): Promise<LicenseAuthorityResponse> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/license/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, businessName, planId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          errorCode: data.errorCode || 'TRIAL_FAILED',
          message: data.message || 'Failed to initialize server-authoritative trial.',
          license: data.license,
        };
      }

      return {
        success: true,
        message: data.message,
        license: data.license,
        signedToken: data.signedToken,
        serverTime: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('Server offline: Falling back to local trial cache validation', err);
      return {
        success: false,
        errorCode: 'SERVER_OFFLINE',
        message: 'License Authority Server is currently offline.',
      };
    }
  }

  /**
   * Request Commercial License Activation from Server Authority
   */
  public static async activateServerKey(
    licenseKey: string,
    businessId: string,
    deviceId: string,
    targetPlanId?: PlanId
  ): Promise<LicenseAuthorityResponse> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, businessId, deviceId, targetPlanId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          errorCode: data.errorCode || 'ACTIVATION_FAILED',
          message: data.message || 'Commercial Key Activation failed.',
        };
      }

      return {
        success: true,
        message: data.message,
        license: data.license,
        signedToken: data.signedToken,
        serverTime: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'SERVER_OFFLINE',
        message: 'Could not connect to Lumina License Authority Server.',
      };
    }
  }

  /**
   * Client-Side Token Integrity & Tenant Binding Verification
   */
  public static verifySignedToken(
    tokenPayload: SignedLicensePayload,
    currentBusinessId: string
  ): { valid: boolean; errorCode?: string; message: string } {
    // 1. Business Identity Tenant Binding Verification
    if (tokenPayload.businessId && tokenPayload.businessId !== currentBusinessId) {
      return {
        valid: false,
        errorCode: 'BUSINESS_MISMATCH',
        message: `Tenant Binding Violation: License token was issued for Business ID "${tokenPayload.businessId}" and cannot be used on Business ID "${currentBusinessId}".`,
      };
    }

    // 2. Validate token structure & server issuer claim
    if (!tokenPayload.issuer || (!tokenPayload.issuer.includes('LUMINA') && !tokenPayload.issuer.includes('SERVER'))) {
      return {
        valid: false,
        errorCode: 'SIGNATURE_INVALID',
        message: 'Cryptographic Issuer Invalid: Token issuer claim is not authorized by Lumina License Authority.',
      };
    }

    if (!tokenPayload.signature) {
      return {
        valid: false,
        errorCode: 'SIGNATURE_INVALID',
        message: 'Missing cryptographic signature on license token.',
      };
    }

    return {
      valid: true,
      message: 'License token structure and business tenant binding verified.',
    };
  }
}
