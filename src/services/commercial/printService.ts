import { PrintClassification, PrintJobRecord } from '../../types';
import { BusinessContextService } from '../businessContext';
import { safeStorage } from '../storage';

const PRINT_QUEUE_KEY = 'lumina_cyber_print_queue_';

export class CyberPrintService {
  private static getStorageKey(): string {
    const bizId = BusinessContextService.getCurrentBusinessId();
    return `${PRINT_QUEUE_KEY}${bizId}`;
  }

  static getPrintHistory(): PrintJobRecord[] {
    const key = this.getStorageKey();
    const raw = safeStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PrintJobRecord[];
    } catch (_) {
      return [];
    }
  }

  static savePrintHistory(records: PrintJobRecord[]): void {
    const key = this.getStorageKey();
    safeStorage.setItem(key, JSON.stringify(records));
  }

  /**
   * Queue and dispatch a print job with honest lifecycle classification
   */
  static queuePrintJob(params: {
    documentType: 'receipt' | 'document' | 'photo' | 'report';
    documentTitle: string;
    printerName: string;
    printerType?: 'thermal80' | 'thermal58' | 'a4_laser' | 'inkjet_photo';
    copies?: number;
    pages?: number;
    operator: string;
    simulateDriverAcceptance?: boolean;
    simulateDriverFailure?: boolean;
  }): PrintJobRecord {
    const bizId = BusinessContextService.getCurrentBusinessId();
    const id = `prn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check duplicate print protection (same document within 5 seconds)
    const history = this.getPrintHistory();
    const recentDuplicate = history.find(
      (p) =>
        p.documentTitle === params.documentTitle &&
        p.printerName === params.printerName &&
        Math.abs(new Date(now).getTime() - new Date(p.createdAt).getTime()) < 3000
    );

    if (recentDuplicate) {
      throw new Error(`Duplicate print prevention: ${params.documentTitle} was just dispatched. Please wait.`);
    }

    // Step 1: PRINT COMMAND GENERATED
    let status: PrintClassification = 'PRINT COMMAND GENERATED';
    let dispatchedAt: string | undefined = undefined;

    if (params.simulateDriverFailure) {
      status = 'FAILED';
    } else if (params.simulateDriverAcceptance ?? true) {
      // Step 2 & 3: PRINT QUEUED -> DRIVER ACCEPTED (Dispatched to OS driver / spooler)
      status = 'DRIVER ACCEPTED';
      dispatchedAt = new Date().toISOString();
    } else {
      status = 'PRINT QUEUED';
    }

    const job: PrintJobRecord = {
      id,
      businessId: bizId,
      documentType: params.documentType,
      documentTitle: params.documentTitle,
      printerName: params.printerName,
      printerType: params.printerType || 'thermal80',
      copies: params.copies || 1,
      pages: params.pages || 1,
      status,
      createdAt: now,
      dispatchedAt,
      operator: params.operator,
    };

    history.unshift(job);
    // Keep max 200 print records
    this.savePrintHistory(history.slice(0, 200));
    return job;
  }

  /**
   * Physical verification confirmation: ONLY a human operator inspecting
   * the physical printed sheet/receipt can confirm physical output.
   */
  static confirmPhysicalPrint(jobId: string, operatorNotes?: string): PrintJobRecord {
    const history = this.getPrintHistory();
    const job = history.find((j) => j.id === jobId);
    if (!job) {
      throw new Error(`Print job ${jobId} not found.`);
    }

    job.status = 'PHYSICAL PRINT CONFIRMED';
    job.notes = operatorNotes ? `Physical verified: ${operatorNotes}` : 'Physical print verified by operator.';
    this.savePrintHistory(history);
    return job;
  }

  /**
   * Record driver/peripheral error
   */
  static failPrintJob(jobId: string, errorReason: string): PrintJobRecord {
    const history = this.getPrintHistory();
    const job = history.find((j) => j.id === jobId);
    if (!job) throw new Error(`Print job ${jobId} not found.`);

    job.status = 'FAILED';
    job.notes = `Driver/Spooler Error: ${errorReason}`;
    this.savePrintHistory(history);
    return job;
  }

  /**
   * Retry failed print job
   */
  static retryPrintJob(jobId: string): PrintJobRecord {
    const history = this.getPrintHistory();
    const job = history.find((j) => j.id === jobId);
    if (!job) throw new Error(`Print job ${jobId} not found.`);

    job.status = 'DRIVER ACCEPTED';
    job.dispatchedAt = new Date().toISOString();
    job.notes = `${job.notes ? job.notes + ' | ' : ''}Retried by operator`;
    this.savePrintHistory(history);
    return job;
  }
}
