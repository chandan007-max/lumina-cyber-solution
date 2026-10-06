import React from 'react';
import { ThermalConfig } from './thermalConfig';

interface ThermalCalibrationPatternProps {
  thermalConfig: ThermalConfig;
  businessName?: string;
}

export const ThermalCalibrationPattern: React.FC<ThermalCalibrationPatternProps> = ({
  thermalConfig,
  businessName = 'NIL PRINTERS',
}) => {
  const { printableWidthMm, leftOffsetMm, paperWidthMm, dpi } = thermalConfig;
  const dotsPerMm = dpi / 25.4;
  const totalDots = Math.round(printableWidthMm * dotsPerMm);

  // Markers at 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 mm
  const tickSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div
      className="text-black font-mono select-text"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        color: '#000000',
        padding: '0 0.5mm',
      }}
    >
      {/* Calibration Header */}
      <div className="text-center border-b-2 border-black pb-1 mb-1">
        <div className="text-[12px] font-black uppercase tracking-tight leading-tight">
          {businessName}
        </div>
        <div className="text-[10px] font-black uppercase bg-black text-white px-1 py-0.5 my-1 inline-block">
          58MM HORIZONTAL CALIBRATION
        </div>
        <div className="text-[8.5px] font-bold leading-tight">
          Paper: {paperWidthMm}mm · Printable: {printableWidthMm}mm ({totalDots} dots)
        </div>
        <div className="text-[8.5px] font-black text-black">
          ACTIVE LEFT OFFSET: {leftOffsetMm >= 0 ? `+${leftOffsetMm}` : leftOffsetMm}mm
        </div>
      </div>

      {/* Extreme Left / Right Physical Origin Check */}
      <div className="border border-black p-0.5 mb-1 text-[8px] font-bold leading-tight">
        <div className="flex justify-between items-center text-[8px] font-black border-b border-black pb-0.5">
          <span>[&lt; 0mm ORIGIN]</span>
          <span>[58mm ROLL &gt;]</span>
        </div>
        <div className="text-[7.5px] mt-0.5 leading-snug">
          Inspect physical paper: If leftmost [L] or [0] is cut off, INCREASE left offset (+1mm, +2mm).
          If large blank space on left, DECREASE left offset (0mm, -1mm).
        </div>
      </div>

      {/* Visual Alignment Grid from 0mm to 55mm */}
      <div className="border-t-2 border-b-2 border-black py-1 my-1">
        <div className="text-[8.5px] font-black mb-0.5">
          MM TICK RULER (MEASURE WITH RULER):
        </div>

        {/* 5mm Alternating Contrast Blocks */}
        <div className="flex w-full border border-black mb-1 overflow-hidden" style={{ height: '7px' }}>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((step, idx) => (
            <div
              key={step}
              style={{
                width: '5mm',
                maxWidth: '5mm',
                minWidth: '5mm',
                height: '100%',
                backgroundColor: idx % 2 === 0 ? '#000000' : '#ffffff',
              }}
              title={`${step}mm - ${step + 5}mm`}
            />
          ))}
        </div>

        {/* Horizontal Tick Labels */}
        <div className="text-[7px] font-mono font-black tracking-tighter leading-tight whitespace-nowrap overflow-hidden">
          |00 |05 |10 |15 |20 |25 |30 |35 |40 |45 |50 |55|
        </div>
        <div className="text-[7px] font-mono leading-none tracking-tighter overflow-hidden">
          |---|---|---|---|---|---|---|---|---|---|---|---|
        </div>
      </div>

      {/* L-E-F-T and Character Position Matrix */}
      <div className="border-b-2 border-dashed border-black pb-1 mb-1 font-mono text-[9px] leading-snug">
        <div className="font-black text-[8px] uppercase mb-0.5">
          CHARACTER ORIGIN MATRIX:
        </div>

        <div className="flex items-start gap-1">
          {/* Vertical LEFT indicator */}
          <div className="border-r-2 border-black pr-1 font-black text-[8.5px] text-center leading-tight">
            <div>L</div>
            <div>E</div>
            <div>F</div>
            <div>T</div>
          </div>

          {/* Test Columns */}
          <div className="flex-1 min-w-0 font-bold text-[8px] leading-tight space-y-0.5">
            <div className="break-all font-mono font-black">
              0123456789012345678901234567890123456789
            </div>
            <div className="break-all font-mono">
              XXXXXXXXXX----------XXXXXXXXXX----------
            </div>
            <div className="break-all font-mono font-bold">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
            </div>
            <div className="break-all font-mono">
              ₹10 ₹20 ₹50 ₹100 ₹200 ₹500 ₹2000 ₹FREE
            </div>
          </div>
        </div>
      </div>

      {/* Sample Items at Current Alignment */}
      <div className="border-b-2 border-dashed border-black pb-1 mb-1 text-[9.5px]">
        <div className="flex justify-between font-black text-[8.5px] border-b border-black pb-0.5 mb-0.5">
          <span>ITEM DESCRIPTION</span>
          <span className="text-right">AMOUNT</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="font-bold truncate pr-1">1. Leftmost Margin Check</span>
          <span className="font-black font-mono shrink-0">₹100</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="font-bold truncate pr-1">2. Center Column Balance</span>
          <span className="font-black font-mono shrink-0">₹250</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="font-bold truncate pr-1">3. Right Edge Check (₹)</span>
          <span className="font-black font-mono shrink-0">₹999</span>
        </div>
      </div>

      {/* Calibration Footer */}
      <div className="text-center text-[8px] space-y-0.5 pt-0.5">
        <div className="font-black text-[9px]">
          CALIBRATION COMPLETED
        </div>
        <div>Adjust "Left Offset" in POS if needed</div>
        <div className="font-mono font-bold">
          LUMINA POS · 58mm Origin Calibrator
        </div>
        <div className="text-[7.5px] text-black pt-0.5">
          Time: {new Date().toLocaleTimeString('en-IN')}
        </div>
      </div>
    </div>
  );
};
