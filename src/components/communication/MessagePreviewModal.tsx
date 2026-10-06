import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Send,
  Loader2,
  Paperclip,
  Eye,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  CommunicationChannel,
  CommunicationMessageType,
  CommunicationRecord,
  CommunicationTemplate,
  Customer,
  JobItem,
  Invoice,
} from '../../types';
import { TemplateService } from '../../services/communication/templateService';
import { WhatsAppService } from '../../services/communication/whatsAppService';
import { CommunicationService } from '../../services/communication/communicationService';
import { TemplateRepository } from '../../repositories/templateRepository';
import { StorageService } from '../../services/storage';

interface MessagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChannel?: CommunicationChannel;
  initialType?: CommunicationMessageType;
  customer?: Customer;
  job?: JobItem;
  invoice?: Invoice;
  payment?: { id: string; amount: number; method: string; date?: string; receiptNo?: string };
  statement?: {
    periodStart: string;
    periodEnd: string;
    totalBilled: number;
    totalPaid: number;
    balanceDue: number;
  };
  onSent?: (record: CommunicationRecord) => void;
}

export const MessagePreviewModal: React.FC<MessagePreviewModalProps> = ({
  isOpen,
  onClose,
  initialChannel = 'WHATSAPP',
  initialType = 'GENERAL_MESSAGE',
  customer,
  job,
  invoice,
  payment,
  statement,
  onSent,
}) => {
  const [channel, setChannel] = useState<CommunicationChannel>(initialChannel);
  const [messageType, setMessageType] = useState<CommunicationMessageType>(initialType);
  const [recipient, setRecipient] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customBody, setCustomBody] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [includeAttachment, setIncludeAttachment] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const businessConfig = StorageService.getConfig();
  const currentStaff = StorageService.getCurrentStaff();
  const businessId = businessConfig.profile.businessId || 'default-business';

  // Load available templates for this type and channel
  const availableTemplates = useMemo(() => {
    const all = TemplateRepository.getAll(businessId);
    return all.filter(
      (t: CommunicationTemplate) =>
        t.isActive &&
        t.messageType === messageType &&
        (t.channel === 'BOTH' || t.channel === channel)
    );
  }, [businessId, messageType, channel]);

  // Initialize recipient and message template when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    setChannel(initialChannel);
    setMessageType(initialType);
    setFeedback(null);

    // Initial recipient
    if (initialChannel === 'WHATSAPP') {
      setRecipient(customer?.phone || job?.customerPhone || '');
    } else {
      setRecipient(customer?.email || '');
    }

    // Default template selection
    const matchingTemplates = TemplateRepository.getAll(businessId).filter(
      (t: CommunicationTemplate) =>
        t.isActive &&
        t.messageType === initialType &&
        (t.channel === 'BOTH' || t.channel === initialChannel)
    );

    if (matchingTemplates.length > 0) {
      const defaultTpl = matchingTemplates.find((t: CommunicationTemplate) => t.isDefault) || matchingTemplates[0];
      setSelectedTemplateId(defaultTpl.id);
      setCustomSubject(defaultTpl.subjectTemplate || '');
      setCustomBody(defaultTpl.bodyTemplate);
    } else {
      setSelectedTemplateId('');
      setCustomSubject('');
      setCustomBody('');
    }
  }, [isOpen, initialChannel, initialType, customer, job, invoice, businessId]);

  // Update recipient when channel changes
  const handleChannelSwitch = (newChannel: CommunicationChannel) => {
    setChannel(newChannel);
    setFeedback(null);
    if (newChannel === 'WHATSAPP') {
      setRecipient(customer?.phone || job?.customerPhone || '');
    } else {
      setRecipient(customer?.email || '');
    }

    // Pick template for new channel if needed
    const matching = TemplateRepository.getAll(businessId).filter(
      (t: CommunicationTemplate) =>
        t.isActive &&
        t.messageType === messageType &&
        (t.channel === 'BOTH' || t.channel === newChannel)
    );
    if (matching.length > 0) {
      const def = matching.find((t: CommunicationTemplate) => t.isDefault) || matching[0];
      setSelectedTemplateId(def.id);
      setCustomSubject(def.subjectTemplate || '');
      setCustomBody(def.bodyTemplate);
    }
  };

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = availableTemplates.find((t) => t.id === tplId);
    if (found) {
      setCustomSubject(found.subjectTemplate || '');
      setCustomBody(found.bodyTemplate);
    }
  };

  // Build context for rendering
  const renderContext = useMemo(() => {
    const cust = customer || (job ? {
      id: job.customerId || '',
      name: job.customerName || '',
      phone: job.customerPhone || '',
      email: '',
      businessName: '',
      address: '',
      gstin: '',
      totalOrdersCount: 0,
      totalOrdersAmount: 0,
      totalPaidAmount: 0,
      currentDue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : undefined);

    return TemplateService.buildContext({
      business: businessConfig,
      customer: cust,
      job,
      invoice,
      payment,
      statement,
    });
  }, [businessConfig, customer, job, invoice, payment, statement]);

  // Live rendered subject & body
  const renderedSubject = useMemo(() => {
    if (!customSubject) return '';
    return TemplateService.render(customSubject, renderContext);
  }, [customSubject, renderContext]);

  const renderedBody = useMemo(() => {
    if (!customBody) return '';
    return TemplateService.render(customBody, renderContext);
  }, [customBody, renderContext]);

  // Phone normalization check for WhatsApp
  const phoneValidation = useMemo(() => {
    if (channel !== 'WHATSAPP') return { isValid: true, normalized: recipient, digitsOnly: recipient, error: undefined };
    return WhatsAppService.normalizeIndianPhone(
      recipient,
      businessConfig.communication?.whatsapp?.defaultCountryCode || '+91'
    );
  }, [channel, recipient, businessConfig]);

  // Email format check
  const isEmailValid = useMemo(() => {
    if (channel !== 'EMAIL') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim());
  }, [channel, recipient]);

  // Document attachment details
  const attachmentName = useMemo(() => {
    if (!includeAttachment) return null;
    if (invoice) return `Invoice_${invoice.id}.pdf`;
    if (job) return `JobSlip_${job.id}.pdf`;
    if (payment) return `Receipt_${payment.id.slice(0, 8)}.pdf`;
    if (statement) return `Statement_${customer?.name || 'Customer'}.pdf`;
    return null;
  }, [includeAttachment, invoice, job, payment, statement, customer]);

  // Execute Send / Handoff
  const handleExecuteSend = async () => {
    setFeedback(null);

    if (channel === 'WHATSAPP') {
      if (!phoneValidation.isValid) {
        setFeedback({
          type: 'error',
          message: phoneValidation.error || 'Please enter a valid phone number',
        });
        return;
      }

      setIsSending(true);
      try {
        const result = await CommunicationService.sendMessage({
          businessId,
          channel: 'WHATSAPP',
          messageType,
          recipient: phoneValidation.normalized,
          recipientName: customer?.name || job?.customerName || 'Customer',
          subject: renderedSubject,
          content: renderedBody,
          templateId: selectedTemplateId || undefined,
          customerId: customer?.id || job?.customerId,
          jobId: job?.id,
          invoiceId: invoice?.id,
          paymentId: payment?.id,
          createdBy: currentStaff?.name || 'Operator',
        });

        // Trigger WhatsApp Web / URL handoff in new browser tab
        const handoff = WhatsAppService.generateHandoffUrl(
          phoneValidation.normalized,
          renderedBody
        );
        if (handoff.url) {
          window.open(handoff.url, '_blank', 'noopener,noreferrer');
        }

        setFeedback({
          type: 'success',
          message: 'WhatsApp Web opened for operator review. Handoff recorded in communication log.',
        });

        if (onSent) onSent(result.record);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to initiate WhatsApp handoff',
        });
      } finally {
        setIsSending(false);
      }
    } else {
      // EMAIL CHANNEL
      if (!isEmailValid) {
        setFeedback({
          type: 'error',
          message: 'Please provide a valid recipient email address',
        });
        return;
      }

      setIsSending(true);
      try {
        const bName = businessConfig.profile.businessName || businessConfig.businessName || 'Lumina Cyber Solution';
        const result = await CommunicationService.sendMessage({
          businessId,
          channel: 'EMAIL',
          messageType,
          recipient: recipient.trim(),
          recipientName: customer?.name || job?.customerName || 'Customer',
          subject: renderedSubject || `Notification from ${bName}`,
          content: renderedBody,
          templateId: selectedTemplateId || undefined,
          customerId: customer?.id || job?.customerId,
          jobId: job?.id,
          invoiceId: invoice?.id,
          paymentId: payment?.id,
          createdBy: currentStaff?.name || 'Operator',
          attachments: attachmentName
            ? [
                {
                  id: `att_${Date.now()}`,
                  name: attachmentName,
                  mimeType: 'application/pdf',
                  dataBase64: 'JVBERi0xLjQK...', // Placeholder base64 for document snapshot
                },
              ]
            : undefined,
        });

        if (result.success) {
          setFeedback({
            type: 'success',
            message: result.record.status === 'QUEUED'
              ? 'Email queued for offline transmission.'
              : 'Email sent successfully via configured provider.',
          });
          if (onSent) onSent(result.record);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Failed to dispatch email. Added to retry queue.',
          });
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to dispatch email',
        });
      } finally {
        setIsSending(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                channel === 'WHATSAPP'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {channel === 'WHATSAPP' ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Send {channel === 'WHATSAPP' ? 'WhatsApp Message' : 'Email'}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {messageType.replace(/_/g, ' ')}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review recipient, message template, and attachments before dispatching.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Channel Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
            <button
              type="button"
              onClick={() => handleChannelSwitch('WHATSAPP')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                channel === 'WHATSAPP'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp Web
            </button>
            <button
              type="button"
              onClick={() => handleChannelSwitch('EMAIL')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                channel === 'EMAIL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email (SMTP)
            </button>
          </div>

          {/* Recipient Details & Template Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {channel === 'WHATSAPP' ? 'Phone Number (Mobile)' : 'Email Address'}
              </label>
              <input
                type={channel === 'WHATSAPP' ? 'tel' : 'email'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={channel === 'WHATSAPP' ? 'e.g. 9800099934 or +91...' : 'customer@example.com'}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              {channel === 'WHATSAPP' && recipient && (
                <div className="mt-1 text-[11px] flex items-center gap-1.5">
                  {phoneValidation.isValid ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Normalized to {phoneValidation.normalized}
                    </span>
                  ) : (
                    <span className="text-rose-500 font-medium">
                      ⚠ {phoneValidation.error}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableTemplates.map((t: CommunicationTemplate) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(Default)' : ''}
                  </option>
                ))}
                <option value="">Custom Message (No Template)</option>
              </select>
            </div>
          </div>

          {/* Subject (for Email) */}
          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Message Content / Template Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Text (Supports {'{{variables}}'})
              </label>
              <span className="text-[11px] text-slate-400">
                {customBody.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Type message text here..."
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                Live Customer Preview
              </span>
              <span className="text-[10px] text-slate-400">
                Variables resolved in real-time
              </span>
            </div>
            {channel === 'EMAIL' && renderedSubject && (
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-700/60">
                Subject: {renderedSubject}
              </div>
            )}
            <div className="text-xs whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              {renderedBody || (
                <span className="text-slate-400 italic">No message content generated.</span>
              )}
            </div>
          </div>

          {/* Document Attachment Option */}
          {attachmentName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Attach Transaction Document
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {attachmentName}
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAttachment}
                  onChange={(e) => setIncludeAttachment(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Include
                </span>
              </label>
            </div>
          )}

          {/* WhatsApp Web Notice */}
          {channel === 'WHATSAPP' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>WhatsApp Web Mode:</strong> Clicking Send will open WhatsApp Web in a new tab with your pre-filled message. The operator reviews and presses send in WhatsApp. This action will be recorded in communication history as <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">HANDOFF</code>.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSending || (channel === 'WHATSAPP' ? !phoneValidation.isValid : !isEmailValid)}
            onClick={handleExecuteSend}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
              channel === 'WHATSAPP'
                ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : channel === 'WHATSAPP' ? (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Open WhatsApp Web</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
