import { BusinessConfigService } from './businessConfig';
import { StorageService } from './storage';

export class BusinessContextService {
  /**
   * Get current active business ID from normalized BusinessConfig profile
   */
  public static getCurrentBusinessId(): string {
    try {
      const config = BusinessConfigService.getConfig();
      const rawId = config.profile?.businessId || 'biz_nil_printers_001';
      return rawId.startsWith('biz_') ? rawId : `biz_${rawId}`;
    } catch (err) {
      return 'biz_nil_printers_001';
    }
  }

  /**
   * Set active business ID in config
   */
  public static setCurrentBusinessId(businessId: string): void {
    const current = StorageService.getConfig();
    if (!current.profile) current.profile = {} as any;
    current.profile.businessId = businessId;
    StorageService.saveConfig(current);
  }

  /**
   * Generate a unique, non-colliding business ID for new commercial onboardings
   */
  public static generateUniqueBusinessId(prefix = 'biz'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${rand}`;
  }

  /**
   * Verify whether a record strictly belongs to the currently active business tenant
   */
  public static isCurrentTenant(recordBusinessId?: string): boolean {
    const activeId = this.getCurrentBusinessId();
    if (!recordBusinessId) return false;
    return recordBusinessId === activeId;
  }

  /**
   * Assert tenant ownership or throw a security error
   */
  public static assertTenantOwnership(recordBusinessId?: string, entityName = 'Record'): void {
    if (!this.isCurrentTenant(recordBusinessId)) {
      throw new Error(`Tenant Security Violation: Access denied to ${entityName} belonging to business ID "${recordBusinessId}". Active business ID is "${this.getCurrentBusinessId()}".`);
    }
  }
}
