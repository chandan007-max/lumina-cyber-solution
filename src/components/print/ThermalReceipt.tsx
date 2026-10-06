import React from 'react';
import { BusinessConfig, Invoice, JobItem } from '../../types';
import { NiLLogo } from '../common/NiLLogo';
import { ThermalConfig, DEFAULT_THERMAL_CONFIG } from './thermalConfig';
import { ThermalCalibrationPattern } from './ThermalCalibrationPattern';

interface ThermalReceiptProps {
  config: BusinessConfig;
  invoice?: Invoice;
  job?: JobItem;
  mode?: 'invoice' | 'job_token' | 'payment_slip';
  qrDataUrl?: string;
  thermalConfig?: ThermalConfig;
  isTestMode?: boolean;
  isCalibrationMode?: boolean;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  config,
  invoice,
  job,
  mode = 'invoice',
  qrDataUrl,
  thermalConfig = DEFAULT_THERMAL_CONFIG,
  isTestMode = false,
  isCalibrationMode = false,
}) => {
  const paperWidthMm = thermalConfig.paperWidthMm || 58;
  const printableWidthMm = thermalConfig.printableWidthMm || 48;
  const leftOffsetMm = thermalConfig.leftOffsetMm ?? 0;
  const totalDots = Math.round((printableWidthMm * (thermalConfig.dpi || 203)) / 25.4);

  // Normalized variables for thermal receipt
  const docId = invoice ? invoice.id : job ? job.id : 'DOC-000';
  const docDate = invoice ? invoice.date : job ? job.createdAt : new Date().toISOString();
  const customerName = invoice ? invoice.customer.name : job ? job.customerName : 'Walk-in Customer';
  const customerPhone = invoice ? invoice.customer.phone : job ? job.customerPhone : '';
  const total = invoice ? invoice.total : job ? job.totalAmount : 0;
  const paid = invoice ? invoice.paid : job ? job.advancePaid : 0;
  const balance = invoice ? invoice.balance : job ? job.balanceDue : 0;
  const paymentMethod = invoice ? invoice.paymentMethod : job?.paymentHistory[0]?.method || 'Cash';
  const staffName = invoice?.staff || 'Sumit';

  const isPaymentSlip =
    mode === 'payment_slip' ||
    Boolean(
      invoice?.items?.some(
        (it) =>
          it.description.toLowerCase().includes('due payment') ||
          it.description.toLowerCase().includes('settlement') ||
          (it.category === 'Other' && it.unit === 'payment')
      )
    );

  const shopAddress = config.address?.includes('Sabujer Hat')
    ? 'Digha, Sabujer Hat'
    : (config.address || 'Digha, Sabujer Hat');

  return (
    <div className="thermal-root-wrapper w-full flex flex-col items-center">
      {/* =======================================================
          17. VISUAL DEBUG MODE (thermalDebug = true)
          Visible on screen for alignment inspection; hidden from print
          ======================================================= */}
      {thermalConfig.thermalDebug && (
        <div
          className="no-print mb-3 select-none text-left bg-slate-900 text-emerald-400 p-2.5 rounded-lg border border-emerald-500/40 font-mono text-[9.5px] shadow-lg animate-in fade-in"
          style={{ width: `${paperWidthMm}mm`, maxWidth: `${paperWidthMm}mm` }}
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1 font-bold text-white">
            <span>58MM HORIZONTAL CALIBRATION DEBUG</span>
            <span className="text-amber-400">ACTIVE</span>
          </div>

          <div className="space-y-0.5 text-[9px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Paper roll width:</span>
              <span className="font-bold text-white">{paperWidthMm}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Printable width:</span>
              <span className="font-bold text-white">{printableWidthMm}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Left origin offset:</span>
              <span className="font-bold text-amber-300">
                {leftOffsetMm >= 0 ? `+${leftOffsetMm}` : leftOffsetMm}mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution & Dots:</span>
              <span className="font-bold text-white">{thermalConfig.dpi || 203} DPI ({totalDots} dots)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Right unused edge:</span>
              <span className="font-bold text-slate-300">
                {(paperWidthMm - printableWidthMm - leftOffsetMm).toFixed(1)}mm
              </span>
            </div>
          </div>

          {/* ASCII Origin Visualizer */}
          <div className="mt-2 pt-1 border-t border-slate-700/80 font-mono text-[8px] text-amber-300 leading-tight">
            <div>
              {leftOffsetMm > 0 ? ' '.repeat(Math.min(20, Math.round(leftOffsetMm * 1.5))) : ''}
              PRINT ORIGIN ({leftOffsetMm}mm)
            </div>
            <div>
              {leftOffsetMm > 0 ? ' '.repeat(Math.min(20, Math.round(leftOffsetMm * 1.5))) : ''}
              |
            </div>
            <div>
              {leftOffsetMm > 0 ? ' '.repeat(Math.min(20, Math.round(leftOffsetMm * 1.5))) : ''}
              V
            </div>
            <div className="text-slate-300">
              +{'-'.repeat(Math.min(30, Math.round(printableWidthMm * 0.6)))}+
            </div>
            <div className="text-emerald-400 font-bold">
              | PRINTABLE AREA ({printableWidthMm}mm) |
            </div>
            <div className="text-slate-300">
              +{'-'.repeat(Math.min(30, Math.round(printableWidthMm * 0.6)))}+
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          8. PHYSICAL 58MM PRINT CONTAINER
          Controlled Left Origin, No Automatic Centering
          ======================================================= */}
      <div
        className="thermal-page"
        style={{
          width: `${paperWidthMm}mm`,
          maxWidth: `${paperWidthMm}mm`,
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          textAlign: 'left',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Dedicated 58mm Thermal Receipt Content (Strictly Left Origin with leftOffsetMm & 90% Calibrated Scale) */}
        <div
          id="printable-receipt-content"
          className="thermal-receipt bg-white text-black font-mono leading-tight select-text"
          style={{
            width: `${printableWidthMm}mm`,
            maxWidth: `${printableWidthMm}mm`,
            marginLeft: `${leftOffsetMm}mm`,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,
            padding: '0.5mm 0.5mm 2.5mm 0.5mm',
            boxSizing: 'border-box',
            overflow: 'hidden',
            textAlign: 'left',
            color: '#000000',
            letterSpacing: '0.01em',
            fontFamily: "'JetBrains Mono', 'Courier New', Courier, Consolas, monospace",
            fontWeight: thermalConfig.deepBlack ? 700 : 600,
            zoom: thermalConfig.printScale || 0.90,
            transformOrigin: 'top left',
          }}
        >
          {isCalibrationMode ? (
            /* =======================================================
               3 & 4. 58MM PRINTER CALIBRATION MODE
               ======================================================= */
            <ThermalCalibrationPattern
              thermalConfig={thermalConfig}
              businessName={config.businessName}
            />
          ) : isTestMode ? (
            /* =======================================================
               DIAGNOSTIC TEST RECEIPT (Requirements 14 & 19)
               ======================================================= */
            <div className="space-y-1.5 text-center text-black py-0.5" style={{ boxSizing: 'border-box', width: '100%' }}>
              {/* Header */}
              <div className="border-b-2 border-dashed border-black pb-1.5 space-y-0.5">
                <div className="text-[13px] font-black uppercase leading-tight tracking-tight">
                  {config.businessName || 'NIL PRINTERS'}
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider">
                  58MM THERMAL TEST RECEIPT
                </div>
                <div className="text-[8px] font-bold">
                  Print Origin: {leftOffsetMm}mm · Width: {printableWidthMm}mm ({totalDots} Dots)
                </div>
              </div>

              {/* Character & Number Verification Pattern */}
              <div className="text-left text-[9.5px] space-y-1 border-b-2 border-dashed border-black py-1.5 font-mono">
                <div className="leading-snug break-all font-bold">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                </div>
                <div className="leading-snug break-all font-bold">
                  abcdefghijklmnopqrstuvwxyz
                </div>
                <div className="leading-snug font-black">
                  0123456789 · ₹ · % · &amp; · /
                </div>
              </div>

              {/* Test Sample Items Table */}
              <div className="border-b-2 border-dashed border-black py-1.5 w-full">
                <div className="flex justify-between font-black text-[9.5px] border-b border-black pb-0.5 mb-1 uppercase w-full">
                  <span className="flex-1 min-w-0 text-left pr-1">ITEM</span>
                  <span className="shrink-0 text-right">AMOUNT</span>
                </div>
                <div className="space-y-1 text-[10px] text-left w-full">
                  <div className="flex justify-between w-full">
                    <span className="flex-1 min-w-0 truncate pr-1">Flex Printing</span>
                    <span className="font-mono font-black shrink-0 text-right">₹120</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span className="flex-1 min-w-0 truncate pr-1">Photocopy</span>
                    <span className="font-mono font-black shrink-0 text-right">₹20</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span className="flex-1 min-w-0 truncate pr-1">Color Print</span>
                    <span className="font-mono font-black shrink-0 text-right">₹50</span>
                  </div>
                </div>
                <div className="border-t border-black mt-1 pt-0.5 space-y-0.5 text-[10px] w-full">
                  <div className="flex justify-between font-bold w-full">
                    <span>SUBTOTAL</span>
                    <span className="font-mono font-black text-right shrink-0">₹190</span>
                  </div>
                  <div className="flex justify-between font-black text-[11px] border-t border-dashed border-black pt-0.5 w-full">
                    <span>NET TOTAL</span>
                    <span className="font-mono font-black text-right shrink-0">₹190</span>
                  </div>
                </div>
              </div>

              {/* Test QR Code */}
              {qrDataUrl && (
                <div className="py-1 text-center border-b-2 border-dashed border-black">
                  <div className="p-1 bg-white border border-black inline-block" style={{ width: '32mm', maxWidth: '32mm' }}>
                    <img
                      src={qrDataUrl}
                      alt="Test QR"
                      className="w-full h-auto block mx-auto"
                      style={{
                        imageRendering: 'pixelated',
                        maxWidth: '30mm',
                        maxHeight: '30mm',
                      }}
                    />
                  </div>
                  <div className="text-[8.5px] font-bold mt-0.5">UPI QR SCANNABLE TEST</div>
                </div>
              )}

              {/* Test Footer */}
              <div className="pt-1 text-center space-y-0.5">
                <div className="text-[10px] font-black">Thank You!</div>
                <div className="text-[8px]">Time: {new Date().toLocaleTimeString('en-IN')}</div>
                <div className="text-[8px] font-bold border-t border-black pt-0.5">
                  HORIZONTAL ORIGIN CALIBRATED
                </div>
              </div>
            </div>
          ) : (
            /* =======================================================
               STANDARD 58MM THERMAL INVOICE / SLIP (Calibrated Left Origin)
               ======================================================= */
            <div className="space-y-1 text-black" style={{ boxSizing: 'border-box', width: '100%' }}>
              {/* Header: Business Identity */}
              <div className="text-center pb-1.5 border-b-2 border-dashed border-black space-y-0.5">
                {thermalConfig.logoMode !== 'none' && (
                  <div className="flex justify-center mb-1">
                    <NiLLogo
                      logoUrl={config.logoUrl}
                      size="sm"
                      variant="icon"
                      monochrome={true}
                    />
                  </div>
                )}
                <div className="font-black uppercase text-[13px] tracking-tight leading-tight break-words">
                  {config.businessName || 'NIL PRINTERS'}
                </div>
                {config.tagline && (
                  <div className="text-[9.5px] font-bold leading-tight break-words">
                    {config.tagline}
                  </div>
                )}
                <div className="text-[9px] font-bold leading-tight break-words">
                  {shopAddress}
                </div>
                {config.phones && config.phones[0] && (
                  <div className="text-[9px] font-bold leading-tight break-words">
                    Ph: {config.phones.join(', ')} {config.contactPerson ? `(${config.contactPerson})` : ''}
                  </div>
                )}
                {config.gstin && (
                  <div className="text-[9px] font-black leading-tight break-words">
                    GSTIN: {config.gstin}
                  </div>
                )}
              </div>

              {/* Document Title Badge */}
              <div
                className="my-1.5 py-0.5 px-1 text-center font-black tracking-wider uppercase text-white bg-black text-[10px] rounded-xs"
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                }}
              >
                {mode === 'job_token'
                  ? 'JOB WORK ORDER'
                  : isPaymentSlip
                  ? 'PAYMENT RECEIPT'
                  : 'TAX INVOICE'}
              </div>

              {/* Invoice Key-Value Information */}
              <div className="text-[9.5px] font-bold space-y-0.5 pb-1 border-b-2 border-dashed border-black w-full">
                <div className="flex justify-between items-start gap-1 w-full">
                  <span className="shrink-0 text-black">Doc No:</span>
                  <span className="font-black text-right font-mono break-all flex-1 min-w-0">{docId}</span>
                </div>
                <div className="flex justify-between items-start gap-1 w-full">
                  <span className="shrink-0 text-black">Date:</span>
                  <span className="text-right shrink-0">
                    {new Date(docDate).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-1 w-full">
                  <span className="shrink-0 text-black">Customer:</span>
                  <span className="font-black text-right break-words flex-1 min-w-0 leading-tight">
                    {customerName}
                  </span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between items-start gap-1 w-full">
                    <span className="shrink-0 text-black">Mobile:</span>
                    <span className="font-black font-mono text-right shrink-0">{customerPhone}</span>
                  </div>
                )}
                {job?.deliveryDeadline && (
                  <div className="flex justify-between items-start gap-1 border border-black p-0.5 font-black mt-0.5 w-full">
                    <span className="shrink-0 text-black">Promised:</span>
                    <span className="text-right shrink-0">
                      {new Date(job.deliveryDeadline).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[8.5px] pt-0.5 border-t border-black w-full">
                  <span className="truncate flex-1 min-w-0 pr-1">Operator: {staffName}</span>
                  <span className="shrink-0 font-bold">Mode: {paymentMethod}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-1 border-b-2 border-dashed border-black w-full">
                {/* Header */}
                <div className="flex justify-between font-black text-[9.5px] border-b border-black pb-0.5 mb-1 uppercase tracking-tight w-full">
                  <span className="flex-1 min-w-0 pr-1 text-left">ITEM / DESCRIPTION</span>
                  <span className="shrink-0 text-right">TOTAL</span>
                </div>

                {/* Items */}
                {invoice ? (
                  <div className="space-y-1.5 w-full">
                    {invoice.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5 text-[10px] w-full">
                        <div className="flex justify-between items-start gap-1 w-full">
                          <div className="flex-1 min-w-0 font-black leading-tight break-words pr-1">
                            {idx + 1}. {it.description}
                          </div>
                          <div className="shrink-0 font-mono font-black text-right tabular-nums whitespace-nowrap">
                            ₹{it.total}
                          </div>
                        </div>
                        {it.details && (
                          <div className="text-[8.5px] font-medium leading-tight pl-2 break-words text-black">
                            {it.details}
                          </div>
                        )}
                        <div className="text-[9px] font-mono pl-2 leading-tight text-black">
                          {it.qty} {it.unit} @ ₹{it.unitPrice}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : job ? (
                  <div className="space-y-1 text-[10px] w-full">
                    <div className="flex justify-between items-start gap-1 w-full">
                      <div className="flex-1 min-w-0 font-black leading-tight break-words pr-1">
                        {job.serviceName}
                      </div>
                      <div className="shrink-0 font-mono font-black text-right tabular-nums whitespace-nowrap">
                        ₹{job.totalAmount}
                      </div>
                    </div>
                    {job.customSpecsSummary && (
                      <div
                        className="text-[8.5px] font-medium leading-tight border border-black p-0.5 mt-0.5 break-words"
                        style={{ width: '100%' }}
                      >
                        {job.customSpecsSummary}
                      </div>
                    )}
                    <div className="text-[9px] font-mono leading-tight">
                      Qty: {job.quantity} Units
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Totals & Financial Ledger */}
              <div className="py-1 space-y-0.5 text-[10px] border-b-2 border-dashed border-black w-full">
                <div className="flex justify-between items-center w-full">
                  <span className="shrink-0">Subtotal:</span>
                  <span className="font-mono font-bold tabular-nums shrink-0 text-right">₹{total}</span>
                </div>
                {invoice && invoice.discount > 0 && (
                  <div className="flex justify-between items-center w-full">
                    <span className="shrink-0">Discount:</span>
                    <span className="font-mono font-bold tabular-nums shrink-0 text-right">-₹{invoice.discount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-black text-[12px] border-t border-black pt-0.5 w-full">
                  <span className="shrink-0">NET TOTAL:</span>
                  <span className="font-mono tabular-nums text-[13px] font-black shrink-0 text-right">₹{total}</span>
                </div>
                <div className="flex justify-between items-center font-bold w-full">
                  <span className="shrink-0">Amount Paid:</span>
                  <span className="font-mono tabular-nums font-black shrink-0 text-right">₹{paid}</span>
                </div>
                <div className="flex justify-between items-center font-black text-[11px] border-t border-black pt-0.5 w-full">
                  <span className="shrink-0">{balance > 0 ? 'BALANCE DUE:' : 'STATUS:'}</span>
                  <span className="font-mono tabular-nums font-black shrink-0 text-right">
                    {balance > 0 ? `₹${balance}` : 'FULLY PAID'}
                  </span>
                </div>
              </div>

              {/* UPI QR Payment Section (Centered relative to actual printable content area) */}
              <div className="py-1 text-center border-b-2 border-dashed border-black w-full">
                <div className="text-[9.5px] font-black uppercase tracking-tight">
                  ★ SCAN &amp; PAY VIA UPI ★
                </div>
                <div className="text-[10px] font-black mt-0.5">
                  {balance > 0 ? `Due Amount: ₹${balance}` : `Total Amount: ₹${total}`}
                </div>

                {qrDataUrl && (
                  <div
                    className="bg-white border border-black inline-block p-1 my-1"
                    style={{
                      width: '32mm',
                      maxWidth: '32mm',
                      boxSizing: 'border-box',
                    }}
                  >
                    <img
                      src={qrDataUrl}
                      alt="UPI Payment QR"
                      className="w-full h-auto block mx-auto"
                      style={{
                        imageRendering: 'pixelated',
                        filter: 'contrast(300%)',
                        maxWidth: '30mm',
                        maxHeight: '30mm',
                      }}
                    />
                  </div>
                )}

                <div className="text-[9.5px] font-mono font-black break-all leading-tight">
                  {config.upiId}
                </div>
                <div className="text-[8px] font-bold mt-0.5">
                  Google Pay · PhonePe · Paytm · BHIM
                </div>
              </div>

              {/* Footer */}
              <div className="pt-1 text-center space-y-0.5 text-[9px] w-full">
                <div className="font-black leading-tight break-words">
                  Thank you for choosing {config.businessName}!
                </div>
                <div className="font-medium leading-tight break-words">
                  Please keep this slip for delivery or collection.
                </div>
                <div className="text-[8px] font-mono font-bold pt-1 border-t border-dashed border-black">
                  NiL POS · 58mm Thermal Slip
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
