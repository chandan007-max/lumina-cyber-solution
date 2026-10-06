// Centralized Thermal Printer Configuration (Single Source of Truth)
// Used by ThermalReceipt, PrintReceiptModal, and SettingsView

export interface ThermalConfig {
  paperWidthMm: number; // Physical paper roll width (58mm)
  printableWidthMm: number; // Active printable width (default 48mm)
  leftOffsetMm: number; // Calibrated left origin offset (default 0mm)
  printScale: number; // Calibrated print scale (default 0.90 = 90% exact match)
  dpi: number; // 203 DPI standard POS
  deepBlack: boolean; // 1-bit deep black rendering without grayscale antialiasing
  largeLetters: boolean; // Increased letter clarity on 58mm
  logoMode: 'emblem' | 'compact' | 'none';
  thermalDebug: boolean; // Visual debug overlays (origin arrow, boundary ruler, dot specs)
}

export const DEFAULT_THERMAL_CONFIG: ThermalConfig = {
  paperWidthMm: 58,
  printableWidthMm: 48,
  leftOffsetMm: 0,
  printScale: 0.90, // Calibrated 90% scale as confirmed by physical print test
  dpi: 203,
  deepBlack: true,
  largeLetters: true,
  logoMode: 'emblem',
  thermalDebug: false,
};

export const THERMAL_CONFIG_STORAGE_KEY = 'nil_thermal_printer_calib_v3';

export function loadThermalConfig(): ThermalConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(THERMAL_CONFIG_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_THERMAL_CONFIG,
        ...parsed,
        printScale: typeof parsed.printScale === 'number' ? parsed.printScale : 0.90,
        printableWidthMm: typeof parsed.printableWidthMm === 'number' ? parsed.printableWidthMm : 48,
        leftOffsetMm: typeof parsed.leftOffsetMm === 'number' ? parsed.leftOffsetMm : 0,
      };
    }
  } catch (err) {
    console.warn('Failed to load thermal config from localStorage:', err);
  }
  return DEFAULT_THERMAL_CONFIG;
}

export function saveThermalConfig(config: ThermalConfig): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THERMAL_CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn('Failed to save thermal config to localStorage:', err);
  }
}
