import { safeStorage } from '../../src/services/storage';

const PROHIBITED_STORAGE_PATTERNS = [
  /(?:password|smtp_pass|smtp_password)\s*["']?\s*:\s*["'][^"']+["']/i,
  /BEGIN (RSA )?PRIVATE KEY/,
  /LCS_STATION_VAULT_MASTER/,
  /sec_api_[0-9a-fA-F]+/,
  /eyJhbGciOiJSUzI1Ni/,
];

const allStorageKeys = [
  'nil_printers_pos_config',
  'nil_printers_pos_customers',
  'nil_printers_pos_invoices',
  'nil_printers_pos_jobs',
  'nil_printers_pos_services',
  'nil_printers_pos_materials',
  'nil_printers_pos_expenses',
  'nil_printers_pos_debug_logs',
];

for (const k of allStorageKeys) {
  const val = safeStorage.getItem(k) || '';
  console.log(`Key ${k} length: ${val.length}`);
  for (const pat of PROHIBITED_STORAGE_PATTERNS) {
    if (pat.test(val)) {
      console.log(`LEAK in ${k}: ${pat}`);
    }
  }
}
console.log('OFFLINE CHECK DONE.');
