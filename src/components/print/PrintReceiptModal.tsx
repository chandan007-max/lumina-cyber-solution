import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Receipt,
  CheckCircle,
  MapPin,
  ShieldCheck,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Zap,
  ExternalLink,
  Download,
  FileDown,
  AlertCircle,
  Eye,
  Crosshair,
  Percent,
  User,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { BusinessConfig, Invoice, JobItem } from '../../types';
import { BusinessConfigService } from '../../services/businessConfig';
import { NiLLogo } from '../common/NiLLogo';
import { ThermalReceipt } from './ThermalReceipt';
import {
  ThermalConfig,
  DEFAULT_THERMAL_CONFIG,
  loadThermalConfig,
  saveThermalConfig,
} from './thermalConfig';
import QRCode from 'qrcode';

export type { ThermalConfig };

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BusinessConfig;
  invoice?: Invoice;
  job?: JobItem;
  mode?: 'invoice' | 'job_token' | 'payment_slip';
  autoPrint?: boolean;
}

// Convert numbers to Indian Rupees in words (e.g. 450 -> Four Hundred Fifty Rupees Only)
function numberToWordsINR(num: number): string {
  if (num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) {
        str += a[n] + ' ';
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
      }
    }
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + inWords(paise) + ' Paise';
  }
  return result + ' Only';
}


export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  config,
  invoice,
  job,
  mode = 'invoice',
  autoPrint = false,
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal80' | 'thermal58' | 'a4'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('nil_printer_format') : null;
      if (saved === 'thermal58' || saved === 'thermal80' || saved === 'a4') {
        return saved as 'thermal80' | 'thermal58' | 'a4';
      }
    } catch (e) {
      // ignore
    }
    if (config.printerMode === 'a4') return 'a4';
    if (config.printerMode === 'thermal80') return 'thermal80';
    return 'thermal58'; // default to 58mm compact thermal as requested
  });

  const handleSetPrintFormat = (format: 'thermal80' | 'thermal58' | 'a4') => {
    setPrintFormat(format);
    setShowTestSlip(false);
    setIsCalibrationMode(false);
    try {
      localStorage.setItem('nil_printer_format', format);
    } catch (e) {
      // ignore
    }
  };

  // Thermal 58mm Deep Black & White configuration state (Calibrated 90% Scale)
  const [thermalConfig, setThermalConfig] = useState<ThermalConfig>(() => loadThermalConfig());

  const [showThermalSettings, setShowThermalSettings] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [showTestSlip, setShowTestSlip] = useState(false);
  const [isCalibrationMode, setIsCalibrationMode] = useState(false);

  const updateThermalConfig = (updates: Partial<ThermalConfig>) => {
    setThermalConfig((prev) => {
      const next = { ...prev, ...updates };
      saveThermalConfig(next);
      return next;
    });
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printBlockedNotice, setPrintBlockedNotice] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [testItemCount, setTestItemCount] = useState<number | null>(null);

  // Multi-Item Test Invoice Generator (Requirement 18: verify 1, 3, 5, 10, 20 items increase height only)
  const buildMultiItemTestInvoice = (count: number): Invoice => {
    const sampleCatalog = [
      { desc: 'Flex Printing (Star Flex 340 GSM)', details: '3x2 sq.ft with eyelet finishing', qty: 6, unit: 'sq.ft', rate: 40 },
      { desc: 'Xerox Document Copy (B&W Double Sided)', details: 'Legal 75 GSM paper bulk job', qty: 20, unit: 'pages', rate: 2 },
      { desc: 'Digital Color Printout (A4 Heavy Art Board)', details: 'Front & back glossy laminate', qty: 4, unit: 'pages', rate: 25 },
      { desc: 'Visiting Cards (Matte Laminated 350 GSM)', details: 'Double sided with rounded corners', qty: 100, unit: 'cards', rate: 1.5 },
      { desc: 'Urgent Online PAN Card Application', details: 'EPFO & Aadhaar e-KYC linked', qty: 1, unit: 'service', rate: 110 },
      { desc: 'High-Res Photo Frame Wooden 8x10', details: 'Synthetic wooden showcase glass frame', qty: 1, unit: 'frame', rate: 350 },
      { desc: 'Restaurant Bill Book (Carbonless NCR)', details: '1/8 Demy 50 duplicates serial bound', qty: 4, unit: 'books', rate: 65 },
      { desc: 'Smart PVC Aadhaar Card Printing', details: 'Official UIDAI plastic barcode laminate', qty: 1, unit: 'card', rate: 50 },
      { desc: 'Jumbo A3 Color Blueprint Xerox', details: 'Engineering map print high-res', qty: 3, unit: 'sheets', rate: 45 },
      { desc: 'Synthetic Lanyard ID Card for Staff', details: 'Sublimation ribbon with clip hook', qty: 5, unit: 'units', rate: 60 },
      { desc: 'Passport Photo Print (8 copies)', details: 'Glossy instant cutting pack', qty: 1, unit: 'pack', rate: 50 },
      { desc: 'A4 Document Lamination 125 Micron', details: 'Thermal pouch waterproof heat seal', qty: 6, unit: 'sheets', rate: 15 },
      { desc: 'Stamp Size Photos (16 copies)', details: 'Matte paper official document photo', qty: 1, unit: 'pack', rate: 60 },
      { desc: 'Spiral Binding with Transparent Cover', details: 'Wire-O coil up to 100 pages', qty: 2, unit: 'books', rate: 35 },
      { desc: 'Custom Rubber Stamp (Pre-Inked)', details: 'Address seal round 25mm blue ink', qty: 1, unit: 'stamp', rate: 220 },
      { desc: 'Brochure Tri-Fold Color Print', details: 'Art paper 170 GSM crease fold', qty: 50, unit: 'copies', rate: 8 },
      { desc: 'EPFO Online Claim Submission', details: 'PF withdrawal portal service charge', qty: 1, unit: 'service', rate: 150 },
      { desc: 'Plastic ID Badge Pouch & Clip', details: 'Heavy horizontal vinyl card holder', qty: 10, unit: 'pcs', rate: 10 },
      { desc: 'Vinyl Sticker Sheet Cut (A4)', details: 'Waterproof self-adhesive laser vinyl', qty: 5, unit: 'sheets', rate: 40 },
      { desc: 'Certificate Color Print Glossy', details: 'Gold border 300 GSM royal card', qty: 2, unit: 'copies', rate: 30 },
    ];

    const items = Array.from({ length: count }, (_, idx) => {
      const s = sampleCatalog[idx % sampleCatalog.length];
      return {
        description: s.desc,
        details: s.details,
        qty: s.qty,
        unit: s.unit,
        unitPrice: s.rate,
        total: Math.round(s.qty * s.rate),
        category: 'Printing' as any,
      };
    });

    const sumTotal = items.reduce((acc, curr) => acc + curr.total, 0);

    return {
      id: `NP-TEST-${count}ITEMS`,
      date: new Date().toISOString(),
      type: 'quick',
      customer: {
        id: 'cust-test',
        name: 'Walk-in Customer (Multi-Item Test)',
        phone: '9800099934',
        address: 'New Digha Sea Beach, Sabujer Hat',
        gstin: '19AAEPN1234F1Z5',
      },
      items,
      subtotal: sumTotal,
      tax: 0,
      total: sumTotal,
      discount: 0,
      paid: sumTotal,
      balance: 0,
      paymentMethod: 'Cash',
      staff: 'Sumit (Owner)',
      notes: `58mm thermal length test (${count} items)`,
    };
  };

  const activeInvoice = testItemCount ? buildMultiItemTestInvoice(testItemCount) : invoice;

  // Normalized variables for receipt
  const docId = activeInvoice ? activeInvoice.id : job ? job.id : 'DOC-000';
  const docDate = activeInvoice ? activeInvoice.date : job ? job.createdAt : new Date().toISOString();
  const customerName = activeInvoice ? activeInvoice.customer.name : job ? job.customerName : 'Walk-in Customer';
  const customerPhone = activeInvoice ? activeInvoice.customer.phone : job ? job.customerPhone : '';
  const customerAddress = activeInvoice?.customer.address || job?.customerAddress || '';
  const customerGstin = activeInvoice?.customer.gstin || job?.customerGstin || '';

  const total = activeInvoice ? activeInvoice.total : job ? job.totalAmount : 0;
  const paid = activeInvoice ? activeInvoice.paid : job ? job.advancePaid : 0;
  const balance = activeInvoice ? activeInvoice.balance : job ? job.balanceDue : 0;
  const paymentMethod = activeInvoice ? activeInvoice.paymentMethod : job?.paymentHistory[0]?.method || 'Cash';
  const notes = activeInvoice ? activeInvoice.notes : job ? job.notes : '';
  const staffName = activeInvoice?.staff || 'Sumit';

  const isPaymentSlip =
    mode === 'payment_slip' ||
    Boolean(
      activeInvoice?.items?.some(
        (it) =>
          it.description.toLowerCase().includes('due payment') ||
          it.description.toLowerCase().includes('settlement') ||
          (it.category === 'Other' && it.unit === 'payment')
      )
    );

  // Address clean display & Historical Business Snapshot resolution
  const defaultProfile = BusinessConfigService.getConfig()?.profile;
  const effectiveProfile = activeInvoice?.businessProfileSnapshot || job?.businessProfileSnapshot || config?.profile || defaultProfile;
  const effectiveBusinessName = effectiveProfile?.displayName || effectiveProfile?.businessName || config?.businessName || defaultProfile?.businessName || 'LUMINA CYBER SOLUTION';
  const effectiveTagline = effectiveProfile?.tagline || config?.tagline || '';
  const effectiveGstin = effectiveProfile?.gstin || (config?.gst?.enabled ? config.gst.gstin || config.gstin : undefined);
  const effectivePhones = (effectiveProfile && [effectiveProfile.mobile, effectiveProfile.alternateMobile].filter(Boolean).length > 0)
    ? ([effectiveProfile.mobile, effectiveProfile.alternateMobile].filter(Boolean) as string[])
    : (config?.phones || []);
  const effectiveEmails = (effectiveProfile && [effectiveProfile.email, effectiveProfile.alternateEmail].filter(Boolean).length > 0)
    ? ([effectiveProfile.email, effectiveProfile.alternateEmail].filter(Boolean) as string[])
    : (config?.emails || []);
  const effectiveLogoUrl = effectiveProfile?.logoUrl || config?.logoUrl;
  const effectiveAddress = effectiveProfile
    ? [effectiveProfile.addressLine1, effectiveProfile.addressLine2, effectiveProfile.city, effectiveProfile.state]
        .filter(Boolean)
        .join(', ') || config?.address || ''
    : config?.address || '';

  const shopAddress = effectiveAddress;
  const effectivePincode = effectiveProfile?.pincode || config?.pincode || '';
  const effectiveOwner = effectiveProfile?.ownerName || effectiveProfile?.contactPerson || config?.contactPerson || 'Contact';

  // UPI QR String
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(
    config.upiId
  )}%26pn%3D${encodeURIComponent(config.businessName)}%26am%3D${balance > 0 ? balance : total}%26cu%3DINR`;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate instant offline UPI Payment QR code
  useEffect(() => {
    const payAmount = balance > 0 ? balance : total;
    const upiPayload = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(
      config.upiQrName || config.businessName
    )}&am=${payAmount}&cu=INR&tn=${encodeURIComponent(docId)}`;

    QRCode.toDataURL(upiPayload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.warn('QRCode generation failed, using fallback:', err);
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiPayload)}`
        );
      });
  }, [config.upiId, config.upiQrName, config.businessName, balance, total, docId]);

  // Generate pristine standalone HTML document for iframe or standalone window printing
  const generatePrintDocumentHtml = (receiptNode: HTMLElement, autoPrintScript = false) => {
    const isA4 = printFormat === 'a4';
    const is58 = printFormat === 'thermal58';
    const pageSize = isA4 ? 'A4 portrait' : is58 ? '58mm auto' : '80mm auto';
    const maxWidth = isA4 ? '800px' : is58 ? `${thermalConfig.printableWidthMm || 48}mm` : '72mm';

    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docId} - ${config.businessName}</title>
  ${headStyles}
  <style>
    @page {
      size: ${pageSize} !important;
      margin: ${isA4 ? '12mm' : '0'} !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: ${isA4 ? '#0f172a' : '#000000'} !important;
      width: ${is58 ? '58mm' : '100%'} !important;
      min-height: 100% !important;
      text-align: ${is58 ? 'left' : 'center'} !important;
      font-family: ${
        isA4
          ? "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          : "'JetBrains Mono', 'Courier New', Courier, Consolas, monospace"
      } !important;
      -webkit-font-smoothing: ${isA4 ? 'antialiased' : 'none'};
    }
    .no-print {
      display: none !important;
    }
    ${
      is58
        ? `
    .thermal-page {
      width: 58mm !important;
      max-width: 58mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      text-align: left !important;
    }
    .thermal-receipt, .thermal-receipt * {
      box-sizing: border-box !important;
    }
    .thermal-receipt {
      width: ${thermalConfig.printableWidthMm || 48}mm !important;
      max-width: ${thermalConfig.printableWidthMm || 48}mm !important;
      margin-left: ${thermalConfig.leftOffsetMm || 0}mm !important;
      margin-right: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding: 0.5mm 0.5mm 2.5mm 0.5mm !important;
      overflow: hidden !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      zoom: ${thermalConfig.printScale || 0.90} !important;
      -webkit-transform-origin: top left !important;
      transform-origin: top left !important;
    }`
        : isA4
        ? `
    .print-surface {
      margin: 0 auto !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #0f172a !important;
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 !important;
    }`
        : `
    .print-surface {
      margin: 0 auto !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      max-width: 72mm !important;
      width: 72mm !important;
      padding: 2mm 3mm 4mm 3mm !important;
    }`
    }
    ${
      !isA4
        ? `
    .thermal-page *, .thermal-receipt * {
      color: #000000 !important;
      border-color: #000000 !important;
    }`
        : ''
    }
  </style>
</head>
<body style="background: #ffffff; margin: 0; padding: 0; width: ${is58 ? '58mm' : '100%'}; text-align: ${is58 ? 'left' : 'center'};">
  <div class="${is58 ? 'thermal-page' : 'print-document-wrapper'}" style="width: ${is58 ? '58mm' : '100%'}; margin: 0 auto; padding: 0;">
    ${receiptNode.outerHTML}
  </div>
  ${
    autoPrintScript
      ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 150);
    });
  </script>`
      : ''
  }
</body>
</html>`;
  };

  // Open slip in fresh browser tab & print (bypasses iframe sandbox restrictions completely)
  const handleOpenNewTabPrint = () => {
    const receiptEl = document.getElementById('printable-receipt-content');
    if (!receiptEl) return;

    const htmlDoc = generatePrintDocumentHtml(receiptEl, true);
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    setPrintBlockedNotice(null);
  };

  // Direct A4 Vector PDF Generation & Download
  const handleDownloadPdf = async () => {
    const receiptEl = document.getElementById('printable-receipt-content');
    if (!receiptEl) return;
    setIsGeneratingPdf(true);

    try {
      // Clone element and strip modal shadow/border so html2canvas renders clean margins with zero black line at top
      const clone = receiptEl.cloneNode(true) as HTMLElement;
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.margin = '0';
      clone.style.borderRadius = '0';
      clone.style.width = '794px'; // Standard A4 pixel width at 96 DPI
      clone.style.maxWidth = '794px';
      clone.style.background = '#ffffff';

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '794px';
      tempContainer.style.background = '#ffffff';
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const opt = {
        margin: [12, 12, 12, 12] as [number, number, number, number],
        filename: `${docId}_Tax_Invoice.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          scrollY: 0,
          scrollX: 0,
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(tempContainer);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.warn('html2pdf generation error, falling back to html export:', err);
      handleDownloadSlip();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save printable slip as offline HTML file
  const handleDownloadSlip = () => {
    const receiptEl = document.getElementById('printable-receipt-content');
    if (!receiptEl) return;

    const htmlDoc = generatePrintDocumentHtml(receiptEl, false);
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${docId}_${printFormat}_slip.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Main Print Handler (Injects active @page CSS, invokes native print, and falls back gracefully)
  const handlePrint = () => {
    setIsPrinting(true);
    setPrintBlockedNotice(null);

    const receiptEl = document.getElementById('printable-receipt-content');
    if (!receiptEl) {
      setIsPrinting(false);
      return;
    }

    const isA4 = printFormat === 'a4';
    const is58 = printFormat === 'thermal58';
    const activeWidth = is58 ? `${thermalConfig.printableWidthMm || 48}mm` : isA4 ? '800px' : '72mm';
    const pageSize = isA4 ? 'A4 portrait' : is58 ? '58mm auto' : '80mm auto';

    // Inject active @page & @media print styles into document head
    let printStyleEl = document.getElementById('nil-active-print-style') as HTMLStyleElement;
    if (!printStyleEl) {
      printStyleEl = document.createElement('style');
      printStyleEl.id = 'nil-active-print-style';
      document.head.appendChild(printStyleEl);
    }

    printStyleEl.innerHTML = `
      @page {
        size: ${pageSize} !important;
        margin: ${isA4 ? '8mm' : '0'} !important;
      }
      @media print {
        html, body, #root, #root > div {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          display: block !important;
          position: static !important;
          width: ${is58 ? '58mm' : '100%'} !important;
        }
        #root > div > *:not(.print-modal-backdrop) {
          display: none !important;
        }
        header, aside, nav, main, footer, .no-print {
          display: none !important;
        }
        .print-modal-backdrop {
          position: static !important;
          display: block !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          width: 100% !important;
          height: auto !important;
          max-height: none !important;
          inset: auto !important;
        }
        .print-modal-container {
          display: block !important;
          position: static !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          background: transparent !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .print-viewport-container {
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        ${
          is58
            ? `
        .thermal-page {
          width: 58mm !important;
          max-width: 58mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          text-align: left !important;
        }
        .thermal-receipt, .thermal-receipt * {
          box-sizing: border-box !important;
        }
        .thermal-receipt {
          width: ${activeWidth} !important;
          max-width: ${activeWidth} !important;
          margin-left: ${thermalConfig.leftOffsetMm || 0}mm !important;
          margin-right: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding: 0.5mm 0.5mm 2.5mm 0.5mm !important;
          overflow: hidden !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
          zoom: ${thermalConfig.printScale || 0.90} !important;
          -webkit-transform-origin: top left !important;
          transform-origin: top left !important;
        }`
            : isA4
            ? `
        .print-surface {
          display: block !important;
          margin: 0 auto !important;
          max-width: 800px !important;
          width: 100% !important;
          padding: 4mm !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }`
            : `
        .print-surface {
          display: block !important;
          margin: 0 auto !important;
          max-width: 72mm !important;
          width: 72mm !important;
          padding: 2mm 3mm 4mm 3mm !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }`
        }
        * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          border-color: #000000 !important;
        }
        .bg-black {
          background-color: #000000 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }
        .bg-black *, .bg-black span, .text-white {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }
      }
    `;

    setTimeout(() => {
      try {
        window.focus();
        window.print();
        setIsPrinting(false);
      } catch (err: any) {
        console.warn('Native window.print() blocked (sandbox environment):', err);
        setIsPrinting(false);
        setPrintBlockedNotice(
          'Browser preview sandbox blocked the native print dialog. Opening receipt in clean tab to print directly...'
        );
        handleOpenNewTabPrint();
      }
    }, 50);
  };

  // Quick 58mm test slip print to verify deep black ink and letter clarity
  const handlePrintTestSlip = () => {
    setShowTestSlip(true);
    setIsTestPrinting(true);
    setTimeout(() => {
      handlePrint();
      setIsTestPrinting(false);
    }, 150);
  };

  // Keyboard shortcut listener for Ctrl+P / Cmd+P
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, printFormat]);

  // Auto trigger print when requested from job or bill creation
  useEffect(() => {
    if (isOpen && autoPrint && (invoice || job)) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, invoice, job]);

  if (!isOpen || (!invoice && !job)) return null;

  return (
    <div className="print-modal-backdrop fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="print-modal-container bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Controls Bar - Hidden during window.print() */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {mode === 'job_token'
                    ? 'Job Order Slip Preview'
                    : isPaymentSlip
                    ? 'Money Receipt & Due Settlement Slip'
                    : 'Bill & Invoice Print Preview'}
                </h3>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                  {docId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Calibrated for thermal slip rolls and laser A4 tax letterheads
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Format toggle: 58mm vs 80mm vs A4 */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetPrintFormat('thermal58')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  printFormat === 'thermal58'
                    ? 'bg-black text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>58mm Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPrintFormat('thermal80')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  printFormat === 'thermal80'
                    ? 'bg-black text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  printFormat === 'a4'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Standard A4</span>
              </button>
            </div>

            {/* 58mm Quick Config & Calibration Toggle */}
            {printFormat === 'thermal58' && (
              <button
                type="button"
                onClick={() => setShowThermalSettings(!showThermalSettings)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  showThermalSettings
                    ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
                title="Configure 58mm Thermal Print Scale (90%), Left Origin & Head Width"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>58mm Calibrate</span>
                {showThermalSettings ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Quick 58mm Test Diagnostic Slip */}
            {printFormat === 'thermal58' && (
              <button
                type="button"
                onClick={handlePrintTestSlip}
                disabled={isTestPrinting || isPrinting}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                title="Print small 58mm test pattern to check ink darkness & letter sharpness"
              >
                {isTestPrinting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Test 58mm</span>
              </button>
            )}

            {/* Horizontal Origin Calibration Ruler Test */}
            {printFormat === 'thermal58' && (
              <button
                type="button"
                onClick={() => {
                  setShowTestSlip(false);
                  setIsCalibrationMode(!isCalibrationMode);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  isCalibrationMode
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
                title="View & print horizontal calibration millimeter grid to measure exact printable origin"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{isCalibrationMode ? 'Invoice View' : 'Calib Ruler'}</span>
              </button>
            )}

            {/* Download A4 PDF Document */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-2xs hover:shadow transition-all cursor-pointer disabled:opacity-75"
              title="Export & download executive A4 tax invoice as PDF file"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-slate-950" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print Primary Button (Directly launches printer dialog) */}
            <button
              onClick={() => handlePrint()}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-98"
              title="Open native printer dialog (Ctrl+P)"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Opening Printer...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print (Ctrl+P)</span>
                </>
              )}
            </button>

            {/* Direct / New Tab Print Fallback (bypasses iframe sandbox restrictions) */}
            <button
              type="button"
              onClick={handleOpenNewTabPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Open print slip in clean browser tab and trigger print - ideal if preview environment blocks native printer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">New Tab Print</span>
              <span className="sm:hidden">Tab</span>
            </button>

            {/* Save Slip Offline */}
            <button
              type="button"
              onClick={handleDownloadSlip}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
              title="Download slip as self-contained HTML file"
            >
              {downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{downloadSuccess ? 'Saved!' : 'Save Slip'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowTestSlip(false);
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sandbox Print Notification Banner (if browser iframe sandbox restricts modals) */}
        {printBlockedNotice && (
          <div className="no-print bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 border-b border-amber-600 animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{printBlockedNotice}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenNewTabPrint}
                className="px-3 py-1 bg-black text-white hover:bg-slate-900 rounded font-black text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open & Print</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintBlockedNotice(null)}
                className="p-1 hover:bg-amber-600/30 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 58mm Calibration & Deep B&W Tuning Drawer */}
        {printFormat === 'thermal58' && showThermalSettings && (
          <div className="no-print bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-5 py-3.5 text-xs animate-in slide-in-from-top-2 duration-150 shrink-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                    <span>58mm Thermal Calibration (90% Scale Reference & Left Origin)</span>
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-black">
                      Calibrated
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Auto-calibrated to 90% scaling so physical print matches without manual browser scale adjustments
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTestSlip(false);
                    setIsCalibrationMode(true);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Open 58mm Millimeter Grid</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-amber-200/80 dark:border-amber-900/60 text-[11px]">
              {/* 1. Print Scaling (Calibrated 90% Default) */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Print Scale (Calibrated):</span>
                </span>
                <div className="inline-flex rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-850 p-0.5 w-full justify-between">
                  {[
                    { label: '85%', val: 0.85 },
                    { label: '90% (Calib)', val: 0.90 },
                    { label: '95%', val: 0.95 },
                    { label: '100%', val: 1.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => updateThermalConfig({ printScale: s.val })}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        (thermalConfig.printScale || 0.90) === s.val
                          ? 'bg-black text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={`${s.label} thermal scaling`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Left Origin Offset */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Left Print Origin:
                </span>
                <div className="inline-flex rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-850 p-0.5 w-full justify-between">
                  {[
                    { label: '-2mm', val: -2 },
                    { label: '0mm (Origin)', val: 0 },
                    { label: '+1mm', val: 1 },
                    { label: '+2mm', val: 2 },
                    { label: '+4mm', val: 4 },
                  ].map((o) => (
                    <button
                      key={o.val}
                      type="button"
                      onClick={() => updateThermalConfig({ leftOffsetMm: o.val })}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        (thermalConfig.leftOffsetMm ?? 0) === o.val
                          ? 'bg-black text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={`${o.label} horizontal origin offset`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Print Head Width */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Print Head Active Width:
                </span>
                <div className="inline-flex rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-850 p-0.5 w-full justify-between">
                  {[
                    { label: '46mm', val: 46 },
                    { label: '48mm (Std)', val: 48 },
                    { label: '50mm', val: 50 },
                    { label: '52mm', val: 52 },
                  ].map((w) => (
                    <button
                      key={w.val}
                      type="button"
                      onClick={() => updateThermalConfig({ printableWidthMm: w.val })}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        (thermalConfig.printableWidthMm || 48) === w.val
                          ? 'bg-black text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                      }`}
                      title={`${w.label} active head width`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Density & Debug Overlays */}
              <div className="flex items-center gap-1.5 pt-4">
                <button
                  type="button"
                  onClick={() => updateThermalConfig({ deepBlack: !thermalConfig.deepBlack })}
                  className={`flex-1 py-1 rounded-lg border font-bold text-[10.5px] cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                    thermalConfig.deepBlack
                      ? 'bg-black text-white border-black shadow-2xs'
                      : 'bg-white dark:bg-slate-850 border-amber-300 dark:border-amber-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Enforces pure 1-bit deep black dots (#000000) with zero grayscale antialiasing"
                >
                  <Check className={`w-3 h-3 ${thermalConfig.deepBlack ? 'opacity-100' : 'opacity-0'}`} />
                  <span>Deep B&W</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateThermalConfig({ thermalDebug: !thermalConfig.thermalDebug })}
                  className={`flex-1 py-1 rounded-lg border font-bold text-[10.5px] cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                    thermalConfig.thermalDebug
                      ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                      : 'bg-white dark:bg-slate-850 border-amber-300 dark:border-amber-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Show visual origin markers and dot specs in preview (hidden from print)"
                >
                  <Check className={`w-3 h-3 ${thermalConfig.thermalDebug ? 'opacity-100' : 'opacity-0'}`} />
                  <span>Debug Visualizer</span>
                </button>
              </div>
            </div>

            {/* Requirement 18: Multi-Item Length Stress Testing */}
            <div className="w-full pt-2 border-t border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>Verify Receipt Vertical Growth:</span>
                <span className="text-[10px] font-normal text-slate-500">(1, 3, 5, 10, 20 items test)</span>
              </div>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTestItemCount(null)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    testItemCount === null
                      ? 'bg-black text-white'
                      : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  Actual Order
                </button>
                {[1, 3, 5, 10, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setTestItemCount(cnt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      testItemCount === cnt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white border border-amber-200 dark:border-amber-800'
                    }`}
                    title={`Simulate invoice with ${cnt} items to verify vertical height expansion with zero horizontal overflow`}
                  >
                    {cnt} {cnt === 1 ? 'Item' : 'Items'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Printable Viewport Container */}
        <div className="print-viewport-container flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-start">
          {isCalibrationMode && (
            <div className="no-print bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold w-full max-w-[340px] mb-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-300 shrink-0" />
                <span>58mm Calibration Grid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="px-2.5 py-1 bg-white text-indigo-950 rounded font-black hover:bg-indigo-50 cursor-pointer shadow-2xs text-[11px]"
                >
                  Print Pattern
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalibrationMode(false)}
                  className="px-2 py-1 bg-indigo-900 text-white rounded font-bold hover:bg-indigo-950 cursor-pointer text-[11px]"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {showTestSlip && (
            <div className="no-print bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold w-full max-w-[340px] mb-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                <span>58mm Thermal Test Strip</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="px-2.5 py-1 bg-white text-emerald-900 rounded font-black hover:bg-emerald-50 cursor-pointer shadow-2xs text-[11px]"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestSlip(false)}
                  className="px-2 py-1 bg-emerald-800 text-white rounded font-bold hover:bg-emerald-900 cursor-pointer text-[11px]"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* 1. Dedicated 58mm Thermal Receipt Layout (48mm Safe Area, 90% Calibrated Scale) */}
          {printFormat === 'thermal58' ? (
            <ThermalReceipt
              config={config}
              invoice={activeInvoice}
              job={job}
              mode={mode}
              qrDataUrl={qrDataUrl || upiQrUrl}
              thermalConfig={thermalConfig}
              isTestMode={showTestSlip}
              isCalibrationMode={isCalibrationMode}
            />
          ) : printFormat === 'thermal80' ? (
            <div
              id="printable-receipt-content"
              className="print-surface bg-white text-black font-mono shadow-2xl rounded-sm border-2 border-black leading-snug transition-all select-text w-full max-w-[340px] text-xs p-4"
              style={{
                color: '#000000',
                letterSpacing: '0.01em',
              }}
            >
              {/* Receipt Top Jagged Notch Accent */}
              <div className="no-print h-1.5 w-full bg-black rounded-full mb-2.5"></div>

              {/* Shop Identity Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-0.5">
                <div className="flex justify-center mb-1.5">
                  <NiLLogo logoUrl={effectiveLogoUrl} size="md" variant="icon" monochrome={true} />
                </div>
                <div className="font-black uppercase text-black text-lg tracking-normal leading-tight">
                  {effectiveBusinessName}
                </div>
                <div className="text-xs text-black font-bold">{effectiveTagline}</div>
                <div className="text-xs font-bold text-black flex items-center justify-center gap-1 text-center">
                  <span className="break-words">{shopAddress}</span>
                </div>
                {effectivePhones[0] && (
                  <div className="text-xs font-bold text-black">
                    Ph: {effectivePhones.join(', ')} ({effectiveOwner})
                  </div>
                )}
                {config.gstin && (
                  <div className="text-xs font-black text-black">GSTIN: {config.gstin}</div>
                )}
              </div>

              {/* Title & Document Badge */}
              <div className="my-2 py-1 text-center font-black tracking-wider uppercase bg-black text-white text-xs rounded-xs">
                {mode === 'job_token'
                  ? '★ JOB WORK ORDER SLIP ★'
                  : isPaymentSlip
                  ? '★ MONEY RECEIPT / SETTLEMENT ★'
                  : '★ CASH / RETAIL INVOICE ★'}
              </div>

              {/* Meta details */}
              <div className="space-y-1 text-xs font-bold text-black py-1.5 border-b-2 border-dashed border-black">
                <div className="flex justify-between">
                  <span>Doc No:</span>
                  <span className="font-mono font-black">{docId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>
                    {new Date(docDate).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="shrink-0">Customer:</span>
                  <span className="font-black text-right break-words">{customerName}</span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between">
                    <span>Mobile:</span>
                    <span className="font-mono font-black">{customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] pt-1 border-t border-black">
                  <span>Operator: {staffName}</span>
                  <span>Mode: {paymentMethod}</span>
                </div>
              </div>

              {/* Items List Table */}
              <div className="py-2 border-b-2 border-dashed border-black">
                <div className="flex justify-between font-black text-xs text-black border-b-2 border-black pb-1 mb-1.5 uppercase tracking-wider">
                  <span>ITEM / DESCRIPTION</span>
                  <span className="text-right">TOTAL</span>
                </div>
                {activeInvoice ? (
                  <div className="space-y-1.5">
                    {activeInvoice.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-black text-black leading-snug flex justify-between gap-1 text-xs">
                          <span className="break-words">{idx + 1}. {it.description}</span>
                          <span className="font-mono font-black tabular-nums text-black shrink-0">₹{it.total}</span>
                        </div>
                        {it.details && (
                          <div className="text-[11px] text-black font-bold pl-2 leading-tight">
                            {it.details}
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-black font-mono font-bold pl-2">
                          <span>{it.qty} {it.unit} @ ₹{it.unitPrice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : job ? (
                  <div className="space-y-1.5">
                    <div className="font-black text-black flex justify-between gap-1 text-xs">
                      <span className="break-words">{job.serviceName}</span>
                      <span className="font-mono font-black tabular-nums text-black shrink-0">₹{job.totalAmount}</span>
                    </div>
                    {job.customSpecsSummary && (
                      <div className="text-[11px] text-black font-bold border border-black p-0.5 rounded-xs">
                        {job.customSpecsSummary}
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-black font-bold pt-0.5">
                      <span>Qty: {job.quantity}</span>
                      <span className="font-mono font-black tabular-nums">₹{job.totalAmount}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Totals & Financials */}
              <div className="py-2 space-y-1 text-xs border-b-2 border-dashed border-black">
                <div className="flex justify-between text-black font-bold">
                  <span>Subtotal:</span>
                  <span className="tabular-nums font-mono font-black">₹{total}</span>
                </div>
                {activeInvoice && activeInvoice.discount > 0 && (
                  <div className="flex justify-between text-black font-bold">
                    <span>Discount:</span>
                    <span className="tabular-nums font-mono font-black">-₹{activeInvoice.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1 text-black">
                  <span>NET TOTAL:</span>
                  <span className="tabular-nums font-mono text-base font-black">₹{total}</span>
                </div>
                <div className="flex justify-between text-black font-bold">
                  <span>Amount Paid:</span>
                  <span className="tabular-nums font-mono font-black">₹{paid}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t-2 border-black text-black">
                  <span>{balance > 0 ? 'BALANCE DUE:' : 'STATUS:'}</span>
                  <span className="tabular-nums font-mono font-black">
                    {balance > 0 ? `₹${balance}` : 'FULLY PAID'}
                  </span>
                </div>
              </div>

              {/* Payment UPI QR Code */}
              <div className="py-2 text-center border-b-2 border-dashed border-black">
                <div className="text-xs font-black text-black uppercase tracking-wider">
                  ★ SCAN & PAY VIA UPI ★
                </div>
                <div className="text-xs font-black text-black mt-0.5">
                  {balance > 0 ? `Pending Due: ₹${balance}` : `Total Amount: ₹${total}`}
                </div>
                <div className="p-1.5 bg-white border-2 border-black inline-block my-1.5">
                  <img
                    src={qrDataUrl || upiQrUrl}
                    alt="UPI Payment QR Code"
                    className="w-28 h-28 mx-auto block"
                    style={{ imageRendering: 'pixelated', filter: 'contrast(300%)' }}
                  />
                </div>
                <div className="text-xs font-mono font-black text-black">{config.upiId}</div>
                <div className="text-[10px] text-black font-bold mt-0.5">
                  Google Pay · PhonePe · Paytm · BHIM · Any UPI
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-2 text-center space-y-1 text-black">
                <div className="text-xs font-black">
                  Thank you for choosing {config.businessName}!
                </div>
                <div className="text-[11px] font-bold">Please keep this slip for job delivery collection.</div>
                <div className="text-[10px] font-mono font-bold pt-1 border-t border-dashed border-black">
                  NiL POS · 80mm Thermal Slip
                </div>
              </div>
            </div>
          ) : (
            /* 2. Professional Grade Executive A4 Tax & Job Order Invoice Layout */
            <div
              id="printable-receipt-content"
              className="print-surface bg-white text-slate-900 font-sans shadow-md print:shadow-none rounded-xl border border-slate-200/80 print:border-none w-full max-w-[800px] min-h-[1120px] p-8 md:p-10 text-xs leading-normal select-text flex flex-col justify-between relative overflow-hidden my-2 mx-auto"
              style={{
                letterSpacing: '0.01em',
              }}
            >
              <div>
                {/* Executive Header Banner */}
                <div className="flex justify-between items-start pb-5 border-b border-slate-200 gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <NiLLogo logoUrl={effectiveLogoUrl} size="lg" variant="icon" />
                    <div className="space-y-1">
                      <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase leading-none">
                        {effectiveBusinessName}
                      </h1>
                      {effectiveTagline && (
                        <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">
                          {effectiveTagline}
                        </p>
                      )}
                      <p className="text-xs text-slate-700 flex items-center gap-1 font-medium pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{shopAddress}{effectivePincode ? ` - ${effectivePincode}` : ''}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 font-medium">
                        {effectivePhones.length > 0 && (
                          <span>Ph: <strong className="text-slate-900 font-bold">{effectivePhones.join(', ')}</strong> ({effectiveOwner})</span>
                        )}
                        {effectiveEmails.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Email: <strong className="text-slate-900">{effectiveEmails[0]}</strong></span>
                          </>
                        )}
                      </div>
                      {effectiveGstin && (
                        <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-[11px] shadow-2xs">
                          <span className="text-slate-400 font-normal uppercase text-[9.5px]">GSTIN:</span>
                          <span>{effectiveGstin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Header Metadata Box */}
                  <div className="text-right shrink-0 space-y-2">
                    <div className="inline-block px-5 py-2 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-sm border border-slate-800">
                      {mode === 'job_token'
                        ? 'JOB WORK ORDER'
                        : isPaymentSlip
                        ? 'MONEY RECEIPT'
                        : 'TAX INVOICE'}
                    </div>

                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">Doc No:</span>
                        <span className="font-mono font-black text-slate-950 text-sm px-2.5 py-0.5 bg-slate-100 rounded border border-slate-300">{docId}</span>
                      </div>
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">Date:</span>
                        <span className="font-black text-slate-900">
                          {new Date(docDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {job?.deliveryDeadline && (
                        <div className="flex justify-end items-center gap-2 text-indigo-900 font-black text-xs">
                          <span className="uppercase text-[10px] tracking-wider text-indigo-600 font-bold">Ready Date:</span>
                          <span>{new Date(job.deliveryDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="pt-1 text-right">
                        {balance <= 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-black text-[10.5px] uppercase tracking-wide">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            PAID IN FULL ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-900 border border-rose-300 rounded-md font-black text-[10.5px] uppercase tracking-wide">
                            BALANCE DUE: ₹{balance}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billed To Customer & Order Specifications Grid */}
                <div className="grid grid-cols-2 gap-5 bg-gradient-to-br from-slate-50 to-indigo-50/20 p-4.5 rounded-xl border border-slate-200 shadow-2xs my-5">
                  {/* Left: Customer Profile */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Billed To / Customer Details</span>
                    </div>
                    <div className="text-lg font-black text-slate-950 tracking-tight">{customerName}</div>
                    {customerPhone && (
                      <div className="text-xs text-slate-700 font-bold flex items-center gap-1">
                        <span className="text-slate-400 font-normal">Phone:</span>
                        <span className="font-mono text-slate-900">{customerPhone}</span>
                      </div>
                    )}
                    {customerAddress && (
                      <div className="text-xs text-slate-600 font-medium leading-relaxed pt-0.5">{customerAddress}</div>
                    )}
                    {customerGstin && (
                      <div className="text-xs font-black text-slate-900 font-mono pt-1">
                        GSTIN: {customerGstin}
                      </div>
                    )}
                  </div>

                  {/* Right: Order Meta Details */}
                  <div className="border-l border-slate-200/90 pl-5 space-y-1.5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Transaction & Order Details</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Payment Mode:</span>
                      <span className="font-black text-slate-900">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Attending Staff:</span>
                      <span className="font-bold text-slate-800">{staffName}</span>
                    </div>
                    {job && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Job Status:</span>
                        <span className="font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                          {job.status}
                        </span>
                      </div>
                    )}
                    {notes && (
                      <div className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-200 italic mt-1">
                        <span className="font-bold not-italic text-slate-500">Note: </span>{notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Line Items Table */}
                <div className="overflow-hidden rounded-lg border border-slate-300 shadow-2xs mb-5">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950 text-white font-black text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5 w-10 text-center">#</th>
                        <th className="py-3 px-3.5">Service / Particulars & Specifications</th>
                        <th className="py-3 px-3.5 text-center w-24">Qty / Unit</th>
                        <th className="py-3 px-3.5 text-right w-28">Rate (₹)</th>
                        <th className="py-3 px-3.5 text-right w-32">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs bg-white">
                      {invoice ? (
                        invoice.items.map((it, idx) => (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="py-3 px-3.5 text-center text-slate-400 font-mono font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-black text-slate-950 text-xs">{it.description}</div>
                              {it.details && (
                                <div className="text-[11px] text-slate-600 mt-0.5 font-medium leading-relaxed">{it.details}</div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center tabular-nums font-bold text-slate-800">
                              {it.qty} {it.unit}
                            </td>
                            <td className="py-3 px-3.5 text-right tabular-nums font-medium text-slate-700">
                              ₹{it.unitPrice}
                            </td>
                            <td className="py-3 px-3.5 text-right font-black tabular-nums text-slate-950">
                              ₹{it.total}
                            </td>
                          </tr>
                        ))
                      ) : job ? (
                        <tr>
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono font-bold">1</td>
                          <td className="py-3 px-3.5">
                            <div className="font-black text-slate-950 text-xs">{job.serviceName}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium leading-relaxed">
                              {job.customSpecsSummary}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center tabular-nums font-bold text-slate-800">
                            {job.quantity} Units
                          </td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-medium text-slate-700">
                            ₹{(job.totalAmount / job.quantity).toFixed(0)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-black tabular-nums text-slate-950">
                            ₹{job.totalAmount}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* Amount In Words Banner */}
                <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-4 mb-6">
                  <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest shrink-0">
                    Amount in Words:
                  </span>
                  <span className="font-black text-slate-950 italic uppercase tracking-wide text-right">
                    {numberToWordsINR(total)}
                  </span>
                </div>

                {/* Totals, Terms, UPI QR & Authorized Signatory */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left (7 cols): Terms & UPI QR */}
                  <div className="md:col-span-7 space-y-4">
                    {/* Terms box */}
                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                      <div className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Terms & Conditions:</span>
                      </div>
                      <ul className="text-[10px] text-slate-600 list-disc list-inside space-y-1 leading-relaxed">
                        {config.termsAndConditions.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    {/* UPI QR Payment */}
                    <div className="flex items-center gap-3.5 p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <img
                        src={qrDataUrl || upiQrUrl}
                        alt="UPI QR"
                        className="w-16 h-16 border border-slate-300 p-0.5 rounded shrink-0 bg-white shadow-2xs"
                      />
                      <div className="text-[11px] text-slate-600 min-w-0 space-y-0.5">
                        <div className="font-black text-slate-950">Direct UPI Payment Settlement</div>
                        <div className="font-mono text-slate-800 font-bold truncate">VPA: {config.upiId}</div>
                        <div className="text-[10px] text-slate-500">Scan via GPay, PhonePe, Paytm, or BHIM</div>
                      </div>
                    </div>
                  </div>

                  {/* Right (5 cols): Financial Ledger Breakdown & Signature */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Subtotal:</span>
                        <span className="font-bold tabular-nums text-slate-900">₹{total}</span>
                      </div>

                      {invoice && invoice.discount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Discount:</span>
                          <span className="tabular-nums">-₹{invoice.discount}</span>
                        </div>
                      )}

                      {config.gstin ? (
                        <>
                          <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                            <span>Taxable Subtotal:</span>
                            <span className="font-bold tabular-nums text-slate-900">₹{(total / 1.18).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                            <span>CGST @ 9%:</span>
                            <span className="font-bold tabular-nums text-slate-800">₹{((total - total / 1.18) / 2).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                            <span>SGST @ 9%:</span>
                            <span className="font-bold tabular-nums text-slate-800">₹{((total - total / 1.18) / 2).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-500 text-[10px] italic">
                          <span>GST Status:</span>
                          <span>Inclusive of all taxes</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-black text-slate-950 border-t-2 border-b-2 border-slate-950 py-2 my-1.5 bg-slate-100 px-2 rounded">
                        <span>GRAND TOTAL:</span>
                        <span className="tabular-nums">₹{total}</span>
                      </div>

                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Advance Received:</span>
                        <span className="tabular-nums">₹{paid}</span>
                      </div>

                      <div
                        className={`flex justify-between font-black text-xs ${
                          balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        <span>BALANCE PAYABLE:</span>
                        <span className="tabular-nums text-sm">₹{balance}</span>
                      </div>
                    </div>

                    {/* Signatory Box */}
                    <div className="pt-4 text-center text-xs">
                      <div className="h-12 border-b-2 border-dashed border-slate-300 mx-auto max-w-[200px] mb-2 flex items-end justify-center pb-1">
                        <span className="text-[10px] text-slate-400 italic font-medium">Signature / Digital Stamp</span>
                      </div>
                      <div className="font-black text-slate-950">For {config.businessName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">(Authorized Signatory)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <div className="pt-4 mt-6 text-center text-[10px] text-slate-400 border-t border-slate-200 font-medium">
                Thank you for choosing {config.businessName}! · Computer generated tax invoice · Page 1 of 1
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
