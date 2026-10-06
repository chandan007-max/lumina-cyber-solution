import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileCode,
  Save,
  AlertTriangle,
  CheckCircle2,
  Tag,
  HelpCircle,
  Copy,
} from 'lucide-react';
import {
  CommunicationTemplate,
  CommunicationChannel,
  CommunicationMessageType,
} from '../../types';
import { TemplateService } from '../../services/communication/templateService';
import { TemplateRepository } from '../../repositories/templateRepository';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  templateToEdit?: CommunicationTemplate | null;
  onSaved: (template: CommunicationTemplate) => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  businessId,
  templateToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('BOTH');
  const [messageType, setMessageType] = useState<CommunicationMessageType>('GENERAL_MESSAGE');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variablesRegistry = useMemo(() => TemplateService.getVariableRegistry(), []);

  useEffect(() => {
    if (!isOpen) return;

    if (templateToEdit) {
      setName(templateToEdit.name);
      setChannel(templateToEdit.channel);
      setMessageType(templateToEdit.messageType);
      setSubjectTemplate(templateToEdit.subjectTemplate || '');
      setBodyTemplate(templateToEdit.bodyTemplate);
      setIsActive(templateToEdit.isActive);
      setIsDefault(templateToEdit.isDefault);
    } else {
      setName('');
      setChannel('BOTH');
      setMessageType('GENERAL_MESSAGE');
      setSubjectTemplate('');
      setBodyTemplate('Hello {{customer.name}},\n\n');
      setIsActive(true);
      setIsDefault(false);
    }
    setError(null);
  }, [isOpen, templateToEdit]);

  // Syntax and variable validation
  const validation = useMemo(() => {
    const fullText = `${subjectTemplate} ${bodyTemplate}`;
    return TemplateService.validateSyntax(fullText);
  }, [subjectTemplate, bodyTemplate]);

  const handleInsertVariable = (varName: string, target: 'subject' | 'body') => {
    const tag = `{{${varName}}}`;
    if (target === 'subject') {
      setSubjectTemplate((prev) => `${prev} ${tag}`);
    } else {
      setBodyTemplate((prev) => `${prev}${tag}`);
    }
  };

  const handleSave = () => {
    setError(null);
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (!bodyTemplate.trim()) {
      setError('Message body template cannot be empty.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const updatedTemplate: CommunicationTemplate = {
        id: templateToEdit?.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessId,
        name: name.trim(),
        channel,
        messageType,
        subjectTemplate: subjectTemplate.trim() || undefined,
        bodyTemplate: bodyTemplate.trim(),
        variables: TemplateService.extractVariables(`${subjectTemplate} ${bodyTemplate}`),
        isDefault,
        isActive,
        createdAt: templateToEdit?.createdAt || now,
        updatedAt: now,
      };

      TemplateRepository.save(businessId, updatedTemplate);
      onSaved(updatedTemplate);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {templateToEdit ? 'Edit Communication Template' : 'Create New Message Template'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Design reusable message templates with customer, invoice, and job variables.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Job Ready"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as CommunicationMessageType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="GENERAL_MESSAGE">General Message</option>
                <option value="JOB_RECEIVED">Job Received</option>
                <option value="JOB_IN_PROGRESS">Job In Progress</option>
                <option value="JOB_READY">Job Ready</option>
                <option value="JOB_DELIVERED">Job Delivered</option>
                <option value="INVOICE">Invoice</option>
                <option value="PAYMENT_RECEIPT">Payment Receipt</option>
                <option value="PAYMENT_CONFIRMATION">Payment Confirmation</option>
                <option value="DUE_REMINDER">Due Reminder</option>
                <option value="QUOTATION">Quotation</option>
                <option value="CUSTOMER_STATEMENT">Customer Statement</option>
                <option value="WELCOME_MESSAGE">Welcome Message</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Channel Compatibility
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BOTH">All Channels (WhatsApp & Email)</option>
                <option value="WHATSAPP">WhatsApp Only</option>
                <option value="EMAIL">Email Only</option>
              </select>
            </div>
          </div>

          {/* Email Subject */}
          {(channel === 'BOTH' || channel === 'EMAIL') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Subject Line Template
                </label>
                <span className="text-[11px] text-slate-400">Used when sending via Email</span>
              </div>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="e.g. Your Invoice {{invoice.number}} from {{business.name}}"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Body Template */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Body Template *
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {bodyTemplate.length} characters
              </span>
            </div>
            <textarea
              rows={6}
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Write your template text here..."
            />
          </div>

          {/* Variable Inserter Toolbar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              Click Variable to Insert Into Body
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {variablesRegistry.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key, 'body')}
                  title={`${v.label} (e.g. ${v.example})`}
                  className="px-2 py-1 text-[11px] font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +{`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Syntax Validation Status */}
          <div className="text-xs">
            {validation.hasUnknownVariables && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Unregistered variables detected: <strong>{validation.unknownVariables.join(', ')}</strong>. Verify spelling against variable list above.
                </span>
              </div>
            )}
            {!validation.isValid && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validation.errors.join('; ')}</span>
              </div>
            )}
          </div>

          {/* Options Toggles */}
          <div className="flex items-center gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Set as default template for this message type</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        {/* Footer */}
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
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};
