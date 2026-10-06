/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Secure Credential Storage Service
 * Cryptographically isolates sensitive communication credentials (SMTP passwords, API tokens)
 * using genuine AES-256-GCM authenticated encryption (NIST SP 800-38D) with PBKDF2 key derivation.
 * Isolates credentials completely away from BusinessConfig, ordinary exports, logs, and backups.
 */

import * as crypto from 'node:crypto';
import { safeStorage } from '../storage';
import { BusinessContextService } from '../businessContext';

const VAULT_PREFIX = 'nil_sec_vault_';

export interface VaultEncryptedRecord {
  version: number;
  algorithm: 'AES-256-GCM';
  keyId: string;
  iv: string;         // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext
  authTag: string;    // Base64 encoded 16-byte authentication tag
  updatedAt: string;
}

export interface SecureVault {
  businessId: string;
  smtpPasswordEnc?: VaultEncryptedRecord | string;
  whatsAppApiKeyEnc?: VaultEncryptedRecord | string;
  updatedAt: string;
}

export class CredentialService {
  /**
   * Derive a 256-bit AES key using PBKDF2-HMAC-SHA256.
   * Master entropy is anchored in process.env.LUMINA_VAULT_MASTER_KEY or system machine secret.
   * Salt provides cryptographic domain separation per businessId.
   */
  static deriveKey(businessId: string, customMaster?: string): Buffer {
    if (!crypto || typeof (crypto as any).pbkdf2Sync !== 'function') {
      throw new Error('Platform cryptographic primitive (PBKDF2) is not available in current environment.');
    }
    const envMaster =
      typeof process !== 'undefined'
        ? process.env?.LUMINA_VAULT_MASTER_KEY || process.env?.LUMINA_SECRET_KEY
        : undefined;

    const masterSecret = customMaster || envMaster;
    if (!masterSecret) {
      throw new Error('Vault Master Key is not configured. LUMINA_VAULT_MASTER_KEY environment variable is required.');
    }

    const salt = crypto
      .createHash('sha256')
      .update(`LUMINA_VAULT_TENANT_SALT_${businessId}_v1`)
      .digest();

    // 100,000 iterations of PBKDF2-HMAC-SHA256 for a 256-bit (32-byte) key
    return crypto.pbkdf2Sync(masterSecret, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt plaintext using AES-256-GCM authenticated encryption (NIST SP 800-38D).
   * Generates a 12-byte cryptographically random IV per encryption.
   * Generates a 16-byte authentication tag.
   * Binds businessId into Authenticated Additional Data (AAD) for tenant binding.
   */
  static encrypt(plaintext: string, businessId: string, customKey?: Buffer): VaultEncryptedRecord {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty plaintext');
    }
    if (!crypto || typeof (crypto as any).createCipheriv !== 'function') {
      throw new Error('Platform cryptographic primitive (AES-256-GCM) is not available in current environment.');
    }
    const key = customKey || this.deriveKey(businessId);
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Bind tenant identity to AAD so ciphertext cannot be relocated across tenants
    cipher.setAAD(Buffer.from(`LCS_AAD_${businessId}`, 'utf8'));

    const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const keyId = `k_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)}`;

    return {
      version: 1,
      algorithm: 'AES-256-GCM',
      keyId,
      iv: iv.toString('base64'),
      ciphertext: enc.toString('base64'),
      authTag: authTag.toString('base64'),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Decrypt vault record using AES-256-GCM authenticated decryption.
   * Enforces integrity verification via authTag and AAD.
   * Throws or returns null if tampered, corrupted, or wrong key is supplied.
   */
  static decrypt(record: VaultEncryptedRecord | string, businessId: string, customKey?: Buffer): string | null {
    if (!record) return null;

    let vaultRecord: VaultEncryptedRecord;
    if (typeof record === 'string') {
      try {
        vaultRecord = JSON.parse(record);
      } catch (_) {
        return null;
      }
    } else {
      vaultRecord = record;
    }

    if (!vaultRecord.ciphertext || !vaultRecord.iv || !vaultRecord.authTag) {
      return null;
    }

    if (vaultRecord.algorithm !== 'AES-256-GCM') {
      console.warn(`Unsupported vault algorithm: ${vaultRecord.algorithm}`);
      return null;
    }

    try {
      if (!crypto || typeof (crypto as any).createDecipheriv !== 'function') {
        return null;
      }
      const key = customKey || this.deriveKey(businessId);
      const iv = Buffer.from(vaultRecord.iv, 'base64');
      const authTag = Buffer.from(vaultRecord.authTag, 'base64');
      const ciphertext = Buffer.from(vaultRecord.ciphertext, 'base64');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(`LCS_AAD_${businessId}`, 'utf8'));

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (_err) {
      // AEAD failure: tampering detected, tag mismatch, or wrong key
      // crypto will throw: "Unsupported state or unable to authenticate data"
      return null;
    }
  }

  private static getVaultKey(businessId: string): string {
    return `${VAULT_PREFIX}${businessId}`;
  }

  private static readVault(businessId: string): SecureVault {
    try {
      const raw = safeStorage.getItem(this.getVaultKey(businessId));
      if (!raw) return { businessId, updatedAt: new Date().toISOString() };
      return JSON.parse(raw);
    } catch (_) {
      return { businessId, updatedAt: new Date().toISOString() };
    }
  }

  private static writeVault(businessId: string, vault: SecureVault): void {
    vault.updatedAt = new Date().toISOString();
    safeStorage.setItem(this.getVaultKey(businessId), JSON.stringify(vault));
  }

  /**
   * Save SMTP password in the isolated vault (never in BusinessConfig or DB export)
   */
  static saveSmtpPassword(businessId: string, password: string): void {
    if (!businessId) businessId = BusinessContextService.getCurrentBusinessId();
    if (!password) {
      this.clearSmtpPassword(businessId);
      return;
    }
    const vault = this.readVault(businessId);
    const encryptedRecord = this.encrypt(password, businessId);
    vault.smtpPasswordEnc = JSON.stringify(encryptedRecord);
    this.writeVault(businessId, vault);
  }

  /**
   * Retrieve SMTP password strictly for live transmission
   */
  static getSmtpPassword(businessId?: string): string | null {
    if (!businessId) businessId = BusinessContextService.getCurrentBusinessId();
    const vault = this.readVault(businessId);
    if (!vault.smtpPasswordEnc) return null;
    return this.decrypt(vault.smtpPasswordEnc, businessId);
  }

  /**
   * Inspect the raw structured vault record without decryption
   */
  static getVaultRecord(businessId?: string): VaultEncryptedRecord | null {
    if (!businessId) businessId = BusinessContextService.getCurrentBusinessId();
    const vault = this.readVault(businessId);
    if (!vault.smtpPasswordEnc) return null;
    try {
      if (typeof vault.smtpPasswordEnc === 'string') {
        return JSON.parse(vault.smtpPasswordEnc);
      }
      return vault.smtpPasswordEnc;
    } catch (_) {
      return null;
    }
  }

  static getCredentials(businessId?: string): { smtpPasswordEnc?: string } | null {
    const pass = this.getSmtpPassword(businessId);
    return pass ? { smtpPasswordEnc: pass } : null;
  }

  static saveCredentials(businessId: string, creds: { smtpPasswordEnc?: string }): void {
    if (creds.smtpPasswordEnc) {
      this.saveSmtpPassword(businessId, creds.smtpPasswordEnc);
    }
  }

  /**
   * Check if password exists in vault without revealing content
   */
  static hasSmtpPassword(businessId?: string): boolean {
    if (!businessId) businessId = BusinessContextService.getCurrentBusinessId();
    const vault = this.readVault(businessId);
    return Boolean(vault.smtpPasswordEnc && typeof vault.smtpPasswordEnc === 'string' && vault.smtpPasswordEnc.length > 0);
  }

  /**
   * Clear SMTP password
   */
  static clearSmtpPassword(businessId?: string): void {
    if (!businessId) businessId = BusinessContextService.getCurrentBusinessId();
    const vault = this.readVault(businessId);
    delete vault.smtpPasswordEnc;
    this.writeVault(businessId, vault);
  }

  /**
   * Mask secret string for UI presentation showing only the tail
   */
  static maskSecret(secret?: string | null): string {
    if (!secret) return '••••••••••••';
    if (secret.length <= 4) return '••••••••••••';
    return `••••••••••••${secret.slice(-4)}`;
  }

  /**
   * Redact secrets, passwords, and authorization tokens from text strings
   */
  static redactSecretsFromText(text: string): string {
    if (!text) return '';
    let result = text
      .replace(/(?:smtp_?|client_?|admin_?)?password\s*[:=]\s*[^\s&"';,]+/gi, 'password=[REDACTED]')
      .replace(/token=Bearer\s+[^\s&"';,]+/gi, 'token=Bearer [REDACTED]')
      .replace(/(?:access_?token|refresh_?token|token)\s*[:=]\s*[^\s&"';,]+/gi, 'token=[REDACTED]')
      .replace(/Authorization:\s*Bearer\s+[^\s&"';,]+/gi, 'Authorization: Bearer [REDACTED]')
      .replace(/authorization\s*[:=]\s*[^\s&"';,]+/gi, 'authorization=[REDACTED]')
      .replace(/(?:x-api-key|apikey|api_key)\s*[:=]\s*[^\s&"';,]+/gi, 'api_key=[REDACTED]')
      .replace(/LUMINA_VAULT_MASTER_KEY\s*[:=]\s*[^\s&"';,]+/gi, 'LUMINA_VAULT_MASTER_KEY=[REDACTED]')
      .replace(/(?:private_?key|privatekey)\s*[:=]\s*[^\s&"';,]+/gi, 'private_key=[REDACTED]')
      .replace(/(?:client_?secret|secret_?key|master_?key|masterKey|secretKey|clientSecret)\s*[:=]\s*[^\s&"';,]+/gi, 'client_secret=[REDACTED]')
      .replace(/secret=[^\s&"';,]+/gi, 'secret=[REDACTED]')
      .replace(/key=[^\s&"';,]+/gi, 'key=[REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      .replace(/(?:https?|postgres|mysql|smtp):\/\/[^:\s'"]+:([^@\s'"]+)@/gi, '$1://[REDACTED_USER]:[REDACTED_PASSWORD]@')
      .replace(/(?:api_?key|access_?token|refresh_?token|client_?secret|secret_?key|master_?key|smtp_?password|password|secret)%3D[^&"'\s]+/gi, 'secret%3D[REDACTED]')
      .replace(/(?:%2F%2F[^%]+%3A)([^%&]+)%40/gi, '%2F%2F[REDACTED]%3A[REDACTED]%40')
      .replace(/at\s+.*?(?:password|secret|token|key|credential|auth).*?\n?/gi, '    at [REDACTED_STACK_TRACE_LINE]\n');
    return result;
  }

  /**
   * Mask sensitive Indian citizen identifiers (PAN, Aadhaar) from text previews
   */
  static maskSensitiveIdentifiers(text: string): string {
    if (!text) return '';
    // Mask PAN format (5 letters, 4 digits, 1 letter) -> XXXXX1234F
    let masked = text.replace(/\b([A-Z]{5})(\d{4}[A-Z])\b/gi, 'XXXXX$2');
    // Mask Aadhaar format (12 digits, grouped or continuous) -> XXXX XXXX 1098
    masked = masked.replace(/\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b/g, 'XXXX XXXX $3');
    masked = masked.replace(/\b(\d{8})(\d{4})\b/g, 'XXXXXXXX$2');
    return masked;
  }

  /**
   * Sanitize objects before logging or export to guarantee secrets never leak
   */
  static sanitizeForLogging(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(copy)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('privatekey') ||
        lower.includes('token') ||
        lower.includes('apikey')
      ) {
        copy[key] = '[REDACTED_SECRET]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = this.sanitizeForLogging(copy[key]);
      }
    }
    return copy;
  }
}
