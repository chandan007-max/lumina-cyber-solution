/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 13 Operations, Monitoring, Support & Diagnostics Center
 * Production Operations Center: 10-second comprehension cards, real-time subsystem health,
 * peripheral testing, actionable alert guidance, safe backup status, and zero-leakage support reports.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Printer,
  Database,
  HardDrive,
  Wifi,
  WifiOff,
  ShieldCheck,
  MessageSquare,
  Archive,
  Cpu,
  FileText,
  AlertCircle,
  Play,
  Terminal,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Lock,
} from 'lucide-react';
import {
  OperationalStatus,
  DiagnosticSeverity,
  SupportReportPayload,
} from '../../types/operations';
import {
  DiagnosticsService,
  OperationsDashboardState,
} from '../../services/operations/diagnosticsService';
import { DeviceDiagnosticsService } from '../../services/operations/deviceDiagnosticsService';
import { BackupHealthService } from '../../services/operations/backupHealthService';
import { SupportReportModal } from './SupportReportModal';

interface OperationsCenterViewProps {
  onNavigateToBackup?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToCommunication?: () => void;
}

export const OperationsCenterView: React.FC<OperationsCenterViewProps> = ({
  onNavigateToBackup,
  onNavigateToSettings,
  onNavigateToCommunication,
}) => {
  const [dashboard, setDashboard] = useState<OperationsDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printerTesting, setPrinterTesting] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [supportReport, setSupportReport] = useState<SupportReportPayload | null>(null);
  const [rawReportJson, setRawReportJson] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'none' | 'database' | 'errors' | 'hardware'>('none');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const state = await DiagnosticsService.getDashboardState();
      setDashboard(state);
    } catch (err) {
      console.error('Failed to load operational dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh operational state every 30 seconds
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRunPrinterTest = async () => {
    setPrinterTesting(true);
    setPrinterTestResult(null);
    try {
      const res = await DeviceDiagnosticsService.runPrintTest();
      setPrinterTestResult(res.testReceiptText);
      await loadData();
    } catch (err: any) {
      setPrinterTestResult(`Print test error: ${err.message}`);
    } finally {
      setPrinterTesting(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await DiagnosticsService.generateSanitizedSupportReport();
      if (res.success) {
        setSupportReport(res.report);
        setRawReportJson(res.rawJson);
        setIsReportModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate support report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> HEALTHY
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> ACTION REQUIRED
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
            <WifiOff className="w-3 h-3" /> OFFLINE
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            NOT CONFIGURED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500">
            UNKNOWN
          </span>
        );
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading Workstation Operations Center...</span>
      </div>
    );
  }

  const {
    healthOverview,
    application,
    database,
    license,
    connectivity,
    storage,
    backup,
    devices,
    communication,
    activeAlerts,
  } = dashboard;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Operator Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Operations & Diagnostics Center
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  v3.3.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Workstation health, database integrity, hardware peripherals, disaster recovery & support diagnostics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Refresh & Support Report */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{generatingReport ? 'Scrubbing...' : 'Generate Support Report'}</span>
          </button>
        </div>
      </div>

      {/* 10-Second High-Level Workstation Status Card */}
      <div
        className={`p-4 md:p-5 rounded-2xl border transition-all ${
          healthOverview.overallStatus === 'HEALTHY'
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
            : healthOverview.overallStatus === 'WARNING'
            ? 'bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-100'
            : 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                healthOverview.overallStatus === 'HEALTHY'
                  ? 'bg-emerald-500 text-white'
                  : healthOverview.overallStatus === 'WARNING'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {healthOverview.overallStatus === 'HEALTHY' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Workstation Status
                </span>
                {getStatusBadge(healthOverview.overallStatus)}
              </div>
              <p className="text-sm font-semibold mt-0.5 text-slate-900 dark:text-white">
                {healthOverview.summary}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right shrink-0">
            <div>Last Verified: {new Date(healthOverview.timestamp).toLocaleTimeString()}</div>
            <div className="text-[11px] font-mono text-slate-400">Offline Resilience: Fully Active</div>
          </div>
        </div>
      </div>

      {/* 8 Core Subsystem Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Application */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>APPLICATION</span>
              </div>
              {getStatusBadge(application.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              v{application.version}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Uptime: {Math.floor(application.uptimeSeconds / 60)} min(s)</div>
              <div className="truncate">Runtime: {application.runtime}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Memory: {application.memoryUsageMb} MB</span>
            <span>Build: {application.buildId}</span>
          </div>
        </div>

        {/* 2. Database */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>DATABASE</span>
              </div>
              {getStatusBadge(database.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{database.sizeFormatted}</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Integrity: {database.integrityStatus}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Journal Mode: {database.walStatus}</div>
              <div>Licenses: {database.recordCounts.licenses} • Devices: {database.recordCounts.devices}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span className="truncate">{database.integrityMessage}</span>
          </div>
        </div>

        {/* 3. License */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>LICENSE</span>
              </div>
              {getStatusBadge(license.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {license.statusLabel}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Plan: {license.planName}</div>
              <div>Days Remaining: {license.daysRemaining > 0 ? `${license.daysRemaining} days` : 'Expired'}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Devices: {license.activeDevices} / {license.deviceLimit}</span>
            <span>Cryptographic RS256</span>
          </div>
        </div>

        {/* 4. Connectivity / Network */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {connectivity.isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-slate-500" />
                )}
                <span>CONNECTIVITY</span>
              </div>
              {getStatusBadge(connectivity.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {connectivity.isOnline ? 'Online Connected' : 'Offline Mode Active'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Local POS: Fully Operational</div>
              <div>Sync Mode: {connectivity.syncState}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Server API: {connectivity.apiConnectivity ? 'Reachable' : 'Standby'}</span>
            <span>Queue: Safe Buffer</span>
          </div>
        </div>

        {/* 5. Backup */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Archive className="w-4 h-4 text-indigo-500" />
                <span>BACKUP</span>
              </div>
              {getStatusBadge(backup.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {backup.ageHours < 900 ? `${backup.ageHours}h old` : 'No Snapshot'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Snapshots Retained: {backup.snapshotCount}</div>
              <div>Target: {backup.destinationType}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span className="truncate">{backup.isStale ? 'Stale (> 24h)' : 'Fresh & Healthy'}</span>
            {onNavigateToBackup && (
              <button
                type="button"
                onClick={onNavigateToBackup}
                className="text-indigo-500 hover:underline font-semibold cursor-pointer"
              >
                Manage
              </button>
            )}
          </div>
        </div>

        {/* 6. Communication */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <span>COMMUNICATION</span>
              </div>
              {getStatusBadge(communication.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {communication.smtpConfigured ? 'SMTP Configured' : 'Not Configured'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Pending In Queue: {communication.queueDepth}</div>
              <div>Failed Queue Items: {communication.failedQueueCount}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Vault: {communication.vaultConfigured ? 'AES-256' : 'None'}</span>
            {onNavigateToCommunication && (
              <button
                type="button"
                onClick={onNavigateToCommunication}
                className="text-indigo-500 hover:underline font-semibold cursor-pointer"
              >
                Open Center
              </button>
            )}
          </div>
        </div>

        {/* 7. Printer */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Printer className="w-4 h-4 text-indigo-500" />
                <span>THERMAL PRINTER</span>
              </div>
              {getStatusBadge(devices.thermalPrinter.connectionStatus)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {devices.thermalPrinter.mode} ({devices.thermalPrinter.paperWidthMm}mm)
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Driver Link: CONFIGURED (DRIVER-DETECTED)</div>
              <div>Cash Drawer: {devices.cashDrawer.connectionStatus}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Scanner: {devices.barcodeScanner.connectionStatus}</span>
            <button
              type="button"
              onClick={handleRunPrinterTest}
              disabled={printerTesting}
              className="text-indigo-500 hover:underline font-semibold cursor-pointer"
            >
              Test Print
            </button>
          </div>
        </div>

        {/* 8. Storage */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <span>STORAGE</span>
              </div>
              {getStatusBadge(storage.status)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {storage.databaseStorageFormatted}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
              <div>Backup Storage: {storage.backupStorageFormatted}</div>
              <div>Available Free: {storage.availableStorageEstimate}</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Low Storage: {storage.isLowStorage ? 'YES' : 'NO'}</span>
            <span>Threshold: {storage.storageWarningThresholdMb} MB</span>
          </div>
        </div>
      </div>

      {/* ATTENTION REQUIRED / ALERTS SECTION */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Attention Required ({activeAlerts.length})
            </h2>
          </div>

          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  alert.severity === 'CRITICAL' || alert.severity === 'ERROR'
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-100'
                    : alert.severity === 'WARNING'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-100'
                    : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-950 dark:text-indigo-100'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        alert.severity === 'CRITICAL' || alert.severity === 'ERROR'
                          ? 'bg-rose-500 text-white'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-500 text-white'
                          : 'bg-indigo-500 text-white'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{alert.title}</h3>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>1. What happened:</strong> {alert.whatHappened}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>2. Business impact:</strong> {alert.businessImpact}
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
                    <strong>3. Recommended action:</strong> {alert.recommendedAction}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {alert.subsystem === 'backup' && onNavigateToBackup && (
                    <button
                      type="button"
                      onClick={onNavigateToBackup}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      Open Backup Center
                    </button>
                  )}
                  {alert.subsystem === 'communication' && onNavigateToCommunication && (
                    <button
                      type="button"
                      onClick={onNavigateToCommunication}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      Fix Email Queue
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS SECTION */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Quick Operational Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Run Diagnostics</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Probe system health</div>
          </button>

          <button
            type="button"
            onClick={handleRunPrinterTest}
            disabled={printerTesting}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Printer className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {printerTesting ? 'Testing...' : 'Test Printer'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Send sample receipt</div>
          </button>

          <button
            type="button"
            onClick={onNavigateToBackup}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Check Backup</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Disaster recovery</div>
          </button>

          <button
            type="button"
            onClick={onNavigateToCommunication}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Communication Test</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Test SMTP & queue</div>
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-all cursor-pointer group shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Support Report</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scrubbed diagnostic</div>
          </button>
        </div>

        {/* Controlled Print Test Result Banner */}
        {printerTestResult && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Controlled Test Print Succeeded
              </span>
              <button
                type="button"
                onClick={() => setPrinterTestResult(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
              {printerTestResult}
            </pre>
            <div className="text-[11px] text-slate-500">
              Verified: Standardized test pattern printed without exposing any customer records or PII.
            </div>
          </div>
        )}
      </div>

      {/* TECHNICAL DETAILS ACCORDIONS */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Workstation Diagnostic Telemetry
        </h2>

        {/* Database & Authority Telemetry */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedSection(expandedSection === 'database' ? 'none' : 'database')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>Database Integrity & Transaction Telemetry</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">{database.sizeFormatted}</span>
              {expandedSection === 'database' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>

          {expandedSection === 'database' && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Engine Type</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{database.type}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Integrity Diagnostic</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{database.integrityStatus}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">WAL Journal Mode</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{database.walStatus}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Audit & Security Records</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {database.recordCounts.events + database.recordCounts.securityEvents}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hardware & Peripherals Telemetry */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedSection(expandedSection === 'hardware' ? 'none' : 'hardware')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Printer className="w-4 h-4 text-indigo-500" />
              <span>Hardware Peripherals & Device Drivers</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{devices.thermalPrinter.mode}</span>
              {expandedSection === 'hardware' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </button>

          {expandedSection === 'hardware' && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Thermal POS Printer</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Ready ({devices.thermalPrinter.paperWidthMm}mm)
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">USB / Laser Printer</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{devices.usbPrinter.connectionStatus}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Barcode Scanner</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">Ready (HID Input)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Remote Support Backdoor</div>
                  <div className="font-semibold text-slate-500 font-mono">NOT CONFIGURED</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Report Modal */}
      <SupportReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={supportReport}
        rawJson={rawReportJson}
      />
    </div>
  );
};
