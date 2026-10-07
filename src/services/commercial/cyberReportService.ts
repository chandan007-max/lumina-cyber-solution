import { Invoice, JobItem } from '../../types';
import { StorageService } from '../storage';
import { SessionService } from './sessionService';

export interface DailySalesSummary {
  date: string;
  totalTransactions: number;
  grossSales: number;
  totalDiscount: number;
  totalTax: number;
  netSales: number;
  totalPaid: number;
  totalDue: number;
  paymentMethodBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  operatorBreakdown: Record<string, { count: number; total: number }>;
}

export interface ServiceWiseSummary {
  category: string;
  itemCount: number;
  totalRevenue: number;
}

export interface ComputerUsageSummary {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalDurationMinutes: number;
  totalRevenue: number;
  averageSessionMinutes: number;
}

export class CyberReportService {
  /**
   * Aggregate daily sales report from invoices
   */
  static getDailySalesReport(dateStr: string = new Date().toISOString().split('T')[0]): DailySalesSummary {
    const invoices = StorageService.getInvoices().filter((i) => i.date.startsWith(dateStr));

    let grossSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let netSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const paymentMethodBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const operatorBreakdown: Record<string, { count: number; total: number }> = {};

    invoices.forEach((inv) => {
      grossSales += inv.subtotal;
      totalDiscount += inv.discount;
      totalTax += inv.tax;
      netSales += inv.total;
      totalPaid += inv.paid;
      totalDue += inv.balance;

      // Payment method
      const method = inv.paymentMethod || 'Cash';
      paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + inv.paid;

      // Operator
      const op = inv.staff || 'Default Operator';
      if (!operatorBreakdown[op]) {
        operatorBreakdown[op] = { count: 0, total: 0 };
      }
      operatorBreakdown[op].count += 1;
      operatorBreakdown[op].total += inv.total;

      // Category breakdown from items
      (inv.items || []).forEach((item) => {
        const cat = item.category || 'Other';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + item.total;
      });
    });

    return {
      date: dateStr,
      totalTransactions: invoices.length,
      grossSales,
      totalDiscount,
      totalTax,
      netSales,
      totalPaid,
      totalDue,
      paymentMethodBreakdown,
      categoryBreakdown,
      operatorBreakdown,
    };
  }

  /**
   * Aggregate computer / internet session usage metrics
   */
  static getComputerUsageReport(): ComputerUsageSummary {
    const sessions = SessionService.getAllSessions();
    const completed = sessions.filter((s) => s.status === 'COMPLETED');
    const active = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');

    const totalDurationMinutes = completed.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalRevenue = completed.reduce((sum, s) => sum + s.calculatedCharge, 0);

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      activeSessions: active.length,
      totalDurationMinutes,
      totalRevenue,
      averageSessionMinutes: completed.length > 0 ? Math.round(totalDurationMinutes / completed.length) : 0,
    };
  }

  /**
   * Mathematical verification: REPORT TOTALS === RAW TRANSACTION DATA
   */
  static verifyReportTotalsIntegrity(invoices: Invoice[]): {
    invoiceCount: number;
    rawItemTotal: number;
    subtotalSum: number;
    paidSum: number;
    balanceSum: number;
    isBalanced: boolean;
    discrepancy: number;
  } {
    let rawItemTotal = 0;
    let subtotalSum = 0;
    let paidSum = 0;
    let balanceSum = 0;

    invoices.forEach((inv) => {
      subtotalSum += inv.subtotal;
      paidSum += inv.paid;
      balanceSum += inv.balance;
      (inv.items || []).forEach((it) => {
        rawItemTotal += it.total;
      });
    });

    // In a balanced invoice: subtotal - discount + tax === paid + balance
    const totalDueAndPaid = paidSum + balanceSum;
    const isBalanced = rawItemTotal === subtotalSum;
    const discrepancy = Math.abs(rawItemTotal - subtotalSum);

    return {
      invoiceCount: invoices.length,
      rawItemTotal,
      subtotalSum,
      paidSum,
      balanceSum,
      isBalanced,
      discrepancy,
    };
  }
}
