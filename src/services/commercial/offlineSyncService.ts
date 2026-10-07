import { OfflineSyncRecord } from '../../types';
import { BusinessContextService } from '../businessContext';
import { safeStorage } from '../storage';

const OFFLINE_QUEUE_KEY = 'lumina_cyber_offline_queue_';
const NETWORK_SIMULATOR_KEY = 'lumina_cyber_network_online';

export class OfflineSyncService {
  private static getStorageKey(): string {
    const bizId = BusinessContextService.getCurrentBusinessId();
    return `${OFFLINE_QUEUE_KEY}${bizId}`;
  }

  /**
   * Network state check (inspects navigator.onLine and internal simulation flag)
   */
  static isOnline(): boolean {
    const sim = safeStorage.getItem(NETWORK_SIMULATOR_KEY);
    if (sim !== null) {
      return sim === 'true';
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  static setSimulatedOnline(online: boolean): void {
    safeStorage.setItem(NETWORK_SIMULATOR_KEY, online ? 'true' : 'false');
  }

  static getQueue(): OfflineSyncRecord[] {
    const key = this.getStorageKey();
    const raw = safeStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as OfflineSyncRecord[];
    } catch (_) {
      return [];
    }
  }

  static saveQueue(queue: OfflineSyncRecord[]): void {
    const key = this.getStorageKey();
    safeStorage.setItem(key, JSON.stringify(queue));
  }

  /**
   * Enqueue a local offline operation safely
   */
  static enqueueAction(
    entityType: 'invoice' | 'session' | 'customer' | 'job',
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any
  ): OfflineSyncRecord {
    const bizId = BusinessContextService.getCurrentBusinessId();
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Defense against duplicate queue items with same payload ID
    const queue = this.getQueue();
    const existing = queue.find(
      (item) => item.entityType === entityType && item.payload?.id && item.payload.id === payload?.id && item.status === 'QUEUED'
    );
    if (existing) {
      existing.payload = payload;
      existing.queuedAt = new Date().toISOString();
      this.saveQueue(queue);
      return existing;
    }

    const record: OfflineSyncRecord = {
      id,
      businessId: bizId,
      entityType,
      action,
      payload,
      queuedAt: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0,
    };

    queue.push(record);
    this.saveQueue(queue);
    return record;
  }

  /**
   * Synchronize pending offline actions once online
   */
  static async synchronizePendingQueue(
    customHandler?: (record: OfflineSyncRecord) => Promise<boolean>
  ): Promise<{
    processed: number;
    synced: number;
    failed: number;
    remaining: number;
  }> {
    if (!this.isOnline()) {
      return { processed: 0, synced: 0, failed: 0, remaining: this.getQueue().filter((q) => q.status === 'QUEUED').length };
    }

    const queue = this.getQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      if (item.status !== 'QUEUED') continue;

      try {
        if (!item.payload || typeof item.payload !== 'object') {
          item.status = 'FAILED';
          item.error = 'Malformed queued record payload.';
          failed++;
          continue;
        }

        let success = true;
        if (customHandler) {
          success = await customHandler(item);
        }

        if (success) {
          item.status = 'SYNCED';
          item.syncedAt = new Date().toISOString();
          synced++;
        } else {
          item.retryCount++;
          if (item.retryCount >= 3) {
            item.status = 'FAILED';
            item.error = 'Max sync retries exceeded.';
          }
          failed++;
        }
      } catch (err: any) {
        item.retryCount++;
        item.error = err.message || 'Unknown network sync error';
        if (item.retryCount >= 3) {
          item.status = 'FAILED';
        }
        failed++;
      }
    }

    // Retain only un-synced items or recent synced items (keep queue clean)
    const remainingQueue = queue.filter((item) => item.status === 'QUEUED' || item.status === 'FAILED');
    this.saveQueue(remainingQueue);

    return {
      processed: synced + failed,
      synced,
      failed,
      remaining: remainingQueue.filter((q) => q.status === 'QUEUED').length,
    };
  }

  /**
   * Purge corrupted or malformed queue items
   */
  static sanitizeQueue(): { purged: number; remaining: number } {
    const queue = this.getQueue();
    const valid = queue.filter((item) => item && item.id && item.entityType && item.payload);
    const purged = queue.length - valid.length;
    this.saveQueue(valid);
    return { purged, remaining: valid.length };
  }
}
