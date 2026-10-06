import React, { useState, useMemo } from 'react';
import {
  X,
  Bug,
  Terminal,
  Copy,
  Check,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Clock,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { DebugLog, LogLevel, StaffUser } from '../../types';
import { StorageService } from '../../services/storage';

interface DebugLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaff: StaffUser;
}

export const DebugLogsModal: React.FC<DebugLogsModalProps> = ({
  isOpen,
  onClose,
  currentStaff,
}) => {
  const [logs, setLogs] = useState<DebugLog[]>(() => StorageService.getLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [limitCount, setLimitCount] = useState<number>(8); // Default to viewing 8 logs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Sync logs when opening
  React.useEffect(() => {
    if (isOpen) {
      setLogs(StorageService.getLogs());
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCat = selectedCategory === 'all' || log.category === selectedCategory;
      const matchLvl = selectedLevel === 'all' || log.level === selectedLevel;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        log.message.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(q));

      return matchCat && matchLvl && matchQ;
    });
  }, [logs, selectedCategory, selectedLevel, searchQuery]);

  // Limit to 8 logs or selected limit
  const displayedLogs = useMemo(() => {
    if (limitCount === 0) return filteredLogs;
    return filteredLogs.slice(0, limitCount);
  }, [filteredLogs, limitCount]);

  if (!isOpen) return null;

  const handleCopySingle = (log: DebugLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(displayedLogs, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(displayedLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nil-pos-debug-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearLogs = () => {
    if (window.confirm('Clear all diagnostic logs from LocalStorage?')) {
      StorageService.clearLogs();
      setLogs([]);
    }
  };

  const handleResetDefaults = () => {
    StorageService.resetLogsToDefault();
    setLogs(StorageService.getLogs());
    setLimitCount(8);
  };

  const handleInjectTestLog = () => {
    const sampleActions = [
      {
        level: 'info' as LogLevel,
        category: 'job' as const,
        action: 'RUNTIME_PROBE_PING',
        message: `Diagnostic runtime probe ping executed by ${currentStaff.name}. System latency: 4ms.`,
        details: { probeTime: new Date().toISOString(), memoryUsage: 'Normal', staff: currentStaff.name },
      },
      {
        level: 'success' as LogLevel,
        category: 'payment' as const,
        action: 'UPI_VERIFY_SUCCESS',
        message: 'Instant UPI Webhook simulation received: Transaction settled for ₹500.',
        details: { upiRef: `UPI-${Date.now()}`, vpa: 'customer@okaxis', amount: 500, verified: true },
      },
      {
        level: 'warn' as LogLevel,
        category: 'inventory' as const,
        action: 'BUFFER_CHECK_NOTICE',
        message: 'Daily consumable paper stock audit performed. 4 items at reorder threshold.',
        details: { auditBy: currentStaff.name, itemsFlagged: 4 },
      },
    ];

    const pick = sampleActions[Math.floor(Math.random() * sampleActions.length)];
    const created = StorageService.addLog({
      ...pick,
      actor: currentStaff.name,
    });
    setLogs(StorageService.getLogs());
    setExpandedLogId(created.id);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            SUCCESS
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            WARN
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            ERROR
          </span>
        );
      case 'debug':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Terminal className="w-3 h-3 text-cyan-400" />
            DEBUG
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Info className="w-3 h-3 text-sky-400" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Terminal Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800 shadow-2xs">
              <Bug className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>System Debug Console</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    8 Logs View
                  </span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Stream
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational audit log • Event tracking for jobs, dues, payments & print engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={handleInjectTestLog}
              title="Add a sample diagnostic event"
              className="px-3 py-1.5 text-xs font-bold text-indigo-200 bg-indigo-900/60 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Inject Test Log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Command Toolbar */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by action, message, ID, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'job', 'payment', 'invoice', 'inventory', 'customer', 'system'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {/* Limit Toggle Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-0.5 rounded-lg text-xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Show:</span>
            <button
              type="button"
              onClick={() => setLimitCount(8)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                limitCount === 8
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8 Logs
            </button>
            <button
              type="button"
              onClick={() => setLimitCount(0)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                limitCount === 0
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({filteredLogs.length})
            </button>
          </div>

          {/* Actions: Copy All & Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors text-xs font-semibold"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedAll ? 'Copied 8 Logs!' : 'Copy Logs'}</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
            <button
              onClick={handleResetDefaults}
              title="Reset default 8 logs"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Logs Stream List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-950 font-mono text-xs">
          {displayedLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold">No diagnostic logs found matching your filters.</p>
              <button
                onClick={handleResetDefaults}
                className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer"
              >
                Reset to Default 8 Logs
              </button>
            </div>
          ) : (
            displayedLogs.map((log, index) => {
              const isExpanded = expandedLogId === log.id;
              const isCopied = copiedId === log.id;

              return (
                <div
                  key={log.id || index}
                  className={`rounded-xl border transition-all ${
                    isExpanded
                      ? 'border-indigo-500/60 bg-slate-900/90 shadow-md'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  {/* Log Card Summary Bar */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                      {/* Numbering badge */}
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      {/* Level badge */}
                      {getLevelBadge(log.level)}

                      {/* Action Tag */}
                      <span className="text-[11px] font-bold text-indigo-300 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40 shrink-0">
                        [{log.action}]
                      </span>

                      {/* Message */}
                      <span className="text-slate-200 text-xs font-sans font-medium truncate max-w-md">
                        {log.message}
                      </span>
                    </div>

                    {/* Metadata & Controls */}
                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-sans">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {log.actor}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySingle(log);
                        }}
                        title="Copy log entry JSON"
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="text-slate-500">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/60 rounded-b-xl">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-300">Payload Details</span>
                          <span className="text-[10px] text-slate-500">
                            Log ID: <span className="font-mono text-slate-400">{log.id}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.timestamp}
                        </span>
                      </div>

                      <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto">
                        {JSON.stringify(
                          {
                            id: log.id,
                            timestamp: log.timestamp,
                            level: log.level,
                            category: log.category,
                            action: log.action,
                            actor: log.actor,
                            message: log.message,
                            details: log.details || {},
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Status Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Diagnostic System Ready</span>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Showing <strong className="text-indigo-300">{displayedLogs.length}</strong> of{' '}
              <strong className="text-slate-200">{logs.length}</strong> records
            </span>
            <span className="text-slate-600">·</span>
            <span>Operator: <strong className="text-slate-200">{currentStaff.name}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
              ESC to close
            </kbd>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
            >
              Close Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
