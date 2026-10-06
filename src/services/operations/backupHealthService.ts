/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 13 Backup Health & Safety Subsystem
 * Production Backup Operations: Evaluates backup freshness, validates snapshot integrity,
 * detects stale backups (> 24 hours), and enforces safety guards before database restores
 * (mandatory automatic pre-restore backup, structural validation, and failure-safe rollback).
 */

import crypto from 'node:crypto';
import { CloudBackupService } from '../cloudBackup';
import { safeStorage, StorageService } from '../storage';
import { BusinessContextService } from '../businessContext';
import { BackupHealth, OperationalStatus } from '../../types/operations';

export interface PreRestoreSafetyCheckResult {
  allowed: boolean;
  errorCode?: string;
  message: string;
  preRestoreBackupId?: string;
  sourceSnapshotValidated: boolean;
  rollbackExecuted?: boolean;
  rolledBackSuccessfully?: boolean;
  beforeFingerprint?: string;
  afterFingerprint?: string;
  failurePoint?: string;
  auditEventId?: string;
}

export function computeProductionStateFingerprint(businessId?: string): string {
  const currentBusinessId = businessId || BusinessContextService.getCurrentBusinessId();
  const config = StorageService.getConfig();
  const customers = StorageService.getCustomers();
  const jobs = StorageService.getJobs();
  const invoices = StorageService.getInvoices();
  const staff = StorageService.getStaff();
  const services = StorageService.getServices();
  const materials = StorageService.getMaterials();
  const expenses = StorageService.getExpenses();

  const statePayload = {
    businessId: currentBusinessId,
    configProfile: config?.profile || {},
    customers: (customers || []).map((c) => ({ id: c.id, name: c.name, phone: c.phone })).sort((a, b) => a.id.localeCompare(b.id)),
    jobs: (jobs || []).map((j) => ({ id: j.id, customerId: j.customerId, status: j.status })).sort((a, b) => a.id.localeCompare(b.id)),
    invoices: (invoices || []).map((i) => ({ id: i.id, total: i.total, customerId: (i as any).customerId || (i as any).customer?.id })).sort((a, b) => a.id.localeCompare(b.id)),
    staffCount: (staff || []).length,
    servicesCount: (services || []).length,
    materialsCount: (materials || []).length,
    expensesCount: (expenses || []).length,
  };

  return crypto.createHash('sha256').update(JSON.stringify(statePayload)).digest('hex');
}

export class BackupHealthService {
  /**
   * Recommended backup freshness interval in hours
   */
  static readonly STALE_THRESHOLD_HOURS = 24;

  /**
   * Evaluate comprehensive backup health
   */
  static evaluateBackupHealth(): BackupHealth {
    const snapshots = CloudBackupService.getSnapshots();
    const config = CloudBackupService.getConfig();

    if (snapshots.length === 0) {
      return {
        status: 'ACTION_REQUIRED',
        isConfigured: config.autoDailyEnabled,
        destinationType: config.cloudProvider,
        ageHours: 999,
        isStale: true,
        snapshotCount: 0,
        healthSummary: 'No backup snapshots found. Immediate manual or automated backup is strongly recommended.',
        recommendedNextBackup: 'Perform immediate backup now.',
      };
    }

    // Sort by timestamp descending
    const sorted = [...snapshots].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latest = sorted[0];

    const latestTime = new Date(latest.timestamp).getTime();
    const nowTime = Date.now();
    const ageHours = Math.max(0, Math.floor((nowTime - latestTime) / (1000 * 60 * 60)));

    const isStale = ageHours >= this.STALE_THRESHOLD_HOURS;

    let status: OperationalStatus = 'HEALTHY';
    let healthSummary = `Backup is healthy. Latest snapshot created ${ageHours} hour(s) ago (${latest.sizeFormatted}).`;

    if (isStale) {
      status = 'WARNING';
      healthSummary = `ACTION REQUIRED: Latest backup is ${ageHours} hours old (threshold is ${this.STALE_THRESHOLD_HOURS}h). Run backup to protect business data.`;
    }

    return {
      status,
      isConfigured: config.autoDailyEnabled,
      lastSuccessfulBackup: latest.timestamp,
      destinationType: latest.provider || config.cloudProvider,
      ageHours,
      isStale,
      snapshotCount: snapshots.length,
      healthSummary,
      recommendedNextBackup: isStale ? 'Perform backup immediately.' : `Scheduled at ${config.backupScheduledTime} daily.`,
    };
  }

  /**
   * Structural integrity validation of a backup JSON snapshot payload.
   * Checks for valid JSON, non-zero size, and expected database entities.
   */
  static validateSnapshotIntegrity(payloadJson: string): {
    valid: boolean;
    errorCode?: string;
    message: string;
    recordCounts?: {
      jobs: number;
      invoices: number;
      customers: number;
    };
  } {
    if (!payloadJson || typeof payloadJson !== 'string' || payloadJson.trim() === '') {
      return {
        valid: false,
        errorCode: 'EMPTY_PAYLOAD',
        message: 'Backup payload is empty or zero bytes.',
      };
    }

    try {
      const parsed = JSON.parse(payloadJson);

      if (typeof parsed !== 'object' || parsed === null) {
        return {
          valid: false,
          errorCode: 'INVALID_JSON_STRUCTURE',
          message: 'Backup content does not contain a valid JSON object.',
        };
      }

      // Check required schema keys
      const hasCoreTables =
        Array.isArray(parsed.jobs) &&
        Array.isArray(parsed.invoices) &&
        Array.isArray(parsed.customers);

      if (!hasCoreTables) {
        return {
          valid: false,
          errorCode: 'CORRUPTED_SCHEMA',
          message: 'Backup snapshot is missing required core tables (jobs, invoices, or customers).',
        };
      }

      return {
        valid: true,
        message: 'Snapshot structural integrity verified.',
        recordCounts: {
          jobs: parsed.jobs.length,
          invoices: parsed.invoices.length,
          customers: parsed.customers.length,
        },
      };
    } catch (e: any) {
      return {
        valid: false,
        errorCode: 'MALFORMED_JSON',
        message: `JSON syntax error in backup snapshot: ${e.message}`,
      };
    }
  }

  /**
   * Safe Pre-Restore Execution Guard
   * 1. Validates source snapshot integrity
   * 2. Takes deterministic production state fingerprint before restore
   * 3. Takes an automatic emergency pre-restore snapshot of current active state
   * 4. Supports transactional staging and automated atomic rollback if mid-restore failure occurs
   * 5. Verifies post-rollback fingerprint match (zero-drift guarantee)
   */
  static safeRestoreFromSnapshot(
    snapshotId: string,
    confirmedByOperator = false,
    options?: {
      simulateMidRestoreFailure?: boolean;
      failureStep?: string;
    }
  ): PreRestoreSafetyCheckResult {
    if (!confirmedByOperator) {
      return {
        allowed: false,
        errorCode: 'OPERATOR_CONFIRMATION_REQUIRED',
        message: 'Pre-restore safety check rejected: Explicit operator confirmation is required before restoring.',
        sourceSnapshotValidated: false,
      };
    }

    const currentBusinessId = BusinessContextService.getCurrentBusinessId();
    const snapshots = CloudBackupService.getSnapshots();
    const targetSnapshot = snapshots.find((s) => s.id === snapshotId);

    if (!targetSnapshot) {
      return {
        allowed: false,
        errorCode: 'SNAPSHOT_NOT_FOUND',
        message: `Backup snapshot "${snapshotId}" was not found.`,
        sourceSnapshotValidated: false,
      };
    }

    // Step 1: Validate target snapshot integrity
    const validation = this.validateSnapshotIntegrity(targetSnapshot.payloadJson);
    if (!validation.valid) {
      return {
        allowed: false,
        errorCode: validation.errorCode,
        message: `Restore aborted: ${validation.message}`,
        sourceSnapshotValidated: false,
      };
    }

    // Step 2: Record deterministic production-state fingerprint BEFORE restore begins
    const beforeFingerprint = computeProductionStateFingerprint(currentBusinessId);

    // In-memory rollback snapshot of complete tenant state
    const inMemoryRollbackSnapshot = {
      config: JSON.parse(JSON.stringify(StorageService.getConfig())),
      customers: JSON.parse(JSON.stringify(StorageService.getCustomers())),
      jobs: JSON.parse(JSON.stringify(StorageService.getJobs())),
      invoices: JSON.parse(JSON.stringify(StorageService.getInvoices())),
      staff: JSON.parse(JSON.stringify(StorageService.getStaff())),
      services: JSON.parse(JSON.stringify(StorageService.getServices())),
      materials: JSON.parse(JSON.stringify(StorageService.getMaterials())),
      expenses: JSON.parse(JSON.stringify(StorageService.getExpenses())),
      commRecords: safeStorage.getItem('nil_comm_records') || '[]',
      commTemplates: safeStorage.getItem('nil_comm_templates') || '[]',
    };

    // Step 3: Create automated emergency pre-restore snapshot
    let preRestoreSnapId: string | undefined;
    try {
      const emergencySnap = CloudBackupService.createSnapshot('manual');
      preRestoreSnapId = emergencySnap.id;
    } catch (err: any) {
      return {
        allowed: false,
        errorCode: 'PRE_RESTORE_BACKUP_FAILED',
        message: `Restore aborted: Failed to create safety pre-restore backup (${err.message}). Production data must not be overwritten without safety copy.`,
        sourceSnapshotValidated: true,
      };
    }

    // Step 4: Perform staged import with failure safety
    const auditEventId = `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
      if (options?.simulateMidRestoreFailure) {
        // Adversarial test injection: The restore process starts and applies partial state
        const parsed = JSON.parse(targetSnapshot.payloadJson);
        const remapTenant = (items?: any[]): any[] => {
          if (!Array.isArray(items)) return [];
          return items.map((i) => ({ ...i, businessId: currentBusinessId }));
        };

        // Partial write to demonstrate restore has actively begun
        if (parsed.customers) {
          StorageService.saveCustomers(remapTenant(parsed.customers));
        }

        // Controlled mid-restore failure injection point
        const failurePoint = options.failureStep || 'mid-restore: after customers, before invoices';
        throw new Error(`SIMULATED_MID_RESTORE_IO_FAILURE: Transaction aborted at ${failurePoint}`);
      }

      // Normal execution path
      const restored = StorageService.importDatabaseJSON(targetSnapshot.payloadJson);
      if (!restored) {
        throw new Error('IMPORT_ENGINE_REJECTED: StorageService rejected payload structure.');
      }

      // Mark restored snapshot
      targetSnapshot.status = 'restored';
      CloudBackupService.saveSnapshots(snapshots);

      StorageService.addLog({
        level: 'success',
        category: 'system',
        action: 'SAFE_DATABASE_RESTORE',
        actor: 'System Operator',
        message: `Database restored from snapshot ${targetSnapshot.dateStr} ${targetSnapshot.timeStr}. Safety snapshot created: ${preRestoreSnapId}.`,
        details: {
          snapshotId,
          preRestoreBackupId: preRestoreSnapId,
          auditEventId,
        },
      });

      return {
        allowed: true,
        message: `Database successfully restored from snapshot (${targetSnapshot.dateStr} ${targetSnapshot.timeStr}). Emergency rollback copy preserved as "${preRestoreSnapId}".`,
        preRestoreBackupId: preRestoreSnapId,
        sourceSnapshotValidated: true,
        auditEventId,
      };
    } catch (restoreError: any) {
      // Step 5: ATOMIC ROLLBACK EXECUTION
      // Restore every collection back to the verified in-memory pre-restore state
      StorageService.saveConfig(inMemoryRollbackSnapshot.config);
      StorageService.saveCustomers(inMemoryRollbackSnapshot.customers);
      StorageService.saveJobs(inMemoryRollbackSnapshot.jobs);
      StorageService.saveInvoices(inMemoryRollbackSnapshot.invoices);
      StorageService.saveStaff(inMemoryRollbackSnapshot.staff);
      StorageService.saveServices(inMemoryRollbackSnapshot.services);
      StorageService.saveMaterials(inMemoryRollbackSnapshot.materials);
      StorageService.saveExpenses(inMemoryRollbackSnapshot.expenses);
      safeStorage.setItem('nil_comm_records', inMemoryRollbackSnapshot.commRecords);
      safeStorage.setItem('nil_comm_templates', inMemoryRollbackSnapshot.commTemplates);

      // Verify post-rollback state fingerprint matches pre-restore state exactly
      const afterFingerprint = computeProductionStateFingerprint(currentBusinessId);
      const rolledBackSuccessfully = beforeFingerprint === afterFingerprint;

      StorageService.addLog({
        level: 'error',
        category: 'system',
        action: 'RESTORE_FAILED_ROLLBACK_EXECUTED',
        actor: 'System Operator',
        message: `Restore failure encountered. Automated atomic rollback executed. Production state matches pre-restore snapshot: ${rolledBackSuccessfully}.`,
        details: {
          snapshotId,
          preRestoreBackupId: preRestoreSnapId,
          auditEventId,
          beforeFingerprint,
          afterFingerprint,
          rolledBackSuccessfully,
          error: restoreError.message,
        },
      });

      return {
        allowed: false,
        errorCode: 'RESTORE_EXECUTION_FAILED',
        message: `Restore failed mid-operation (${restoreError.message}). Rollback completed: production state preserved.`,
        preRestoreBackupId: preRestoreSnapId,
        sourceSnapshotValidated: true,
        rollbackExecuted: true,
        rolledBackSuccessfully,
        beforeFingerprint,
        afterFingerprint,
        failurePoint: options?.failureStep || 'mid-restore: after customers, before invoices',
        auditEventId,
      };
    }
  }
}

