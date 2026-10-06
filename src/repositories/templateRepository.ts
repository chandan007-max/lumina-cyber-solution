/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Template Repository
 * Multi-tenant durable persistence for message templates.
 */

import { CommunicationTemplate, CommunicationMessageType } from '../types';
import { safeStorage } from '../services/storage';
import { BusinessContextService } from '../services/businessContext';
import { TemplateService } from '../services/communication/templateService';

const STORAGE_KEY = 'nil_comm_templates';

export class TemplateRepository {
  private static getAllFromStorage(): CommunicationTemplate[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  private static saveAllToStorage(templates: CommunicationTemplate[]): void {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }

  /**
   * Get all templates for active tenant (automatically seeding defaults if empty)
   */
  static getTemplates(
    channel?: 'WHATSAPP' | 'EMAIL' | 'all',
    businessIdOverride?: string
  ): CommunicationTemplate[] {
    const activeBusinessId = businessIdOverride || BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    let tenantTemplates = all.filter((t) => t.businessId === activeBusinessId);

    // Auto-seed default templates if none exist for this business
    if (tenantTemplates.length === 0) {
      const defaults = TemplateService.getDefaultTemplates(activeBusinessId);
      this.saveAllToStorage([...all, ...defaults]);
      tenantTemplates = defaults;
    }

    if (channel && channel !== 'all') {
      tenantTemplates = tenantTemplates.filter((t) => t.channel === 'BOTH' || t.channel === channel);
    }

    return tenantTemplates.filter((t) => t.isActive);
  }

  static getTemplateById(id: string, businessIdOverride?: string): CommunicationTemplate | null {
    const activeBusinessId = businessIdOverride || BusinessContextService.getCurrentBusinessId();
    const templates = this.getTemplates('all', activeBusinessId);
    return templates.find((t) => t.id === id) || null;
  }

  static getTemplateByMessageType(
    type: CommunicationMessageType,
    channel?: 'WHATSAPP' | 'EMAIL',
    businessIdOverride?: string
  ): CommunicationTemplate | null {
    const templates = this.getTemplates(channel || 'all', businessIdOverride);
    const match = templates.find((t) => t.messageType === type);
    return match || null;
  }

  static saveTemplate(template: CommunicationTemplate): void {
    const activeBusinessId = template.businessId || BusinessContextService.getCurrentBusinessId();
    const stamped: CommunicationTemplate = {
      ...template,
      businessId: activeBusinessId,
      updatedAt: new Date().toISOString(),
    };

    const all = this.getAllFromStorage();
    const index = all.findIndex((t) => t.id === stamped.id);

    if (index >= 0) {
      if (all[index].businessId !== activeBusinessId) {
        throw new Error('Tenant boundary violation: cannot modify foreign template.');
      }
      all[index] = stamped;
    } else {
      all.push(stamped);
    }

    this.saveAllToStorage(all);
  }

  static deleteTemplate(id: string): boolean {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    const target = all.find((t) => t.id === id);

    if (!target) return false;
    if (target.businessId !== activeBusinessId) {
      throw new Error('Tenant boundary violation: cannot delete foreign template.');
    }

    const remaining = all.filter((t) => t.id !== id);
    this.saveAllToStorage(remaining);
    return true;
  }

  static resetDefaults(businessId?: string): void {
    const bId = businessId || BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    const remaining = all.filter((t) => t.businessId !== bId);
    const defaults = TemplateService.getDefaultTemplates(bId);
    this.saveAllToStorage([...remaining, ...defaults]);
  }

  static getAll(businessIdOverride?: string): CommunicationTemplate[] {
    return this.getTemplates('all', businessIdOverride);
  }

  static save(businessId: string, template: Partial<CommunicationTemplate> & { name: string; channel: any; messageType: any; bodyTemplate: string }): CommunicationTemplate {
    const stamped: CommunicationTemplate = {
      id: template.id || `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      businessId,
      name: template.name,
      channel: template.channel,
      messageType: template.messageType,
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      variables: template.variables || [],
      isActive: template.isActive ?? true,
      isDefault: template.isDefault ?? false,
      createdAt: (template as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveTemplate(stamped);
    return stamped;
  }

  static seedDefaults(businessId?: string): CommunicationTemplate[] {
    this.resetDefaults(businessId);
    return this.getAll(businessId);
  }
}
