import { CyberWorkstation, ComputerSession, WorkstationStatus } from '../../types';
import { BusinessContextService } from '../businessContext';
import { safeStorage } from '../storage';

const WORKSTATION_STORAGE_KEY = 'lumina_cyber_workstations_';
const SESSION_STORAGE_KEY = 'lumina_cyber_sessions_';

export class SessionService {
  private static getStorageKey(prefix: string): string {
    const bizId = BusinessContextService.getCurrentBusinessId();
    return `${prefix}${bizId}`;
  }

  /**
   * Seed default cyber café computer stations if none exist
   */
  static seedDefaultWorkstations(): CyberWorkstation[] {
    const bizId = BusinessContextService.getCurrentBusinessId();
    const defaults: CyberWorkstation[] = [
      { id: 'ws_pc_01', businessId: bizId, name: 'PC-01 (General Browsing)', status: 'IDLE', hourlyRate: 30, minCharge: 10, createdAt: new Date().toISOString() },
      { id: 'ws_pc_02', businessId: bizId, name: 'PC-02 (General Browsing)', status: 'IDLE', hourlyRate: 30, minCharge: 10, createdAt: new Date().toISOString() },
      { id: 'ws_pc_03', businessId: bizId, name: 'PC-03 (Gaming & High-Res)', status: 'IDLE', hourlyRate: 50, minCharge: 20, createdAt: new Date().toISOString() },
      { id: 'ws_pc_04', businessId: bizId, name: 'PC-04 (Govt Exam & Forms)', status: 'IDLE', hourlyRate: 35, minCharge: 15, createdAt: new Date().toISOString() },
      { id: 'ws_pc_05', businessId: bizId, name: 'PC-05 (Document & Scanning)', status: 'IDLE', hourlyRate: 35, minCharge: 15, createdAt: new Date().toISOString() },
      { id: 'ws_pc_06', businessId: bizId, name: 'PC-06 (Cabin Private)', status: 'IDLE', hourlyRate: 40, minCharge: 20, createdAt: new Date().toISOString() },
    ];
    this.saveWorkstations(defaults);
    return defaults;
  }

  static getWorkstations(): CyberWorkstation[] {
    const key = this.getStorageKey(WORKSTATION_STORAGE_KEY);
    const raw = safeStorage.getItem(key);
    if (!raw) {
      return this.seedDefaultWorkstations();
    }
    try {
      const list = JSON.parse(raw) as CyberWorkstation[];
      return list.length > 0 ? list : this.seedDefaultWorkstations();
    } catch (_) {
      return this.seedDefaultWorkstations();
    }
  }

  static saveWorkstations(stations: CyberWorkstation[]): void {
    const key = this.getStorageKey(WORKSTATION_STORAGE_KEY);
    safeStorage.setItem(key, JSON.stringify(stations));
  }

  static getWorkstationById(id: string): CyberWorkstation | undefined {
    return this.getWorkstations().find((w) => w.id === id);
  }

  static upsertWorkstation(wsData: Partial<CyberWorkstation> & { name: string }): CyberWorkstation {
    const bizId = BusinessContextService.getCurrentBusinessId();
    const stations = this.getWorkstations();
    const existingIdx = stations.findIndex((w) => w.id === wsData.id);

    if (existingIdx >= 0) {
      const updated: CyberWorkstation = {
        ...stations[existingIdx],
        ...wsData,
        businessId: bizId,
      };
      stations[existingIdx] = updated;
      this.saveWorkstations(stations);
      return updated;
    } else {
      const newWs: CyberWorkstation = {
        id: wsData.id || `ws_pc_${Date.now().toString().slice(-4)}`,
        businessId: bizId,
        name: wsData.name,
        ipAddress: wsData.ipAddress,
        status: wsData.status || 'IDLE',
        hourlyRate: wsData.hourlyRate || 30,
        minCharge: wsData.minCharge || 10,
        currentSessionId: null,
        createdAt: new Date().toISOString(),
      };
      stations.push(newWs);
      this.saveWorkstations(stations);
      return newWs;
    }
  }

  static setWorkstationStatus(id: string, status: WorkstationStatus): void {
    const stations = this.getWorkstations();
    const target = stations.find((w) => w.id === id);
    if (target) {
      target.status = status;
      if (status === 'IDLE') {
        target.currentSessionId = null;
      }
      this.saveWorkstations(stations);
    }
  }

  // ==========================================
  // SESSIONS
  // ==========================================

  static getAllSessions(): ComputerSession[] {
    const key = this.getStorageKey(SESSION_STORAGE_KEY);
    const raw = safeStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ComputerSession[];
    } catch (_) {
      return [];
    }
  }

  static saveSessions(sessions: ComputerSession[]): void {
    const key = this.getStorageKey(SESSION_STORAGE_KEY);
    safeStorage.setItem(key, JSON.stringify(sessions));
  }

  static getSessionById(id: string): ComputerSession | undefined {
    return this.getAllSessions().find((s) => s.id === id);
  }

  static getActiveSessions(): ComputerSession[] {
    return this.getAllSessions().filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');
  }

  /**
   * Start a computer usage session
   */
  static startSession(params: {
    workstationId: string;
    customerName: string;
    customerPhone?: string;
    customerId?: string;
    hourlyRate?: number;
    minCharge?: number;
    operatorStaffId: string;
    notes?: string;
  }): ComputerSession {
    const bizId = BusinessContextService.getCurrentBusinessId();
    const ws = this.getWorkstationById(params.workstationId);
    if (!ws) {
      throw new Error(`Workstation ${params.workstationId} not found.`);
    }
    if (ws.status === 'ACTIVE' || ws.status === 'PAUSED') {
      throw new Error(`Workstation ${ws.name} is currently occupied with an active session.`);
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hourlyRate = params.hourlyRate ?? ws.hourlyRate ?? 30;
    const minCharge = params.minCharge ?? ws.minCharge ?? 10;

    const newSession: ComputerSession = {
      id: sessionId,
      businessId: bizId,
      workstationId: ws.id,
      workstationName: ws.name,
      customerId: params.customerId,
      customerName: params.customerName || 'Walk-in Customer',
      customerPhone: params.customerPhone,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMinutes: 0,
      hourlyRate,
      minCharge,
      calculatedCharge: minCharge,
      status: 'ACTIVE',
      notes: params.notes,
      billedInvoiceId: null,
      operatorStaffId: params.operatorStaffId || 'staff_op_1',
    };

    // Update workstation status
    ws.status = 'ACTIVE';
    ws.currentSessionId = sessionId;
    const stations = this.getWorkstations().map((w) => (w.id === ws.id ? ws : w));
    this.saveWorkstations(stations);

    // Persist session
    const sessions = this.getAllSessions();
    sessions.unshift(newSession);
    this.saveSessions(sessions);

    return newSession;
  }

  /**
   * Calculate session charge based on elapsed duration and rates
   */
  static calculateSessionCharge(
    session: ComputerSession,
    asOfTime: string = new Date().toISOString()
  ): { durationMinutes: number; charge: number } {
    const startMs = new Date(session.startedAt).getTime();
    const endMs = session.endedAt ? new Date(session.endedAt).getTime() : new Date(asOfTime).getTime();
    const elapsedMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    // Prorated per-minute calculation with minimum base charge
    const rawHourlyCharge = (elapsedMinutes / 60) * session.hourlyRate;
    const roundedCharge = Math.ceil(rawHourlyCharge);
    const finalCharge = Math.max(session.minCharge, roundedCharge);

    return {
      durationMinutes: elapsedMinutes,
      charge: finalCharge,
    };
  }

  /**
   * Pause an active session
   */
  static pauseSession(sessionId: string): ComputerSession {
    const sessions = this.getAllSessions();
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error(`Session ${sessionId} not found.`);
    if (sess.status !== 'ACTIVE') throw new Error(`Only active sessions can be paused.`);

    sess.status = 'PAUSED';
    this.saveSessions(sessions);
    this.setWorkstationStatus(sess.workstationId, 'PAUSED');
    return sess;
  }

  /**
   * Resume a paused session
   */
  static resumeSession(sessionId: string): ComputerSession {
    const sessions = this.getAllSessions();
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error(`Session ${sessionId} not found.`);
    if (sess.status !== 'PAUSED') throw new Error(`Only paused sessions can be resumed.`);

    sess.status = 'ACTIVE';
    this.saveSessions(sessions);
    this.setWorkstationStatus(sess.workstationId, 'ACTIVE');
    return sess;
  }

  /**
   * End session and finalize billing charge
   */
  static endSession(sessionId: string): ComputerSession {
    const sessions = this.getAllSessions();
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error(`Session ${sessionId} not found.`);
    if (sess.status === 'COMPLETED' || sess.status === 'CANCELLED') {
      return sess;
    }

    const now = new Date().toISOString();
    sess.endedAt = now;
    const { durationMinutes, charge } = this.calculateSessionCharge(sess, now);
    sess.durationMinutes = durationMinutes;
    sess.calculatedCharge = charge;
    sess.status = 'COMPLETED';

    this.saveSessions(sessions);

    // Free workstation back to IDLE
    const stations = this.getWorkstations();
    const ws = stations.find((w) => w.id === sess.workstationId);
    if (ws) {
      ws.status = 'IDLE';
      ws.currentSessionId = null;
      this.saveWorkstations(stations);
    }

    return sess;
  }

  /**
   * Manually terminate or cancel a session
   */
  static cancelSession(sessionId: string, reason: string): ComputerSession {
    const sessions = this.getAllSessions();
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) throw new Error(`Session ${sessionId} not found.`);

    sess.status = 'CANCELLED';
    sess.endedAt = new Date().toISOString();
    sess.notes = `${sess.notes ? sess.notes + ' | ' : ''}CANCELLED: ${reason}`;

    this.saveSessions(sessions);
    this.setWorkstationStatus(sess.workstationId, 'IDLE');
    return sess;
  }

  /**
   * Link billed invoice ID to completed session
   */
  static billSession(sessionId: string, invoiceId: string): void {
    const sessions = this.getAllSessions();
    const sess = sessions.find((s) => s.id === sessionId);
    if (sess) {
      sess.billedInvoiceId = invoiceId;
      this.saveSessions(sessions);
    }
  }

  /**
   * Recovery on restart: reconcile orphaned workstation statuses
   */
  static recoverSessionsOnStartup(): { recoveredActive: number; resetStations: number } {
    const stations = this.getWorkstations();
    const activeSessions = this.getActiveSessions();

    let recoveredActive = 0;
    let resetStations = 0;

    stations.forEach((ws) => {
      const match = activeSessions.find((s) => s.workstationId === ws.id);
      if (match) {
        ws.status = match.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE';
        ws.currentSessionId = match.id;
        recoveredActive++;
      } else if (ws.status === 'ACTIVE' || ws.status === 'PAUSED') {
        // Station had active status but session not found in active list -> reset to IDLE
        ws.status = 'IDLE';
        ws.currentSessionId = null;
        resetStations++;
      }
    });

    this.saveWorkstations(stations);
    return { recoveredActive, resetStations };
  }
}
