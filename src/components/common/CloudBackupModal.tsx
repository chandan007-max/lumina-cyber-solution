import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  CloudCheck,
  CloudLightning,
  RefreshCw,
  HardDriveDownload,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Database,
  Trash2,
  Lock,
  AlertTriangle,
  Server,
  Calendar,
  Layers,
  FileCode,
  Download,
} from 'lucide-react';
import {
  CloudBackupConfig,
  CloudBackupService,
  CloudBackupSnapshot,
} from '../../services/cloudBackup';
import { StorageService } from '../../services/storage';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseRestored?: () => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  onDatabaseRestored,
}) => {
  const [config, setConfig] = useState<CloudBackupConfig>(CloudBackupService.getConfig());
  const [snapshots, setSnapshots] = useState<CloudBackupSnapshot[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<CloudBackupSnapshot | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-trigger daily backup if needed
      CloudBackupService.checkAndTriggerAutoDailyBackup();
      setConfig(CloudBackupService.getConfig());
      setSnapshots(CloudBackupService.getSnapshots());
      setSuccessNotice(null);
      setErrorNotice(null);
      setSnapshotToRestore(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoBackup = (enabled: boolean) => {
    const updated = { ...config, autoDailyEnabled: enabled };
    setConfig(updated);
    CloudBackupService.saveConfig(updated);
    setSuccessNotice(
      enabled
        ? '✓ Daily Automatic Cloud Backup is now ACTIVE'
        : '⚠️ Daily Automatic Cloud Backup has been disabled'
    );
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleScheduleTimeChange = (timeStr: string) => {
    const updated = { ...config, backupScheduledTime: timeStr };
    setConfig(updated);
    CloudBackupService.saveConfig(updated);
  };

  const handleProviderChange = (provider: CloudBackupConfig['cloudProvider']) => {
    const updated = { ...config, cloudProvider: provider };
    setConfig(updated);
    CloudBackupService.saveConfig(updated);
    setSuccessNotice(`Cloud Provider set to ${provider}`);
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  const handleRunBackupNow = () => {
    setIsSyncing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    setTimeout(() => {
      try {
        const snap = CloudBackupService.createSnapshot('manual');
        setSnapshots(CloudBackupService.getSnapshots());
        setConfig(CloudBackupService.getConfig());
        setIsSyncing(false);
        setSuccessNotice(
          `✓ Cloud Backup completed & vault synced successfully (${snap.sizeFormatted})!`
        );
        setTimeout(() => setSuccessNotice(null), 4000);
      } catch (err) {
        setIsSyncing(false);
        setErrorNotice('Failed to create cloud backup snapshot.');
      }
    }, 600);
  };

  const handleDownloadSnapshot = (snap: CloudBackupSnapshot) => {
    try {
      const blob = new Blob([snap.payloadJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NiL_Cloud_Backup_${snap.dateStr}_${snap.type}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download backup JSON file.');
    }
  };

  const handleConfirmRestore = () => {
    if (!snapshotToRestore) return;

    const success = CloudBackupService.restoreFromSnapshot(snapshotToRestore.id);
    if (success) {
      setSuccessNotice(`✓ Database restored successfully from snapshot dated ${snapshotToRestore.dateStr}!`);
      setSnapshotToRestore(null);
      if (onDatabaseRestored) {
        onDatabaseRestored();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setErrorNotice('Failed to restore database from selected snapshot.');
      setSnapshotToRestore(null);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    if (confirm('Delete this cloud backup snapshot permanently?')) {
      CloudBackupService.deleteSnapshot(id);
      setSnapshots(CloudBackupService.getSnapshots());
    }
  };

  const handleImportExternalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageService.importDatabaseJSON(content);
        if (success) {
          // Record as manual cloud snapshot as well
          CloudBackupService.createSnapshot('manual');
          setSnapshots(CloudBackupService.getSnapshots());
          setSuccessNotice('✓ External database backup imported and synced successfully!');
          if (onDatabaseRestored) onDatabaseRestored();
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setErrorNotice('Invalid backup file format. Import failed.');
        }
      }
    };
    reader.readAsText(file);
  };

  const latestSnapshot = snapshots[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/80 dark:bg-emerald-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs">
              <CloudCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Automatic Cloud Backup & Vault</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Cloud Vault Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated daily cloud snapshots of shop ledger, customer balances, jobs & inventory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Notifications */}
          {notice && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {errorNotice && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 rounded-lg text-xs font-bold border border-rose-300 dark:border-rose-800 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Top Status & Instant Run Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Auto Backup Configuration & Provider (7 cols) */}
            <div className="md:col-span-7 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Automatic Daily Cloud Sync</span>
                </div>
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoDailyEnabled}
                    onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                When active, the system automatically creates an encrypted daily cloud backup snapshot every day without requiring staff intervention.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Daily Backup Schedule
                  </label>
                  <select
                    value={config.backupScheduledTime}
                    onChange={(e) => handleScheduleTimeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="20:00">08:00 PM (End of Shift)</option>
                    <option value="12:00">12:00 PM (Mid-day)</option>
                    <option value="00:00">12:00 AM (Midnight)</option>
                    <option value="startup">On App Startup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Cloud Storage Provider
                  </label>
                  <select
                    value={config.cloudProvider}
                    onChange={(e) =>
                      handleProviderChange(e.target.value as CloudBackupConfig['cloudProvider'])
                    }
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="NiL Primary Cloud Vault">NiL Primary Cloud Vault</option>
                    <option value="Google Drive Sync">Google Drive Sync</option>
                    <option value="Encrypted Local Cloud Vault">Encrypted Local Cloud Vault</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right: Instant Trigger & Last Sync Info (5 cols) */}
            <div className="md:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Last Cloud Backup
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                    Synced
                  </span>
                </div>
                {latestSnapshot ? (
                  <div className="text-xs text-slate-200 space-y-0.5">
                    <div className="text-sm font-extrabold text-white font-mono">
                      {latestSnapshot.dateStr} at {latestSnapshot.timeStr}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Size: <span className="text-emerald-300 font-bold">{latestSnapshot.sizeFormatted}</span> · Type:{' '}
                      <span className="capitalize">{latestSnapshot.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No cloud backups recorded yet.</div>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunBackupNow}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Syncing Database to Cloud Vault...</span>
                  </>
                ) : (
                  <>
                    <CloudLightning className="w-4 h-4 text-emerald-200" />
                    <span>Run Cloud Backup Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cloud Snapshot History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Cloud Backup Vault History ({snapshots.length} Snapshots)</span>
              </h4>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportExternalFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload & Sync External Backup (.json)</span>
                </button>
              </div>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
                No cloud backup snapshots stored yet. Click "Run Cloud Backup Now" above.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Record Ledger Counts</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {snapshots.map((snap, idx) => (
                        <tr
                          key={snap.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium">
                            <div className="font-bold text-slate-900 dark:text-white font-mono">
                              {snap.dateStr}
                            </div>
                            <div className="text-[10px] text-slate-400">{snap.timeStr}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                snap.type === 'auto_daily'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
                              }`}
                            >
                              {snap.type === 'auto_daily' ? '⚡ Auto Daily' : '✋ Manual'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {snap.sizeFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                            {snap.recordCounts.jobs} Jobs · {snap.recordCounts.invoices} Invoices ·{' '}
                            {snap.recordCounts.customers} Customers
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Synced
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSnapshotToRestore(snap)}
                                className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                title="Restore database to this snapshot point"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadSnapshot(snap)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Download .json file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSnapshot(snap.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Delete snapshot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Confirmation Popup Modal if Restore clicked */}
        {snapshotToRestore && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/90 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-950 dark:text-amber-100 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold">Confirm Database Restore: </span>
                <span>
                  Replace current database state with cloud snapshot from{' '}
                  <strong className="font-mono">{snapshotToRestore.dateStr} {snapshotToRestore.timeStr}</strong>?
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs cursor-pointer"
              >
                Yes, Restore Database Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
