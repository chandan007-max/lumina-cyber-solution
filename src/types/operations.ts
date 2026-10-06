/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 13 Operations & Diagnostics Types
 * Commercial Operations Center domain models, health states, structured errors,
 * hardware peripheral diagnostics, operational alerts, and sanitized support reporting.
 */

export type OperationalStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'ACTION_REQUIRED'
  | 'OFFLINE'
  | 'ERROR'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export type DiagnosticSeverity = 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type SubsystemCategory =
  | 'application'
  | 'database'
  | 'license'
  | 'connectivity'
  | 'storage'
  | 'backup'
  | 'printer'
  | 'communication';

export interface ApplicationHealth {
  status: OperationalStatus;
  appName: string;
  version: string;
  buildId: string;
  runtime: string;
  uptimeSeconds: number;
  lastRestart: string;
  memoryUsageMb: number;
}

export interface DatabaseHealth {
  status: OperationalStatus;
  type: string;
  sizeBytes: number;
  sizeFormatted: string;
  walStatus: string;
  integrityStatus: 'OK' | 'WARNING' | 'CORRUPTED' | 'UNKNOWN';
  integrityMessage: string;
  lastOperation: string;
  lastBackupStatus?: string;
  recordCounts: {
    licenses: number;
    devices: number;
    events: number;
    idempotencyKeys: number;
    securityEvents: number;
  };
}

export interface LicenseOperationalHealth {
  status: OperationalStatus;
  planId: string;
  planName: string;
  statusLabel: string;
  expiryDate?: string;
  daysRemaining: number;
  isTrial: boolean;
  isLifetime: boolean;
  deviceLimit: number;
  activeDevices: number;
  lastVerified: string;
}

export interface ConnectivityHealth {
  status: OperationalStatus;
  isOnline: boolean;
  lastOnlineTimestamp: string;
  apiConnectivity: boolean;
  communicationConnectivity: boolean;
  syncState: 'SYNCHRONIZED' | 'LOCAL_OFFLINE_BUFFER' | 'NOT_APPLICABLE';
}

export interface StorageHealth {
  status: OperationalStatus;
  availableStorageEstimate: string;
  databaseStorageBytes: number;
  databaseStorageFormatted: string;
  attachmentStorageBytes: number;
  attachmentStorageFormatted: string;
  backupStorageBytes: number;
  backupStorageFormatted: string;
  isLowStorage: boolean;
  storageWarningThresholdMb: number;
}

export interface BackupHealth {
  status: OperationalStatus;
  isConfigured: boolean;
  lastSuccessfulBackup?: string;
  lastFailedBackup?: string;
  destinationType: string;
  ageHours: number;
  isStale: boolean;
  snapshotCount: number;
  healthSummary: string;
  recommendedNextBackup: string;
}

export interface DeviceDiagnostics {
  thermalPrinter: {
    configured: boolean;
    detected: boolean;
    connectionStatus: OperationalStatus;
    mode: string;
    paperWidthMm: number;
    lastSuccessfulOperation?: string;
    lastFailureReason?: string;
  };
  usbPrinter: {
    configured: boolean;
    detected: boolean;
    connectionStatus: OperationalStatus;
  };
  bluetoothPrinter: {
    configured: boolean;
    detected: boolean;
    connectionStatus: OperationalStatus;
  };
  cashDrawer: {
    configured: boolean;
    connectionStatus: OperationalStatus;
  };
  barcodeScanner: {
    configured: boolean;
    connectionStatus: OperationalStatus;
  };
}

export interface CommunicationOperationalHealth {
  status: OperationalStatus;
  smtpConfigured: boolean;
  vaultConfigured: boolean;
  queueDepth: number;
  failedQueueCount: number;
  lastDispatchedAt?: string;
  gatewayHost?: string;
}

export interface SystemHealthOverview {
  overallStatus: OperationalStatus;
  summary: string;
  timestamp: string;
  liveness: boolean;
  readiness: boolean;
  dependencies: {
    application: OperationalStatus;
    database: OperationalStatus;
    license: OperationalStatus;
    communication: OperationalStatus;
    storage: OperationalStatus;
    backup: OperationalStatus;
    printer: OperationalStatus;
    network: OperationalStatus;
  };
}

export interface StructuredDiagnosticError {
  id: string;
  correlationId: string;
  fingerprint: string;
  timestamp: string;
  firstSeen: string;
  lastSeen: string;
  severity: DiagnosticSeverity;
  subsystem: SubsystemCategory;
  safeMessage: string;
  technicalDetails?: string;
  occurrenceCount: number;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  businessId: string;
}

export interface OperationalAlert {
  id: string;
  severity: DiagnosticSeverity;
  subsystem: SubsystemCategory;
  title: string;
  whatHappened: string;
  businessImpact: string;
  recommendedAction: string;
  timestamp: string;
  active: boolean;
}

export interface SupportReportPayload {
  reportId: string;
  correlationId: string;
  generatedAt: string;
  businessId: string;
  businessName: string;
  systemStatus: OperationalStatus;
  application: {
    name: string;
    version: string;
    buildId: string;
    runtime: string;
    uptimeSeconds: number;
    platform: string;
  };
  database: {
    type: string;
    status: OperationalStatus;
    sizeFormatted: string;
    integrityStatus: string;
    walStatus: string;
  };
  license: {
    status: string;
    planName: string;
    daysRemaining: number;
    isTrial: boolean;
    deviceLimit: number;
  };
  connectivity: {
    isOnline: boolean;
    lastOnlineTimestamp: string;
    networkState: string;
  };
  storage: {
    status: OperationalStatus;
    databaseSize: string;
    backupSize: string;
    isLowStorage: boolean;
  };
  devices: {
    thermalPrinterStatus: string;
    printerMode: string;
    paperWidthMm: number;
    usbPrinter: string;
    bluetoothPrinter: string;
    cashDrawer: string;
    barcodeScanner: string;
  };
  backup: {
    configured: boolean;
    lastBackupDate?: string;
    ageHours: number;
    snapshotCount: number;
    status: OperationalStatus;
  };
  communication: {
    smtpConfigured: boolean;
    vaultInitialized: boolean;
    queueDepth: number;
    failedQueueCount: number;
  };
  recentErrors: Array<{
    id: string;
    timestamp: string;
    severity: DiagnosticSeverity;
    subsystem: SubsystemCategory;
    safeMessage: string;
    occurrenceCount: number;
  }>;
  activeAlerts: Array<{
    id: string;
    severity: DiagnosticSeverity;
    title: string;
    recommendedAction: string;
  }>;
  securityAudit: {
    secretsDetected: boolean;
    sanitized: boolean;
    scrubTimestamp: string;
    redactionRulesApplied: number;
  };
}
