import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Settings as SettingsIcon,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileCode,
  Lock,
  Eye,
  EyeOff,
  Radio,
  Check,
  X,
  FileText,
  Users,
  Briefcase,
  Receipt,
  HelpCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  ArrowRight,
} from 'lucide-react';
import {
  CommunicationRecord,
  CommunicationTemplate,
  CommunicationChannel,
  CommunicationStatus,
  CommunicationMessageType,
  Customer,
  JobItem,
  Invoice,
  BusinessConfig,
} from '../../types';
import { CommunicationService } from '../../services/communication/communicationService';
import { CommunicationRepository } from '../../repositories/communicationRepository';
import { TemplateRepository } from '../../repositories/templateRepository';
import { CredentialService } from '../../services/communication/credentialService';
import { StorageService } from '../../services/storage';
import { BusinessConfigService } from '../../services/businessConfig';
import { MessagePreviewModal } from './MessagePreviewModal';
import { TemplateEditorModal } from './TemplateEditorModal';
import { SMTPEmailProvider } from '../../services/communication/emailService';

interface CommunicationCenterViewProps {
  customers: Customer[];
  jobs: JobItem[];
  invoices: Invoice[];
  onRefreshData?: () => void;
}

type CommTab =
  | 'overview'
  | 'whatsapp'
  | 'email'
  | 'history'
  | 'templates'
  | 'queue'
  | 'settings';

export const CommunicationCenterView: React.FC<CommunicationCenterViewProps> = ({
  customers,
  jobs,
  invoices,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<CommTab>('overview');
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [queueItems, setQueueItems] = useState<CommunicationRecord[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<CommunicationRecord | null>(null);

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<CommunicationChannel>('WHATSAPP');
  const [composeCustomer, setComposeCustomer] = useState<Customer | undefined>(undefined);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CommunicationTemplate | null>(null);

  // Settings State
  const [config, setConfig] = useState<BusinessConfig>(() => StorageService.getConfig());
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | CommunicationChannel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CommunicationStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CommunicationMessageType>('ALL');
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 15;

  const businessId = config.profile.businessId || 'default-business';

  // Load records & templates from repositories
  const loadData = () => {
    const allRecords = CommunicationRepository.getAll(businessId);
    setRecords(allRecords);
    setQueueItems(allRecords.filter((r) => ['QUEUED', 'PROCESSING', 'RETRY_PENDING', 'WAITING_FOR_OPERATOR'].includes(r.status)));
    setTemplates(TemplateRepository.getAll(businessId));
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  // Check saved credentials for SMTP
  useEffect(() => {
    const cred = CredentialService.getCredentials(businessId);
    if (cred?.smtpPasswordEnc) {
      setSmtpPassword(cred.smtpPasswordEnc);
    }
  }, [businessId]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    return CommunicationService.getDashboardMetrics(businessId);
  }, [businessId, records]);

  // Process Queue Action
  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      await CommunicationService.processQueue(businessId);
      loadData();
    } catch (e) {
      console.error('Queue processing error:', e);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  // Retry single message
  const handleRetryRecord = async (recordId: string) => {
    try {
      await CommunicationService.retry(recordId, businessId);
      loadData();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  // Cancel queued message
  const handleCancelRecord = (recordId: string) => {
    CommunicationRepository.updateStatus(recordId, 'CANCELLED', businessId, {
      errorMessage: 'Cancelled manually by operator',
    });
    loadData();
  };

  const updateWhatsappConfig = (updates: any) => {
    setConfig((prev) => {
      const normalized = BusinessConfigService.normalizeConfig(prev);
      const existing = normalized.communication?.whatsapp || {
        enabled: true,
        defaultCountryCode: '+91',
        mode: 'WEB_MANUAL',
      };
      return {
        ...prev,
        communication: {
          whatsapp: { ...existing, ...updates },
          email: normalized.communication?.email || {
            enabled: true,
            senderName: prev.businessName || '',
            senderEmail: '',
            smtpHost: '',
            smtpPort: 587,
            security: 'STARTTLS',
            username: '',
            hasPassword: false,
          },
          preferences: normalized.communication?.preferences || {
            transactionalEnabled: true,
            marketingEnabled: false,
            whatsappConsentRequired: false,
            emailConsentRequired: false,
            defaultChannel: 'WHATSAPP',
            maxQueueRetries: 3,
          },
        },
      };
    });
  };

  const updateEmailConfig = (updates: any) => {
    setConfig((prev) => {
      const normalized = BusinessConfigService.normalizeConfig(prev);
      const existing = normalized.communication?.email || {
        enabled: true,
        senderName: prev.businessName || '',
        senderEmail: '',
        smtpHost: '',
        smtpPort: 587,
        security: 'STARTTLS',
        username: '',
        hasPassword: false,
      };
      return {
        ...prev,
        communication: {
          whatsapp: normalized.communication?.whatsapp || {
            enabled: true,
            defaultCountryCode: '+91',
            mode: 'WEB_MANUAL',
          },
          email: { ...existing, ...updates },
          preferences: normalized.communication?.preferences || {
            transactionalEnabled: true,
            marketingEnabled: false,
            whatsappConsentRequired: false,
            emailConsentRequired: false,
            defaultChannel: 'WHATSAPP',
            maxQueueRetries: 3,
          },
        },
      };
    });
  };

  // Save Settings Form
  const handleSaveSettings = () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      // 1. Save SMTP password in CredentialService vault (isolated from BusinessConfig)
      if (smtpPassword) {
        CredentialService.saveCredentials(businessId, {
          smtpPasswordEnc: smtpPassword,
        });
      }

      // 2. Save BusinessConfig (with hasPassword flag only, no plaintext password)
      const updatedConfig = { ...config };
      if (updatedConfig.communication?.email) {
        updatedConfig.communication.email.hasPassword = !!smtpPassword;
      }
      BusinessConfigService.saveConfig(updatedConfig);
      setConfig(updatedConfig);
      setSettingsSuccess('Communication settings and security credentials saved successfully.');
      setTimeout(() => setSettingsSuccess(null), 3500);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save communication settings.');
    }
  };

  // Test SMTP Connection
  const handleTestSmtp = async () => {
    setTestFeedback(null);
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setTestFeedback({
        type: 'error',
        message: 'Please provide a valid recipient email for the test connection.',
      });
      return;
    }

    setIsTestingSmtp(true);
    try {
      const emailConfig = config.communication?.email;
      if (!emailConfig) throw new Error('Email settings not found');

      const provider = new SMTPEmailProvider();
      const res = await provider.testConnection(emailConfig, smtpPassword);
      if (res.success) {
        setTestFeedback({
          type: 'success',
          message: 'SMTP handshake and test email verified successfully!',
        });
      } else {
        setTestFeedback({
          type: 'error',
          message: res.message || 'SMTP Connection test failed. Check host, port, and credentials.',
        });
      }
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        message: err.message || 'Failed to verify SMTP server.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Reset default templates
  const handleResetTemplates = () => {
    if (window.confirm('Reset all templates to factory defaults for cyber café / print shop? Existing custom templates will be overwritten.')) {
      TemplateRepository.seedDefaults(businessId);
      loadData();
    }
  };

  // Filtered History
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (channelFilter !== 'ALL' && r.channel !== channelFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.messageType !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.recipientName?.toLowerCase().includes(q);
        const matchRecip = r.recipient.toLowerCase().includes(q);
        const matchContent = r.fullMessage?.toLowerCase().includes(q) || r.messagePreview?.toLowerCase().includes(q);
        const matchSubj = r.subject?.toLowerCase().includes(q);
        if (!matchName && !matchRecip && !matchContent && !matchSubj) return false;
      }
      return true;
    });
  }, [records, channelFilter, statusFilter, typeFilter, searchQuery]);

  const paginatedRecords = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, historyPage]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Connectivity status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Communication Center
              </h1>
              {/* Online/Offline Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isOnline
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isOnline ? 'Online' : 'Offline Mode (Queue Active)'}
              </span>
              {queueItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {queueItems.length} Waiting in Queue
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer notifications, WhatsApp Web handoffs, Email invoices, and automated shop alerts.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setComposeChannel('WHATSAPP');
              setComposeCustomer(undefined);
              setIsComposeOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send WhatsApp</span>
          </button>

          <button
            onClick={() => {
              setComposeChannel('EMAIL');
              setComposeCustomer(undefined);
              setIsComposeOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Send Email</span>
          </button>

          <button
            onClick={handleProcessQueue}
            disabled={isProcessingQueue}
            title="Process pending offline email queue"
            className="p-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessingQueue ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 select-none">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'history', label: 'Communication History', icon: Clock, count: records.length },
          { id: 'templates', label: 'Templates', icon: FileCode, count: templates.length },
          { id: 'queue', label: 'Queue & Failed', icon: AlertTriangle, count: queueItems.length },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CommTab)}
              className={`px-3.5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tab.id === 'queue'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <span>Today's Total</span>
                  <Send className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                  {metrics.todayTotal}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  All channels combined
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  <span>WhatsApp Handoffs</span>
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1 tabular-nums">
                  {metrics.todayWhatsApp}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Operator web chats initiated
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                  <span>Emails Sent</span>
                  <Mail className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-extrabold text-indigo-800 dark:text-indigo-300 mt-1 tabular-nums">
                  {metrics.todayEmail}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Delivered or queued
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                  <span>Pending Queue</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 mt-1 tabular-nums">
                  {metrics.pendingCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {metrics.failedCount > 0 ? `${metrics.failedCount} failed needs retry` : 'All cleared'}
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => {
                  setComposeChannel('WHATSAPP');
                  setIsComposeOpen(true);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 shadow-xs transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  WhatsApp Customer Contact
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pick a customer, format with ready-made shop templates, and launch WhatsApp Web with +91 normalization.
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 gap-1">
                  <span>Compose WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => {
                  setComposeChannel('EMAIL');
                  setIsComposeOpen(true);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 shadow-xs transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-fit mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Send Invoice / Receipt Email
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Dispatch formal invoices or payment receipts via SMTP with offline queueing support.
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1">
                  <span>Compose Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab('templates')}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 shadow-xs transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-fit mb-3">
                  <FileCode className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Custom Message Templates
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage predefined cyber cafe & print shop messages for jobs ready, balance dues, and billing.
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 gap-1">
                  <span>Manage Templates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Needs Attention Panel (if failed or retry items exist) */}
            {metrics.failedCount > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Attention: {metrics.failedCount} Failed or Retrying Message(s)</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('queue')}
                    className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline"
                  >
                    View in Queue Center →
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Recent Communication Activity
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All History →
                </button>
              </div>

              {records.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No communication records recorded yet. Start by sending a WhatsApp message or Email.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {records.slice(0, 6).map((rec) => (
                    <div
                      key={rec.id}
                      className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            rec.channel === 'WHATSAPP'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {rec.channel === 'WHATSAPP' ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span>{rec.recipientName || 'Customer'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {rec.messageType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {rec.recipient} · {new Date(rec.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ['SENT', 'HANDOFF', 'SENT_BY_OPERATOR'].includes(rec.status)
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : rec.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                        <button
                          onClick={() => setSelectedRecordForDetail(rec)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: WHATSAPP */}
        {/* ========================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* WhatsApp Web Mode Disclosure Card */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  WhatsApp Web Operator Handoff Active
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                  LUMINA CYBER SOLUTION integrates directly with WhatsApp Web without requiring costly enterprise API contracts. Phone numbers are automatically verified and normalized to canonical Indian format (<code>+91</code>). Clicking send launches your web session with pre-filled content, recording a verified operator handoff.
                </p>
              </div>
            </div>

            {/* Quick Customer Selection to WhatsApp */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Quick WhatsApp to Customer
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Customer Account
                  </label>
                  <select
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === e.target.value);
                      if (cust) {
                        setComposeCustomer(cust);
                        setComposeChannel('WHATSAPP');
                        setIsComposeOpen(true);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose a customer to message...
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) {c.totalDueAmount > 0 ? `· Due: ₹${c.totalDueAmount}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setComposeCustomer(undefined);
                      setComposeChannel('WHATSAPP');
                      setIsComposeOpen(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Compose to Any Mobile Number</span>
                  </button>
                </div>
              </div>
            </div>

            {/* WhatsApp Filtered History */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  WhatsApp Handoff Log
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.filter((r) => r.channel === 'WHATSAPP').length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No WhatsApp messages sent yet.
                  </div>
                ) : (
                  records
                    .filter((r) => r.channel === 'WHATSAPP')
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span>{rec.recipientName}</span>
                            <span className="font-mono text-slate-500">{rec.recipient}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                              {rec.messageType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                            {rec.messagePreview || rec.fullMessage}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EMAIL */}
        {/* ========================================================= */}
        {activeTab === 'email' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Email Provider Status */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    SMTP Email Engine: {config.communication?.email?.enabled ? 'Active' : 'Disabled'}
                  </h4>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                    Sender: <strong>{config.communication?.email?.senderName || config.profile.businessName || config.businessName}</strong> ({config.communication?.email?.senderEmail || 'Not configured'}) · Host: {config.communication?.email?.smtpHost || 'None'}:{config.communication?.email?.smtpPort || 587}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50"
              >
                Configure SMTP →
              </button>
            </div>

            {/* Quick Email Customer */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Quick Email Dispatch
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Customer Account
                  </label>
                  <select
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === e.target.value);
                      if (cust) {
                        setComposeCustomer(cust);
                        setComposeChannel('EMAIL');
                        setIsComposeOpen(true);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose a customer with email...
                    </option>
                    {customers
                      .filter((c) => !!c.email)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setComposeCustomer(undefined);
                      setComposeChannel('EMAIL');
                      setIsComposeOpen(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Compose Email to Any Address</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Email History */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email Dispatch History
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.filter((r) => r.channel === 'EMAIL').length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No emails dispatched yet.
                  </div>
                ) : (
                  records
                    .filter((r) => r.channel === 'EMAIL')
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span>{rec.recipientName}</span>
                            <span className="font-mono text-slate-500">{rec.recipient}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                              {rec.messageType}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                            {rec.subject}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === 'SENT'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : rec.status === 'QUEUED'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: COMMUNICATION HISTORY */}
        {/* ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search by customer, phone, email, or message..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as any);
                  setHistoryPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Channels</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setHistoryPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="HANDOFF">Handoff</option>
                <option value="QUEUED">Queued</option>
                <option value="RETRY_PENDING">Retry Pending</option>
                <option value="FAILED">Failed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setHistoryPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Message Types</option>
                <option value="GENERAL_MESSAGE">General</option>
                <option value="JOB_READY">Job Ready</option>
                <option value="INVOICE">Invoice</option>
                <option value="PAYMENT_RECEIPT">Receipt</option>
                <option value="DUE_REMINDER">Due Reminder</option>
                <option value="QUOTATION">Quotation</option>
                <option value="CUSTOMER_STATEMENT">Statement</option>
              </select>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setChannelFilter('ALL');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setHistoryPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Reset
              </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Customer / Recipient</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Subject / Preview</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Sender Staff</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No communication records matching current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                            {new Date(rec.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {rec.recipientName || 'Customer'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {rec.recipient}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] inline-flex items-center gap-1 ${
                                rec.channel === 'WHATSAPP'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              }`}
                            >
                              {rec.channel === 'WHATSAPP' ? (
                                <MessageSquare className="w-3 h-3" />
                              ) : (
                                <Mail className="w-3 h-3" />
                              )}
                              {rec.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {rec.messageType.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                            {rec.subject || rec.messagePreview || rec.fullMessage}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ['SENT', 'HANDOFF', 'SENT_BY_OPERATOR'].includes(rec.status)
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : rec.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {rec.createdBy || 'Operator'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedRecordForDetail(rec)}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {historyPage} of {totalPages} ({filteredRecords.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={historyPage >= totalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: TEMPLATES */}
        {/* ========================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Message Templates ({templates.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standardized text messages for WhatsApp and Email notifications with dynamic placeholders.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetTemplates}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Reset Factory Presets
                </button>
                <button
                  onClick={() => {
                    setTemplateToEdit(null);
                    setIsTemplateEditorOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Template</span>
                </button>
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tpl.name}
                        </h4>
                        {tpl.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {tpl.messageType}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Channel: {tpl.channel}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTemplateToEdit(tpl);
                        setIsTemplateEditorOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {tpl.subjectTemplate && (
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      Subject: {tpl.subjectTemplate}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {tpl.bodyTemplate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: QUEUE & FAILED */}
        {/* ========================================================= */}
        {activeTab === 'queue' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Offline Queue & Retry Center
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Failed messages, retries pending with exponential backoff, and offline queued emails.
                </p>
              </div>

              <button
                onClick={handleProcessQueue}
                disabled={isProcessingQueue}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isProcessingQueue ? 'animate-spin' : ''}`} />
                <span>Process Queue Now</span>
              </button>
            </div>

            {queueItems.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Communication Queue Clean
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  All messages have been dispatched or handed off to operator successfully.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{item.recipientName}</span>
                        <span className="font-mono text-slate-400">{item.recipient}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {item.channel} · {item.messageType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-lg">
                        {item.subject || item.messagePreview || item.fullMessage}
                      </div>
                      {item.errorMessage && (
                        <div className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{item.errorMessage}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Retries: {item.retryCount || 0} / 3
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRetryRecord(item.id)}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => handleCancelRecord(item.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: SETTINGS & CREDENTIALS */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Feedback Notifications */}
            {settingsSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}
            {settingsError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {/* WhatsApp Settings Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    WhatsApp Communication Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control device handoffs and canonical Indian phone normalization.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Country Code
                  </label>
                  <input
                    type="text"
                    value={config.communication?.whatsapp?.defaultCountryCode || '+91'}
                    onChange={(e) =>
                      updateWhatsappConfig({ defaultCountryCode: e.target.value.trim() })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    placeholder="+91"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Automatically applied to 10-digit Indian numbers without country prefix.
                  </span>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.communication?.whatsapp?.enabled ?? true}
                      onChange={(e) =>
                        updateWhatsappConfig({ enabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>Enable WhatsApp actions in shop workflows</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Email SMTP Settings Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Email Server (SMTP) Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect standard SMTP mail servers (e.g. Gmail App Password, Zoho, Custom Host).
                  </p>
                </div>
              </div>

              {/* Security Warning */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Protected Credential Vault:</strong> Your SMTP App Password is stored in a cryptographically isolated credential vault. It is strictly excluded from JSON backups, exports, invoices, and diagnostic audit logs.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={config.communication?.email?.senderName || ''}
                    onChange={(e) =>
                      updateEmailConfig({ senderName: e.target.value })
                    }
                    placeholder="e.g. Lumina Cyber Solution"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Email Address *
                  </label>
                  <input
                    type="email"
                    value={config.communication?.email?.senderEmail || ''}
                    onChange={(e) =>
                      updateEmailConfig({ senderEmail: e.target.value })
                    }
                    placeholder="billing@yourdomain.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Host / Server *
                  </label>
                  <input
                    type="text"
                    value={config.communication?.email?.smtpHost || ''}
                    onChange={(e) =>
                      updateEmailConfig({ smtpHost: e.target.value })
                    }
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={config.communication?.email?.smtpPort || 587}
                      onChange={(e) =>
                        updateEmailConfig({ smtpPort: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Security
                    </label>
                    <select
                      value={config.communication?.email?.security || 'STARTTLS'}
                      onChange={(e) =>
                        updateEmailConfig({ security: e.target.value as 'STARTTLS' | 'TLS' })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="STARTTLS">STARTTLS (587)</option>
                      <option value="TLS">TLS / SSL (465)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Username / Login
                  </label>
                  <input
                    type="text"
                    value={config.communication?.email?.username || ''}
                    onChange={(e) =>
                      updateEmailConfig({ username: e.target.value })
                    }
                    placeholder="your-email@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password / App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Use a 16-character Google App Password if using Gmail.
                  </span>
                </div>
              </div>

              {/* Test Connection Strip */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="Enter recipient to send a live test message..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl flex items-center gap-2 border border-indigo-200 dark:border-indigo-800"
                  >
                    {isTestingSmtp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Radio className="w-3.5 h-3.5" />
                    )}
                    <span>Test SMTP Connection</span>
                  </button>
                </div>

                {testFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save All Communication Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal for Selected History Record */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Communication Record Details
              </h3>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono">{selectedRecordForDetail.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-bold">
                  {selectedRecordForDetail.recipientName} ({selectedRecordForDetail.recipient})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Channel / Status:</span>
                <span className="font-bold">
                  {selectedRecordForDetail.channel} · {selectedRecordForDetail.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Created:</span>
                <span>{new Date(selectedRecordForDetail.createdAt).toLocaleString()}</span>
              </div>
              {selectedRecordForDetail.subject && (
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Subject:</span>
                  <span className="font-semibold">{selectedRecordForDetail.subject}</span>
                </div>
              )}
              <div className="py-2">
                <span className="text-slate-400 block mb-1">Message Content:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-sans whitespace-pre-wrap">
                  {selectedRecordForDetail.fullMessage || selectedRecordForDetail.messagePreview}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose / Send Modal */}
      <MessagePreviewModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        initialChannel={composeChannel}
        customer={composeCustomer}
        onSent={() => {
          loadData();
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        businessId={businessId}
        templateToEdit={templateToEdit}
        onSaved={() => loadData()}
      />
    </div>
  );
};
