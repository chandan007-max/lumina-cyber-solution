export * from './license';
export * from './communication';
export * from './operations';
import { CustomerCommunicationPreference, BusinessCommunicationConfig } from './communication';

export type ServiceCategory =
  | 'Printing'
  | 'PhotoDesign'
  | 'DocumentServices'
  | 'Cards'
  | 'RestaurantServices'
  | 'Other';

export type JobStatus =
  | 'received'
  | 'designing'
  | 'approved'
  | 'printing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Mixed' | 'Due';

export type UserRole = 'Admin' | 'Billing Staff' | 'Designer' | 'Operator' | 'Accountant';

export interface ServiceItem {
  id: string;
  businessId?: string;
  code?: string;
  name: string;
  category: ServiceCategory;
  pricingType: 'unit' | 'sqft' | 'menu_tier' | 'photo_size' | 'xerox_matrix' | 'govt_service';
  baseRate: number;
  unitLabel: string;
  doubleSideRate?: number;
  minCharge?: number;
  description?: string;
  popular?: boolean;
}

export interface FlexSpecs {
  widthFt: number;
  heightFt: number;
  material: 'Flex 340 GSM' | 'Star Flex' | 'Vinyl' | 'Backlit Film' | 'One Way Vision';
  finishing: 'Eyelet' | 'Pipe Pockets' | 'Iron Frame Fitting' | 'Wooden Frame Fitting' | 'Frame Fitting' | 'None';
  designOption: 'Customer Supplied' | 'NiL In-House Design' | 'Minor Edit';
  sideOption?: 'Single Side' | 'Both Side (Double Sided)';
  ratePerSqft: number;
  designCharge: number;
  areaSqft: number;
  framePerimeterFt?: number;
  frameRatePerFt?: number;
  frameLabourCharge?: number;
  frameTotalPrice?: number;
}

export interface XeroxSpecs {
  paperSize: 'A4' | 'A3' | 'Legal';
  colorMode: 'B&W' | 'Colour';
  sideMode: 'Single Side' | 'Double Side';
  pages: number;
  copies: number;
  ratePerPage: number;
}

export interface RestaurantMenuSpecs {
  restaurantName: string;
  menuType: 'Booklet' | 'Single Card' | 'Bi-Fold' | 'Tri-Fold' | 'Tent Card';
  menuSize: 'A4' | 'A3' | 'Slim A4';
  pagesCount: number;
  paperGsm: '300 GSM Art Card' | '250 GSM Board' | '350 GSM Heavy Board' | '170 GSM Gloss';
  lamination: 'Matte Lamination' | 'Gloss Lamination' | 'Velvet Thermal' | 'None';
  binding: 'Center Pin / Staple' | 'Wire-O Spiral' | 'Hardcase Bound' | 'Crease & Fold';
  designRequired: boolean;
  designCharge: number;
  printRatePerCopy: number;
  copies: number;
}

export interface RestaurantBillSpecs {
  bookType: 'Bill Book' | 'KOT Book' | 'Cash Memo' | 'Challan';
  size: '1/8 Demy' | '1/6 Demy' | '1/4 Demy' | 'Custom';
  copiesPerBook: '50 Duplicates' | '100 Duplicates' | '50 Triplicates' | '100 Singles';
  paperType: 'Carbonless (NCR)' | 'Maplitho 60 GSM' | 'Bond Paper';
  serialPrefix: string;
  startNo: number;
  bindingType: 'Soft Paper Pad' | 'Hard Cover Bound';
  booksQty: number;
  ratePerBook: number;
}

export interface DocumentGovtSpecs {
  serviceType: 'New PAN Card' | 'PAN Correction' | 'Aadhaar Print/Update' | 'Online Govt Form' | 'Employment Application' | 'EPFO Service' | 'Digital Signature';
  docsReceived: string[];
  acknowledgmentNo?: string;
  govtPortalFee: number;
  nilServiceCharge: number;
  documentStatus: 'Received' | 'Scanning' | 'Processing' | 'Submitted' | 'Certificate Ready';
}

export interface CardSpecs {
  cardType: 'PVC Smart Card' | 'Visiting Card (350 GSM Matte)' | 'Visiting Card (Spot UV)' | 'ID Card with Lanyard' | 'Membership Card';
  corners: 'Square' | 'Rounded';
  doubleSided: boolean;
  designCharge: number;
  quantity: number;
  ratePerUnit: number;
}

export interface PhotoFrameSpecs {
  size: 'Passport (8 pcs)' | 'Stamp Size (16 pcs)' | '4x6 Inch' | '6x8 Inch' | '8x10 Inch' | '12x18 Inch' | 'A4 Size';
  frameType: 'Photo Only' | 'Glass Synthetic Frame' | 'Wooden Border Frame' | 'Acrylic Floating Frame';
  copies: number;
  rate: number;
}

export interface JobItem {
  id: string; // e.g. NP-2026-00125
  businessId?: string;
  businessProfileSnapshot?: BusinessProfile;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;

  serviceCategory: ServiceCategory;
  serviceName: string;
  
  // Specific specifications based on category
  flexSpecs?: FlexSpecs;
  xeroxSpecs?: XeroxSpecs;
  menuSpecs?: RestaurantMenuSpecs;
  restaurantBillSpecs?: RestaurantBillSpecs;
  documentGovtSpecs?: DocumentGovtSpecs;
  cardSpecs?: CardSpecs;
  photoSpecs?: PhotoFrameSpecs;

  customSpecsSummary: string; // 1-line human readable summary e.g. "8x4 ft Flex 340 GSM + Eyelet (2 pcs)"
  quantity: number;
  
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;

  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
    staff: string;
  }[];

  status: JobStatus;
  priority: 'normal' | 'urgent' | 'express';
  deliveryDeadline?: string;
  notes?: string;
  
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];

  createdByStaff: string;
  invoiceId?: string;
}

export interface Customer {
  id: string;
  businessId?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  gstin?: string;
  businessName?: string;
  totalOrdersAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  jobCount: number;
  notes?: string;
  communicationPreferences?: CustomerCommunicationPreference;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  category: ServiceCategory;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  details?: string;
}

export interface Invoice {
  id: string; // NP-INV-000125
  businessId?: string;
  businessProfileSnapshot?: BusinessProfile;
  date: string;
  type: 'quick' | 'job';
  jobId?: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  staff: string;
}

export interface MaterialItem {
  id: string;
  businessId?: string;
  name: string;
  category: 'Paper' | 'Flex & Vinyl' | 'Cards & Pouches' | 'Inks & Toners' | 'Hardware & Binding' | 'Frames';
  unit: string;
  currentStock: number;
  minStockLevel: number;
  costPerUnit: number;
  supplier?: string;
  lastRestocked: string;
}

export interface ExpenseItem {
  id: string;
  businessId?: string;
  date: string;
  title: string;
  category: 'Electricity' | 'Paper & Media' | 'Inks & Toners' | 'Raw Material & Stock' | 'Rent' | 'Internet & Cyber' | 'Outsourcing' | 'Staff Salary' | 'Machine Maintenance' | 'Tea & Snacks' | 'Other';
  amount: number;
  paymentMethod: PaymentMethod;
  paidTo?: string;
  notes?: string;
  materialId?: string;
  materialName?: string;
  restockQuantity?: number;
}

export interface StaffUser {
  id: string;
  businessId?: string;
  name: string;
  role: UserRole;
  phone: string;
}

export type BusinessType =
  | 'Cyber Café'
  | 'Digital Service Centre'
  | 'Printing Shop'
  | 'Xerox Centre'
  | 'Graphics & Designing'
  | 'Cyber Café & Printing'
  | 'Other';

export interface BusinessProfile {
  businessId: string;
  businessName: string;
  displayName: string;
  legalName?: string;
  gstin?: string;
  businessType: BusinessType | string;
  tagline: string;
  logoUrl?: string; // Base64 or image data URL
  addressLine1: string;
  addressLine2?: string;
  locality?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country: string;
  mobile: string;
  alternateMobile?: string;
  WhatsAppNumber?: string;
  email: string;
  alternateEmail?: string;
  website?: string;
  ownerName: string;
  contactPerson: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingConfig {
  invoicePrefix: string;       // e.g. "INV-2026-"
  invoiceStartNumber: number;  // e.g. 1
  currentSequence: number;     // e.g. 128
  invoiceTitle: string;        // e.g. "TAX INVOICE"
  currencySymbol: string;      // e.g. "₹"
  defaultPaymentMethod: PaymentMethod;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showCustomerDetails: boolean;
  showPaymentMethod: boolean;
  showDueAmount: boolean;
  showUpiQr: boolean;
  footerText: string;
  termsAndConditions: string[];
  authorizedSignatureText: string;
  thankYouMessage: string;
}

export interface GstConfig {
  enabled: boolean;
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  registrationType?: 'regular' | 'composition' | 'unregistered' | string;
  state?: string;
  stateCode?: string;
  defaultTaxMode?: 'inclusive' | 'exclusive';
  defaultTaxRate?: number;
}

export interface BankAccountDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountHolder?: string;
}

export interface PaymentConfig {
  acceptedMethods: PaymentMethod[];
  defaultPaymentMethod: PaymentMethod;
  upiId: string;
  upiQrName: string;
  paymentInstructions?: string;
  bankDetails?: BankAccountDetails;
}

export interface SetupTracker {
  isWizardCompleted: boolean;
  completedSteps: string[]; // ['identity', 'billing', 'gst', 'printer', 'finish']
  dismissedWidget?: boolean;
}

export interface BusinessConfig {
  configVersion: number; // 1
  profile: BusinessProfile;
  billing: BillingConfig;
  gst: GstConfig;
  payment: PaymentConfig;
  setup: SetupTracker;
  communication?: BusinessCommunicationConfig;

  // Legacy flat fields for backward compatibility across existing views
  businessName: string;
  tagline: string;
  address: string;
  pincode: string;
  phones: string[];
  contactPerson: string;
  emails: string[];
  gstin?: string;
  logoUrl?: string;
  upiId: string;
  upiQrName: string;
  printerMode: 'thermal80' | 'thermal58' | 'a4';
  themeMode?: 'light' | 'dark' | 'system';
  termsAndConditions: string[];
  docRetentionDays: number;
  lastBackupDate?: string;
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

export interface DebugLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: 'job' | 'payment' | 'invoice' | 'inventory' | 'customer' | 'system';
  action: string;
  actor: string;
  message: string;
  details?: Record<string, any>;
}

// ==========================================
// CYBER CAFÉ SPECIFIC DOMAIN TYPES (PHASE 15)
// ==========================================

export type WorkstationStatus = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'OFFLINE';

export interface CyberWorkstation {
  id: string;
  businessId: string;
  name: string;
  ipAddress?: string;
  status: WorkstationStatus;
  hourlyRate: number;
  minCharge: number;
  currentSessionId?: string | null;
  createdAt: string;
}

export interface ComputerSession {
  id: string;
  businessId: string;
  workstationId: string;
  workstationName: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes: number;
  hourlyRate: number;
  minCharge: number;
  calculatedCharge: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  billedInvoiceId?: string | null;
  operatorStaffId: string;
}

export type PrintClassification =
  | 'PRINT COMMAND GENERATED'
  | 'PRINT QUEUED'
  | 'DRIVER ACCEPTED'
  | 'PHYSICAL PRINT CONFIRMED'
  | 'FAILED';

export interface PrintJobRecord {
  id: string;
  businessId: string;
  documentType: 'receipt' | 'document' | 'photo' | 'report';
  documentTitle: string;
  printerName: string;
  printerType: 'thermal80' | 'thermal58' | 'a4_laser' | 'inkjet_photo';
  copies: number;
  pages: number;
  status: PrintClassification;
  createdAt: string;
  dispatchedAt?: string;
  operator: string;
  notes?: string;
}

export interface OfflineSyncRecord {
  id: string;
  businessId: string;
  entityType: 'invoice' | 'session' | 'customer' | 'job';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  queuedAt: string;
  syncedAt?: string;
  status: 'QUEUED' | 'SYNCED' | 'FAILED';
  retryCount: number;
  error?: string;
}
