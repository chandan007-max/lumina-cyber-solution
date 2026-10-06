import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  User,
  Plus,
  Calendar,
  FileCheck,
  CheckSquare,
  Square,
  DollarSign,
  Printer,
  Sparkles,
  Paperclip,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import {
  Customer,
  FlexSpecs,
  JobItem,
  JobStatus,
  PaymentMethod,
  RestaurantBillSpecs,
  RestaurantMenuSpecs,
  ServiceCategory,
  StaffUser,
  XeroxSpecs,
} from '../../types';
import { StorageService } from '../../services/storage';
import { LicenseService } from '../../services/licenseService';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  currentStaff: StaffUser;
  onJobCreated: (job: JobItem, printReceipt?: boolean) => void;
  initialJobToRepeat?: JobItem | null;
}

export const NewJobModal: React.FC<NewJobModalProps> = ({
  isOpen,
  onClose,
  customers,
  currentStaff,
  onJobCreated,
  initialJobToRepeat,
}) => {
  // Step navigation or unified view
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('Printing');

  // Customer State
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Service Name & Priority
  const [serviceName, setServiceName] = useState('Flex Printing');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'express'>('normal');
  const [deliveryDeadline, setDeliveryDeadline] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');

  // 1. Flex Specs
  const [flexWidth, setFlexWidth] = useState<number>(8);
  const [flexHeight, setFlexHeight] = useState<number>(4);
  const [flexMaterial, setFlexMaterial] = useState<FlexSpecs['material']>('Flex 340 GSM');
  const [flexFinishing, setFlexFinishing] = useState<FlexSpecs['finishing']>('Eyelet');
  const [flexSideOption, setFlexSideOption] = useState<'Single Side' | 'Both Side (Double Sided)'>('Single Side');
  const [flexDesignOption, setFlexDesignOption] = useState<FlexSpecs['designOption']>('Customer Supplied');
  const [flexRatePerSqft, setFlexRatePerSqft] = useState<number>(40);
  const [flexDesignCharge, setFlexDesignCharge] = useState<number>(0);
  const [flexQty, setFlexQty] = useState<number>(1);
  const [flexFrameRatePerFt, setFlexFrameRatePerFt] = useState<number>(45);
  const [flexFrameLabourCharge, setFlexFrameLabourCharge] = useState<number>(150);

  // 2. Restaurant Menu Specs
  const [menuRestName, setMenuRestName] = useState('');
  const [menuType, setMenuType] = useState<RestaurantMenuSpecs['menuType']>('Booklet');
  const [menuSize, setMenuSize] = useState<RestaurantMenuSpecs['menuSize']>('A4');
  const [menuPages, setMenuPages] = useState<number>(12);
  const [menuPaperGsm, setMenuPaperGsm] = useState<RestaurantMenuSpecs['paperGsm']>('300 GSM Art Card');
  const [menuLamination, setMenuLamination] = useState<RestaurantMenuSpecs['lamination']>('Matte Lamination');
  const [menuBinding, setMenuBinding] = useState<RestaurantMenuSpecs['binding']>('Wire-O Spiral');
  const [menuDesignRequired, setMenuDesignRequired] = useState<boolean>(true);
  const [menuDesignCharge, setMenuDesignCharge] = useState<number>(800);
  const [menuRatePerCopy, setMenuRatePerCopy] = useState<number>(150);
  const [menuCopies, setMenuCopies] = useState<number>(10);

  // 3. Restaurant Bill Book Specs
  const [billBookType, setBillBookType] = useState<RestaurantBillSpecs['bookType']>('Bill Book');
  const [billBookSize, setBillBookSize] = useState<RestaurantBillSpecs['size']>('1/8 Demy');
  const [billBookCopiesPerBook, setBillBookCopiesPerBook] = useState<RestaurantBillSpecs['copiesPerBook']>('50 Duplicates');
  const [billBookSerialPrefix, setBillBookSerialPrefix] = useState<string>('NP-');
  const [billBookStartNo, setBillBookStartNo] = useState<number>(1);
  const [billBookRate, setBillBookRate] = useState<number>(120);
  const [billBookQty, setBillBookQty] = useState<number>(5);

  // 4. Xerox Specs
  const [xeroxPaperSize, setXeroxPaperSize] = useState<XeroxSpecs['paperSize']>('A4');
  const [xeroxColor, setXeroxColor] = useState<XeroxSpecs['colorMode']>('B&W');
  const [xeroxSide, setXeroxSide] = useState<XeroxSpecs['sideMode']>('Single Side');
  const [xeroxPages, setXeroxPages] = useState<number>(50);
  const [xeroxCopies, setXeroxCopies] = useState<number>(1);
  const [xeroxRate, setXeroxRate] = useState<number>(2);

  // 5. Govt / Cyber Document Specs
  const [govtServiceType, setGovtServiceType] = useState<'New PAN Card' | 'PAN Correction' | 'Aadhaar Print/Update' | 'Online Govt Form'>('New PAN Card');
  const [govtDocsReceived, setGovtDocsReceived] = useState<string[]>(['Aadhaar Copy', 'Passport Photo', 'Signature Specimen']);
  const [govtPortalFee, setGovtPortalFee] = useState<number>(107);
  const [nilServiceCharge, setNilServiceCharge] = useState<number>(100);

  // 6. Generic Quantity & Rate for others
  const [genericQty, setGenericQty] = useState<number>(1);
  const [genericRate, setGenericRate] = useState<number>(250);

  // Manual Rate / Lump Sum Override
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualSubtotal, setManualSubtotal] = useState<number | ''>('');

  // Form Submission & Validation State
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financials
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Pre-load if repeat job
  useEffect(() => {
    if (initialJobToRepeat) {
      setSelectedCategory(initialJobToRepeat.serviceCategory);
      setServiceName(initialJobToRepeat.serviceName);
      setCustomerId(initialJobToRepeat.customerId);
      setCustomerName(initialJobToRepeat.customerName);
      setCustomerPhone(initialJobToRepeat.customerPhone);
      setCustomerAddress(initialJobToRepeat.customerAddress || '');

      if (initialJobToRepeat.flexSpecs) {
        setFlexWidth(initialJobToRepeat.flexSpecs.widthFt);
        setFlexHeight(initialJobToRepeat.flexSpecs.heightFt);
        setFlexMaterial(initialJobToRepeat.flexSpecs.material);
        setFlexFinishing(initialJobToRepeat.flexSpecs.finishing);
        if (initialJobToRepeat.flexSpecs.sideOption) setFlexSideOption(initialJobToRepeat.flexSpecs.sideOption);
        setFlexDesignOption(initialJobToRepeat.flexSpecs.designOption);
        setFlexRatePerSqft(initialJobToRepeat.flexSpecs.ratePerSqft);
        setFlexDesignCharge(initialJobToRepeat.flexSpecs.designCharge);
        setFlexQty(initialJobToRepeat.quantity);
        if (initialJobToRepeat.flexSpecs.frameRatePerFt) setFlexFrameRatePerFt(initialJobToRepeat.flexSpecs.frameRatePerFt);
        if (initialJobToRepeat.flexSpecs.frameLabourCharge) setFlexFrameLabourCharge(initialJobToRepeat.flexSpecs.frameLabourCharge);
      }
      if (initialJobToRepeat.menuSpecs) {
        setMenuRestName(initialJobToRepeat.menuSpecs.restaurantName);
        setMenuType(initialJobToRepeat.menuSpecs.menuType);
        setMenuSize(initialJobToRepeat.menuSpecs.menuSize);
        setMenuPages(initialJobToRepeat.menuSpecs.pagesCount);
        setMenuPaperGsm(initialJobToRepeat.menuSpecs.paperGsm);
        setMenuLamination(initialJobToRepeat.menuSpecs.lamination);
        setMenuBinding(initialJobToRepeat.menuSpecs.binding);
        setMenuDesignRequired(initialJobToRepeat.menuSpecs.designRequired);
        setMenuDesignCharge(initialJobToRepeat.menuSpecs.designCharge);
        setMenuRatePerCopy(initialJobToRepeat.menuSpecs.printRatePerCopy);
        setMenuCopies(initialJobToRepeat.menuSpecs.copies);
      }
      if (initialJobToRepeat.restaurantBillSpecs) {
        setBillBookType(initialJobToRepeat.restaurantBillSpecs.bookType);
        setBillBookSize(initialJobToRepeat.restaurantBillSpecs.size);
        setBillBookCopiesPerBook(initialJobToRepeat.restaurantBillSpecs.copiesPerBook);
        setBillBookSerialPrefix(initialJobToRepeat.restaurantBillSpecs.serialPrefix);
        setBillBookStartNo(initialJobToRepeat.restaurantBillSpecs.startNo + initialJobToRepeat.restaurantBillSpecs.booksQty * 50);
        setBillBookRate(initialJobToRepeat.restaurantBillSpecs.ratePerBook);
        setBillBookQty(initialJobToRepeat.restaurantBillSpecs.booksQty);
      }
    }
  }, [initialJobToRepeat]);

  if (!isOpen) return null;

  // Real-time Dynamic Calculations based on active specs
  let calculatedSubtotal = 0;
  let customSummary = '';
  let finalQty = 1;

  const isFrameFitting = flexFinishing === 'Iron Frame Fitting' || flexFinishing === 'Wooden Frame Fitting';
  const flexPerimeterFt = 2 * (flexWidth + flexHeight);
  const flexFrameMaterialCost = isFrameFitting ? flexPerimeterFt * flexFrameRatePerFt : 0;
  const flexFrameLabourCost = isFrameFitting ? flexFrameLabourCharge : 0;
  const flexTotalFrameCost = flexFrameMaterialCost + flexFrameLabourCost;

  if (selectedCategory === 'Printing' && serviceName.includes('Flex')) {
    const area = flexWidth * flexHeight;
    const basePrintCost = area * flexRatePerSqft;
    const sideMultiplier = flexSideOption === 'Both Side (Double Sided)' ? 2 : 1;
    const bannerPrintCost = basePrintCost * sideMultiplier;
    const designCost = flexDesignOption === 'NiL In-House Design' ? flexDesignCharge : (flexDesignCharge > 0 ? flexDesignCharge : 0);

    // Final Price Formula:
    // [ {Banner Dimensions (Length x Breadth) x price/sq.ft x sideMultiplier} + Finishing iron/wooden frame fittings calculated price + Design charge + fittings labour charge ] x Quantity
    const singleUnitCost = bannerPrintCost + flexFrameMaterialCost + designCost + flexFrameLabourCost;
    calculatedSubtotal = singleUnitCost * flexQty;
    finalQty = flexQty;

    const frameLabel = flexFinishing === 'Iron Frame Fitting' ? 'Iron Frame' : 'Wooden Frame';
    const sideText = flexSideOption === 'Both Side (Double Sided)' ? 'Double Sided 2x' : 'Single Side';

    let frameDetails = '';
    if (isFrameFitting) {
      frameDetails = ` · ${frameLabel} (${flexPerimeterFt} ft @ ₹${flexFrameRatePerFt}/ft = ₹${flexFrameMaterialCost}) · Labour (₹${flexFrameLabourCharge})`;
    } else if (flexFinishing !== 'None') {
      frameDetails = ` · Finishing: ${flexFinishing}`;
    }

    const designDetails = flexDesignCharge > 0 ? ` · Design (₹${flexDesignCharge})` : '';

    customSummary = `${flexMaterial} · (${flexWidth} ft × ${flexHeight} ft @${flexRatePerSqft}/sq.ft=${basePrintCost}) · (${sideText})${frameDetails}${designDetails} · Qty: ${flexQty}`;
  } else if (selectedCategory === 'RestaurantServices' && serviceName.includes('Menu')) {
    const printCost = menuCopies * menuRatePerCopy;
    calculatedSubtotal = printCost + (menuDesignRequired ? menuDesignCharge : 0);
    finalQty = menuCopies;
    customSummary = `${menuRestName ? `${menuRestName} · ` : ''}${menuSize} ${menuPages}p · ${menuPaperGsm} · ${menuLamination} · ${menuBinding} (${menuCopies} copies)`;
  } else if (selectedCategory === 'RestaurantServices' && serviceName.includes('Bill Book')) {
    calculatedSubtotal = billBookQty * billBookRate;
    finalQty = billBookQty;
    customSummary = `${billBookType} · ${billBookSize} · ${billBookCopiesPerBook} · Prefix: ${billBookSerialPrefix}${billBookStartNo} (${billBookQty} bks)`;
  } else if (selectedCategory === 'Printing' && serviceName.includes('Xerox')) {
    calculatedSubtotal = xeroxPages * xeroxCopies * xeroxRate;
    finalQty = xeroxCopies;
    customSummary = `${xeroxPaperSize} ${xeroxColor} (${xeroxSide}) · ${xeroxPages} pgs × ${xeroxCopies} copies @ ₹${xeroxRate}`;
  } else if (selectedCategory === 'DocumentServices') {
    calculatedSubtotal = govtPortalFee + nilServiceCharge;
    finalQty = 1;
    customSummary = `${govtServiceType} · Docs: ${govtDocsReceived.join(', ')}`;
  } else {
    calculatedSubtotal = genericQty * genericRate;
    finalQty = genericQty;
    customSummary = `${serviceName} · Qty: ${genericQty}`;
  }

  const effectiveSubtotal =
    isManualOverride && manualSubtotal !== ''
      ? Math.max(0, Number(manualSubtotal))
      : calculatedSubtotal;

  const grandTotal = Math.max(0, effectiveSubtotal - (discount || 0));
  const balanceDue = Math.max(0, grandTotal - (advancePaid || 0));

  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setCustomerGstin(c.gstin || '');
    setFormError(null);
    if (c.businessName && !menuRestName) {
      setMenuRestName(c.businessName);
    }
  };

  const handleQuickWalkIn = () => {
    setCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('9800000000');
    setFormError(null);
  };

  const toggleGovtDoc = (doc: string) => {
    setGovtDocsReceived((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  const handleCreateJob = async (shouldPrintToken: boolean) => {
    setFormError(null);

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setFormError('Please enter a Customer or Business Name.');
      const nameInput = document.getElementById('new-job-customer-name');
      if (nameInput) {
        nameInput.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const finalPhone = customerPhone.trim() || '9800000000';

      // Save/update customer profile
      const savedCustomer = StorageService.upsertCustomer({
        id: customerId || undefined,
        name: trimmedName,
        phone: finalPhone,
        address: customerAddress.trim() || undefined,
        gstin: customerGstin.trim() || undefined,
        businessName: menuRestName || undefined,
      });

      const newJobId = StorageService.generateNextJobId();

      const jobData: JobItem = {
        id: newJobId,
        createdAt: new Date().toISOString(),
        customerId: savedCustomer.id,
        customerName: savedCustomer.name,
        customerPhone: savedCustomer.phone,
        customerAddress: savedCustomer.address,
        customerGstin: savedCustomer.gstin,
        serviceCategory: selectedCategory,
        serviceName,
        customSpecsSummary: customSummary,
        quantity: finalQty,
        subtotal: effectiveSubtotal,
        discount: discount || 0,
        tax: 0,
        totalAmount: grandTotal,
        advancePaid: advancePaid || 0,
        balanceDue,
        paymentHistory:
          advancePaid > 0
            ? [
                {
                  id: `pay-${Date.now()}`,
                  date: new Date().toISOString(),
                  amount: advancePaid,
                  method: paymentMethod,
                  note: 'Advance deposit at order booking',
                  staff: currentStaff.name,
                },
              ]
            : [],
        status: 'received',
        priority,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline).toISOString() : undefined,
        notes,
        attachments: [{ name: 'customer_supplied_specs.pdf', size: '2.1 MB', type: 'application/pdf' }],
        createdByStaff: currentStaff.name,
      };

      // Attach specific specs
      if (selectedCategory === 'Printing' && serviceName.includes('Flex')) {
        jobData.flexSpecs = {
          widthFt: flexWidth,
          heightFt: flexHeight,
          material: flexMaterial,
          finishing: flexFinishing,
          designOption: flexDesignOption,
          sideOption: flexSideOption,
          ratePerSqft: flexRatePerSqft,
          designCharge: flexDesignCharge,
          areaSqft: flexWidth * flexHeight,
          framePerimeterFt: isFrameFitting ? flexPerimeterFt : undefined,
          frameRatePerFt: isFrameFitting ? flexFrameRatePerFt : undefined,
          frameLabourCharge: isFrameFitting ? flexFrameLabourCharge : undefined,
          frameTotalPrice: isFrameFitting ? flexTotalFrameCost : undefined,
        };
      } else if (selectedCategory === 'RestaurantServices' && serviceName.includes('Menu')) {
        jobData.menuSpecs = {
          restaurantName: menuRestName,
          menuType,
          menuSize,
          pagesCount: menuPages,
          paperGsm: menuPaperGsm,
          lamination: menuLamination,
          binding: menuBinding,
          designRequired: menuDesignRequired,
          designCharge: menuDesignCharge,
          printRatePerCopy: menuRatePerCopy,
          copies: menuCopies,
        };
      } else if (selectedCategory === 'RestaurantServices' && serviceName.includes('Bill Book')) {
        jobData.restaurantBillSpecs = {
          bookType: billBookType,
          size: billBookSize,
          copiesPerBook: billBookCopiesPerBook,
          paperType: 'Carbonless (NCR)',
          serialPrefix: billBookSerialPrefix,
          startNo: billBookStartNo,
          bindingType: 'Hard Cover Bound',
          booksQty: billBookQty,
          ratePerBook: billBookRate,
        };
      } else if (selectedCategory === 'Printing' && serviceName.includes('Xerox')) {
        jobData.xeroxSpecs = {
          paperSize: xeroxPaperSize,
          colorMode: xeroxColor,
          sideMode: xeroxSide,
          pages: xeroxPages,
          copies: xeroxCopies,
          ratePerPage: xeroxRate,
        };
      } else if (selectedCategory === 'DocumentServices') {
        jobData.documentGovtSpecs = {
          serviceType: govtServiceType,
          docsReceived: govtDocsReceived,
          govtPortalFee,
          nilServiceCharge,
          documentStatus: 'Received',
        };
      }

      if (!LicenseService.canUseFeature('jobs')) {
        setFormError('Commercial license expired or restricted. Please renew your LUMINA CYBER SOLUTION subscription in Settings -> License & Subscription.');
        setIsSubmitting(false);
        return;
      }

      StorageService.addJob(jobData);
      onJobCreated(jobData, shouldPrintToken);
      onClose();
    } catch (err: any) {
      console.error('Job creation error:', err);
      setFormError(err?.message || 'Failed to save job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                New Custom Job Work Order <span className="font-mono text-indigo-300 text-xs">[F2]</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Flex · Menus · Visiting Cards · PAN/Govt · Bulk Digital Print
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: Customer Details */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Step 1: Customer Information
              </div>
              {/* Quick Customer Picker */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleQuickWalkIn}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Quick Walk-in</span>
                </button>
                <span className="text-slate-400">or select:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    if (found) handleSelectCustomer(found);
                  }}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-200"
                >
                  {[
                    <option key="default-empty-cust" value="">Existing customer...</option>,
                    ...customers.map((c, idx) => (
                      <option key={`cust-opt-${c.id || 'cust'}-${idx}`} value={c.id}>
                        {c.name} {c.businessName ? `(${c.businessName})` : ''} - {c.phone}
                      </option>
                    )),
                  ]}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Customer / Business Name <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="new-job-customer-name"
                  type="text"
                  placeholder="e.g. ABC Restaurant / Walk-in"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className={`w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg outline-none font-medium transition-colors ${
                    formError && !customerName.trim()
                      ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950 focus:border-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9800099934"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                  Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Digha Sea Beach"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">
                  GSTIN (If B2B Bill)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 19AAECN1234F1Z8"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 uppercase font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Visual Category & Service Selection */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Step 2: Choose Service Category
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {[
                { id: 'Printing' as ServiceCategory, label: '🖨 Printing & Flex', desc: 'Flex, Xerox, Banners' },
                { id: 'RestaurantServices' as ServiceCategory, label: '🏪 Restaurant', desc: 'Menus, Bill Book, KOT' },
                { id: 'Cards' as ServiceCategory, label: '💳 Cards', desc: 'PVC, Visiting, IDs' },
                { id: 'PhotoDesign' as ServiceCategory, label: '📸 Photo & Design', desc: 'Passport, Frames, Layout' },
                { id: 'DocumentServices' as ServiceCategory, label: '📄 Cyber & Govt', desc: 'PAN, Aadhaar, Online' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id === 'Printing') setServiceName('Flex Printing');
                    if (cat.id === 'RestaurantServices') setServiceName('Restaurant Menu Book');
                    if (cat.id === 'Cards') setServiceName('PVC Smart Identity Card');
                    if (cat.id === 'PhotoDesign') setServiceName('Graphic / Flex Design Service');
                    if (cat.id === 'DocumentServices') setServiceName('New PAN Card Application');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>

            {/* Sub-service tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
              {selectedCategory === 'Printing' && (
                <>
                  {['Flex Printing', 'B/W Xerox Bulk', 'Colour Xerox', 'Star Flex Banner', 'Vinyl Sticker'].map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setServiceName(name);
                        if (name === 'Star Flex Banner') {
                          setFlexMaterial('Star Flex');
                          setFlexRatePerSqft(65);
                        } else if (name === 'Flex Printing') {
                          setFlexMaterial('Flex 340 GSM');
                          setFlexRatePerSqft(40);
                        } else if (name === 'Vinyl Sticker') {
                          setFlexMaterial('Vinyl');
                          setFlexRatePerSqft(55);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        serviceName === name
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}

              {selectedCategory === 'RestaurantServices' && (
                <>
                  {['Restaurant Menu Book', 'Restaurant Bill Book', 'Restaurant KOT Book', 'Table Tent QR'].map((name) => (
                    <button
                      key={name}
                      onClick={() => setServiceName(name)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        serviceName === name
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}

              {selectedCategory === 'Cards' && (
                <>
                  {['PVC Smart Identity Card', 'Visiting Cards (Pack of 1000)', 'Membership Card'].map((name) => (
                    <button
                      key={name}
                      onClick={() => setServiceName(name)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        serviceName === name
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}

              {selectedCategory === 'DocumentServices' && (
                <>
                  {['New PAN Card Application', 'Aadhaar PVC / Print', 'Online Govt Form', 'Lamination A4'].map((name) => (
                    <button
                      key={name}
                      onClick={() => setServiceName(name)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        serviceName === name
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}

              {selectedCategory === 'PhotoDesign' && (
                <>
                  {['Passport Photo (Set of 8)', 'Photo Frame 6x8', 'Graphic / Flex Design Service', 'Document Scanning'].map((name) => (
                    <button
                      key={name}
                      onClick={() => setServiceName(name)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        serviceName === name
                          ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Section 3: Specialized Service Form & Pricing Engine */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">
              Step 3: Service Specifications & Live Calculator
            </div>

            {/* A. FLEX CALCULATOR */}
            {selectedCategory === 'Printing' && serviceName.includes('Flex') && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Banner Dimensions (Feet)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={flexWidth}
                      onChange={(e) => setFlexWidth(parseFloat(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold"
                    />
                    <span className="text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="1"
                      value={flexHeight}
                      onChange={(e) => setFlexHeight(parseFloat(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold"
                    />
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold mt-1">
                    Total Area: {flexWidth * flexHeight} sq.ft
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Material</label>
                  <select
                    value={flexMaterial}
                    onChange={(e) => {
                      const m = e.target.value as FlexSpecs['material'];
                      setFlexMaterial(m);
                      if (m === 'Star Flex') setFlexRatePerSqft(65);
                      else if (m === 'Vinyl') setFlexRatePerSqft(55);
                      else setFlexRatePerSqft(40);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded"
                  >
                    <option value="Flex 340 GSM">Flex 340 GSM (Standard)</option>
                    <option value="Star Flex">Star Flex (Glossy High Quality)</option>
                    <option value="Vinyl">Vinyl Self-Adhesive Sticker</option>
                    <option value="Backlit Film">Backlit Glow Sign Board</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Banner Printing Sides</label>
                  <select
                    value={flexSideOption}
                    onChange={(e) => setFlexSideOption(e.target.value as 'Single Side' | 'Both Side (Double Sided)')}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs font-semibold"
                  >
                    <option value="Single Side">Single Side (Standard 1x Print)</option>
                    <option value="Both Side (Double Sided)">Both Side / Double Sided (2x Print)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Finishing</label>
                  <select
                    value={flexFinishing}
                    onChange={(e) => {
                      const val = e.target.value as FlexSpecs['finishing'];
                      setFlexFinishing(val);
                      if (val === 'Iron Frame Fitting') {
                        setFlexFrameRatePerFt(45);
                        setFlexFrameLabourCharge(150);
                      } else if (val === 'Wooden Frame Fitting') {
                        setFlexFrameRatePerFt(30);
                        setFlexFrameLabourCharge(100);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-semibold text-xs"
                  >
                    <option value="Eyelet">Eyelet on corners</option>
                    <option value="Pipe Pockets">Pipe Pocket Fold</option>
                    <option value="Iron Frame Fitting">🛠 Iron Frame Fitting (Heavy Metal Frame)</option>
                    <option value="Wooden Frame Fitting">🪵 Wooden Frame Fitting (Timber Frame)</option>
                    <option value="None">None (Cut to size)</option>
                  </select>
                </div>

                {/* Frame Fitting Perimeter & Labour Charge Calculator */}
                {isFrameFitting && (
                  <div className="md:col-span-2 p-3 bg-amber-50/90 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-amber-950 dark:text-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-900 dark:text-amber-200 font-extrabold flex items-center gap-1">
                          📐 Frame Perimeter: <span className="font-mono text-xs">2×({flexWidth}+{flexHeight})</span>
                        </span>
                        <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded-md font-mono text-xs font-bold border border-amber-400 dark:border-amber-700">
                          {flexPerimeterFt} Running Feet (rft)
                        </span>
                      </div>
                      <div className="text-amber-900 dark:text-amber-300 font-extrabold text-xs">
                        Frame Materials Cost: <span className="text-indigo-700 dark:text-indigo-300">₹{flexFrameMaterialCost}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-extrabold text-amber-950 dark:text-amber-200 mb-1">
                          {flexFinishing === 'Iron Frame Fitting' ? 'Iron Frame' : 'Wooden Frame'} Material Rate (₹ / ft)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={flexFrameRatePerFt}
                            onChange={(e) => setFlexFrameRatePerFt(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[11px] text-amber-900 dark:text-amber-300 font-mono font-bold shrink-0">
                            = ₹{flexPerimeterFt * flexFrameRatePerFt}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-amber-950 dark:text-amber-200 mb-1">
                          🔨 Fittings Labour Charge (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={flexFrameLabourCharge}
                          onChange={(e) => setFlexFrameLabourCharge(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-slate-100 rounded font-bold text-amber-900 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Design Charge</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={flexDesignOption}
                      onChange={(e) => {
                        const opt = e.target.value as FlexSpecs['designOption'];
                        setFlexDesignOption(opt);
                        if (opt === 'NiL In-House Design') setFlexDesignCharge(250);
                        else setFlexDesignCharge(0);
                      }}
                      className="w-2/3 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-[11px]"
                    >
                      <option value="Customer Supplied">Client File</option>
                      <option value="NiL In-House Design">NiL Design (+₹250)</option>
                    </select>
                    <input
                      type="number"
                      value={flexDesignCharge}
                      onChange={(e) => setFlexDesignCharge(parseFloat(e.target.value) || 0)}
                      className="w-1/3 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-center"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Banner Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={flexQty}
                      onChange={(e) => setFlexQty(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                      Rate (₹ / sq.ft) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                    </label>
                    <input
                      type="number"
                      value={flexRatePerSqft}
                      onChange={(e) => setFlexRatePerSqft(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded font-bold text-indigo-700 dark:text-indigo-300"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 bg-indigo-50/90 dark:bg-indigo-950/50 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                    <span className="font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider text-[11px] block mb-0.5">
                      🧮 Live Pricing Calculation Formula:
                    </span>
                    <span>
                      [ Print ({flexWidth}×{flexHeight} = {flexWidth * flexHeight} sq.ft @ ₹{flexRatePerSqft}/sq.ft{flexSideOption === 'Both Side (Double Sided)' ? ' × 2 sides' : ''} = ₹{(flexWidth * flexHeight) * flexRatePerSqft * (flexSideOption === 'Both Side (Double Sided)' ? 2 : 1)})
                      {isFrameFitting && ` + ${flexFinishing === 'Iron Frame Fitting' ? 'Iron' : 'Wooden'} Frame (2×(${flexWidth}+${flexHeight}) = ${flexPerimeterFt} rft @ ₹${flexFrameRatePerFt}/ft = ₹${flexFrameMaterialCost})`}
                      {flexDesignOption === 'NiL In-House Design' && ` + Design (₹${flexDesignCharge})`}
                      {isFrameFitting && ` + Labour (₹${flexFrameLabourCharge})`}
                      ] × Qty {flexQty}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-wider">Estimated Total</span>
                    <span className="text-base font-black text-indigo-950 dark:text-indigo-200 tabular-nums">
                      ₹{calculatedSubtotal}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* B. RESTAURANT MENU CALCULATOR */}
            {selectedCategory === 'RestaurantServices' && serviceName.includes('Menu') && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Restaurant Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Seafood Cafe"
                    value={menuRestName}
                    onChange={(e) => setMenuRestName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Menu Size & Pages</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={menuSize}
                      onChange={(e) => setMenuSize(e.target.value as RestaurantMenuSpecs['menuSize'])}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                    >
                      <option value="A4">A4 Booklet</option>
                      <option value="A3">A3 Folded</option>
                      <option value="Slim A4">Slim Table Card</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Pages"
                      value={menuPages}
                      onChange={(e) => setMenuPages(parseInt(e.target.value, 10) || 1)}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Paper & Board</label>
                  <select
                    value={menuPaperGsm}
                    onChange={(e) => setMenuPaperGsm(e.target.value as RestaurantMenuSpecs['paperGsm'])}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="300 GSM Art Card">300 GSM Premium Art Card</option>
                    <option value="350 GSM Heavy Board">350 GSM Extra Heavy Board</option>
                    <option value="250 GSM Board">250 GSM Standard Board</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Lamination & Binding</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={menuLamination}
                      onChange={(e) => setMenuLamination(e.target.value as RestaurantMenuSpecs['lamination'])}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-[11px] outline-none focus:border-indigo-500"
                    >
                      <option value="Matte Lamination">Matte Thermal</option>
                      <option value="Gloss Lamination">Gloss Thermal</option>
                      <option value="Velvet Thermal">Velvet Touch</option>
                    </select>
                    <select
                      value={menuBinding}
                      onChange={(e) => setMenuBinding(e.target.value as RestaurantMenuSpecs['binding'])}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-[11px] outline-none focus:border-indigo-500"
                    >
                      <option value="Wire-O Spiral">Spiral Wire-O</option>
                      <option value="Center Pin / Staple">Center Staple</option>
                      <option value="Hardcase Bound">Hard Bound</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Total Copies</label>
                    <input
                      type="number"
                      min="1"
                      value={menuCopies}
                      onChange={(e) => setMenuCopies(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                      Rate / Copy (₹) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                    </label>
                    <input
                      type="number"
                      value={menuRatePerCopy}
                      onChange={(e) => setMenuRatePerCopy(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Design Charge (₹)</label>
                    <input
                      type="number"
                      value={menuDesignCharge}
                      onChange={(e) => setMenuDesignCharge(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-950/60 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <div className="text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="font-bold">Total:</span> {menuCopies} copies @ ₹{menuRatePerCopy} + Design ₹{menuDesignCharge}
                  </div>
                  <div className="text-sm font-extrabold text-indigo-900 dark:text-indigo-100 tabular-nums">
                    ₹{calculatedSubtotal}
                  </div>
                </div>
              </div>
            )}

            {/* C. RESTAURANT BILL BOOK */}
            {selectedCategory === 'RestaurantServices' && serviceName.includes('Bill Book') && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Book Size</label>
                  <select
                    value={billBookSize}
                    onChange={(e) => setBillBookSize(e.target.value as RestaurantBillSpecs['size'])}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="1/8 Demy">1/8 Demy (Standard Restaurant)</option>
                    <option value="1/6 Demy">1/6 Demy (Medium)</option>
                    <option value="1/4 Demy">1/4 Demy (Large A5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Copies per Book</label>
                  <select
                    value={billBookCopiesPerBook}
                    onChange={(e) => setBillBookCopiesPerBook(e.target.value as RestaurantBillSpecs['copiesPerBook'])}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="50 Duplicates">50 Duplicates (NCR Carbonless)</option>
                    <option value="100 Duplicates">100 Duplicates (NCR)</option>
                    <option value="50 Triplicates">50 Triplicates (3 copies)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Serial Numbering</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Prefix"
                      value={billBookSerialPrefix}
                      onChange={(e) => setBillBookSerialPrefix(e.target.value)}
                      className="w-1/3 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded uppercase font-mono text-[11px] outline-none focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Start No"
                      value={billBookStartNo}
                      onChange={(e) => setBillBookStartNo(parseInt(e.target.value, 10) || 1)}
                      className="w-2/3 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Books Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={billBookQty}
                    onChange={(e) => setBillBookQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Rate / Book (₹) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                  </label>
                  <input
                    type="number"
                    value={billBookRate}
                    onChange={(e) => setBillBookRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 rounded font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* D. XEROX BULK SPEC */}
            {selectedCategory === 'Printing' && serviceName.includes('Xerox') && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Paper Size</label>
                  <select
                    value={xeroxPaperSize}
                    onChange={(e) => {
                      const s = e.target.value as XeroxSpecs['paperSize'];
                      setXeroxPaperSize(s);
                      if (s === 'A3') setXeroxRate(5);
                      else setXeroxRate(2);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="A4">A4 (75 GSM JK Copier)</option>
                    <option value="Legal">Legal (Bond/Stamp)</option>
                    <option value="A3">A3 Jumbo Size</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Type & Side</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={xeroxColor}
                      onChange={(e) => {
                        const c = e.target.value as XeroxSpecs['colorMode'];
                        setXeroxColor(c);
                        setXeroxRate(c === 'Colour' ? 10 : 2);
                      }}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="B&W">B&W</option>
                      <option value="Colour">Colour</option>
                    </select>
                    <select
                      value={xeroxSide}
                      onChange={(e) => setXeroxSide(e.target.value as XeroxSpecs['sideMode'])}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="Single Side">Single</option>
                      <option value="Double Side">Double</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Pages × Copies</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Pages"
                      value={xeroxPages}
                      onChange={(e) => setXeroxPages(parseInt(e.target.value, 10) || 1)}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Sets"
                      value={xeroxCopies}
                      onChange={(e) => setXeroxCopies(parseInt(e.target.value, 10) || 1)}
                      className="w-1/2 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Rate (₹ / page) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={xeroxRate}
                    onChange={(e) => setXeroxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 rounded font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* E. DOCUMENT & GOVT CHECKLIST */}
            {selectedCategory === 'DocumentServices' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Service Type</label>
                    <select
                      value={govtServiceType}
                      onChange={(e) => {
                        const t = e.target.value as any;
                        setGovtServiceType(t);
                        if (t === 'New PAN Card') {
                          setGovtPortalFee(107);
                          setNilServiceCharge(100);
                        } else if (t === 'Aadhaar Print/Update') {
                          setGovtPortalFee(0);
                          setNilServiceCharge(60);
                        } else {
                          setGovtPortalFee(0);
                          setNilServiceCharge(100);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                    >
                      <option value="New PAN Card">New PAN Card (NSDL/UTI)</option>
                      <option value="PAN Correction">PAN Name/DOB Correction</option>
                      <option value="Aadhaar Print/Update">Aadhaar PVC / Print</option>
                      <option value="Online Govt Form">Online Form Filling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                      Govt / Portal Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={govtPortalFee}
                      onChange={(e) => setGovtPortalFee(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-mono outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                      NiL Service Charge (₹) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                    </label>
                    <input
                      type="number"
                      value={nilServiceCharge}
                      onChange={(e) => setNilServiceCharge(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 font-mono font-bold text-indigo-700 dark:text-indigo-300 rounded outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Documents received checklist */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Documents Received Checklist:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Aadhaar Copy',
                      'Passport Photo',
                      'Signature Specimen',
                      'Marksheet',
                      'Voter ID',
                      'Bank Passbook',
                    ].map((doc) => {
                      const checked = govtDocsReceived.includes(doc);
                      return (
                        <button
                          key={doc}
                          type="button"
                          onClick={() => toggleGovtDoc(doc)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{doc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* F. GENERAL QUANTITY FOR CARDS / PHOTOS */}
            {selectedCategory !== 'Printing' &&
              selectedCategory !== 'RestaurantServices' &&
              selectedCategory !== 'DocumentServices' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={genericQty}
                      onChange={(e) => setGenericQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                      Unit Rate (₹) <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">✎ Manual Rate</span>
                    </label>
                    <input
                      type="number"
                      value={genericRate}
                      onChange={(e) => setGenericRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded font-bold text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
          </div>

          {/* Section 4: Deadline, Advance Payment & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Priority & Delivery Time */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Promised Ready By
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Job Priority</label>
                <div className="flex items-center gap-1.5">
                  {(['normal', 'urgent', 'express'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1 rounded text-center uppercase font-bold text-[10px] border transition-colors cursor-pointer ${
                        priority === p
                          ? p === 'express'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : p === 'urgent'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Special Instructions & Attachments */}
            <div className="text-xs">
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Operator Notes & Finishing Details
              </label>
              <textarea
                rows={3}
                placeholder="Specific color code, logo instructions, paper bleed margins..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none resize-none"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Job file attached (customer_supplied_specs.pdf)</span>
              </div>
            </div>

            {/* Financial Ledger & Advance */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Job Subtotal:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualOverride) {
                        setManualSubtotal(calculatedSubtotal);
                      }
                      setIsManualOverride(!isManualOverride);
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all border ${
                      isManualOverride
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                    }`}
                  >
                    {isManualOverride ? '✓ Manual Rate Active' : '✎ Change Manual Rate/Total'}
                  </button>
                </div>
                {isManualOverride ? (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 border border-amber-300 dark:border-amber-700 rounded-md">
                    <span className="font-extrabold text-amber-900 dark:text-amber-300 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={manualSubtotal}
                      onChange={(e) =>
                        setManualSubtotal(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                      }
                      className="w-24 bg-transparent text-right font-black text-amber-950 dark:text-amber-200 tabular-nums text-xs outline-none"
                      placeholder="Custom amount"
                      title="Direct custom subtotal override"
                    />
                    <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase ml-1">Manual</span>
                  </div>
                ) : (
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums text-sm">
                    ₹{calculatedSubtotal}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Discount:</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-right font-medium"
                />
              </div>

              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-1">
                <span>Total Amount:</span>
                <span className="tabular-nums">₹{grandTotal}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Advance Paid:</span>
                <input
                  type="number"
                  min="0"
                  value={advancePaid || ''}
                  placeholder="0"
                  onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded text-right font-bold"
                />
              </div>

              <div className="flex justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
                <span>Balance Due:</span>
                <span className="tabular-nums">₹{balanceDue}</span>
              </div>

              {advancePaid > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold mb-1">
                    Advance Payment Mode:
                  </div>
                  <div className="flex gap-1">
                    {(['Cash', 'UPI', 'Card'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`flex-1 py-0.5 text-[10px] font-semibold rounded border cursor-pointer ${
                          paymentMethod === m
                            ? 'bg-slate-900 dark:bg-slate-600 text-white border-slate-900 dark:border-slate-500'
                            : 'bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error notification banner if any */}
        {formError && (
          <div className="px-6 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickWalkIn}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
            >
              Fill Walk-in Customer
            </button>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-sm">
            Summary: <span className="text-slate-800 dark:text-slate-200 font-semibold">{customSummary}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleCreateJob(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-60 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Job'
              )}
            </button>
            <button
              type="button"
              onClick={() => handleCreateJob(true)}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-indigo-300" />
                  <span>Create & Print Job Token Slip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
