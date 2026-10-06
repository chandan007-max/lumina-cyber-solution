import React from 'react';

interface NiLLogoProps {
  logoUrl?: string;
  variant?: 'icon' | 'full';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  monochrome?: boolean;
}

export const NiLLogo: React.FC<NiLLogoProps> = ({
  logoUrl,
  variant = 'icon',
  className = '',
  size = 'md',
  monochrome = false,
}) => {
  const sizeClasses = {
    sm: variant === 'icon' ? 'w-8 h-8' : 'h-8',
    md: variant === 'icon' ? 'w-10 h-10' : 'h-11',
    lg: variant === 'icon' ? 'w-14 h-14' : 'h-16',
    xl: variant === 'icon' ? 'w-20 h-20' : 'h-24',
  };

  // Pure Deep Black & White Thermal Receipt Mode (No Grayscale, No Dithering, High-Contrast 1-Bit)
  if (monochrome) {
    if (logoUrl) {
      return (
        <div className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
          <img
            src={logoUrl}
            alt="NiL Printers Logo"
            className="w-full h-full object-contain"
            style={{
              imageRendering: 'pixelated',
              filter: 'grayscale(100%) contrast(400%) brightness(95%)',
            }}
          />
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crisp White Canvas with Bold Deep Black Outer Frame */}
          <rect x="4" y="4" width="192" height="192" rx="28" fill="#FFFFFF" stroke="#000000" strokeWidth="8" />

          {/* Letter N on Left in Solid Deep Black */}
          <rect x="28" y="28" width="22" height="102" rx="4" fill="#000000" />
          <path
            d="M 32 30 L 92 120 L 92 130 L 74 130 L 26 44 Z"
            fill="#000000"
          />
          <rect x="74" y="28" width="20" height="102" rx="4" fill="#000000" />

          {/* Letter P on Right in Solid Deep Black */}
          <rect x="100" y="28" width="22" height="102" rx="4" fill="#000000" />
          <path
            d="M 100 28 L 148 28 C 172 28 184 42 184 66 C 184 90 172 104 148 104 L 100 104 Z"
            fill="#000000"
          />
          {/* Inner Counter of P in Stark White */}
          <path
            d="M 122 48 L 146 48 C 158 48 164 54 164 66 C 164 78 158 84 146 84 L 122 84 Z"
            fill="#FFFFFF"
          />

          {/* Central Print Document Sheets (Bold High-Contrast Silhouette) */}
          <path
            d="M 98 42 L 130 42 L 142 54 L 142 98 C 142 101 139 103 136 103 L 98 103 Z"
            fill="#000000"
          />
          <path d="M 130 42 L 130 54 L 142 54 Z" fill="#FFFFFF" />
          <rect x="104" y="58" width="26" height="5" rx="1" fill="#FFFFFF" />
          <rect x="104" y="68" width="30" height="5" rx="1" fill="#FFFFFF" />
          <rect x="104" y="78" width="20" height="5" rx="1" fill="#FFFFFF" />

          {/* Bold NiL Thermal Wordmark Banner at Bottom */}
          <rect x="20" y="142" width="160" height="38" rx="6" fill="#000000" />
          <text
            x="100"
            y="168"
            fontFamily="'Courier New', Courier, monospace, sans-serif"
            fontWeight="900"
            fontSize="22"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="5"
          >
            NiL
          </text>
        </svg>
      </div>
    );
  }

  // If a custom image URL / data URL has been uploaded in Settings, render the uploaded image
  if (logoUrl) {
    if (variant === 'full') {
      return (
        <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
          <img
            src={logoUrl}
            alt="NiL Printers Logo"
            className={`${sizeClasses[size]} object-contain rounded-lg max-h-12`}
          />
          <div>
            <div className="flex items-baseline font-black tracking-tight text-slate-900 dark:text-white leading-none">
              <span className="text-blue-600 dark:text-blue-400 text-lg">NiL</span>
              <span className="text-slate-900 dark:text-white text-lg ml-1">Printers</span>
            </div>
            <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-orange-500 rounded-full mt-1"></div>
          </div>
        </div>
      );
    }
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={logoUrl}
          alt="NiL Printers Logo"
          className={`${sizeClasses[size]} object-contain rounded-lg`}
        />
      </div>
    );
  }

  // Exact vector reproduction of the uploaded NiL Printers NP emblem
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-2xs select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Blue Gradient for 'N' */}
            <linearGradient id="nilBlueGrad" x1="20" y1="20" x2="110" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D68FF" />
              <stop offset="100%" stopColor="#0B40D6" />
            </linearGradient>

            {/* Orange/Yellow Gradient for 'P' */}
            <linearGradient id="nilOrangeGrad" x1="100" y1="25" x2="185" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB100" />
              <stop offset="50%" stopColor="#FF7700" />
              <stop offset="100%" stopColor="#E84A00" />
            </linearGradient>

            {/* Subtle paper shadow */}
            <filter id="docShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background Rounded Shield / Stand */}
          <rect width="200" height="200" rx="36" fill="#FFFFFF" />

          {/* Letter P (Orange Loop) on Right */}
          <path
            d="M 98 25 L 148 25 C 172 25 186 42 186 68 C 186 94 172 112 146 112 L 132 112 L 132 135 L 98 135 Z"
            fill="url(#nilOrangeGrad)"
          />

          {/* Letter N (Blue Leg and Diagonal) on Left */}
          <path
            d="M 32 30 C 32 23 38 18 45 18 C 52 18 58 23 58 30 L 58 88 L 96 136 C 99 140 98 147 92 149 C 87 151 81 149 77 144 L 32 86 Z"
            fill="url(#nilBlueGrad)"
          />
          {/* Main Left Vertical of N */}
          <rect x="30" y="25" width="28" height="110" rx="14" fill="url(#nilBlueGrad)" />

          {/* White Document in Center */}
          <g filter="url(#docShadow)">
            <path
              d="M 112 36 L 146 36 L 160 50 L 160 102 C 160 105 158 107 155 107 L 112 107 C 109 107 107 105 107 102 L 107 41 C 107 38 109 36 112 36 Z"
              fill="#FFFFFF"
            />
            {/* Dog-ear corner fold */}
            <path d="M 146 36 L 146 50 L 160 50 Z" fill="#D6E4FF" />

            {/* Document text lines in blue */}
            <rect x="117" y="52" width="28" height="3" rx="1.5" fill="#1D68FF" />
            <rect x="117" y="60" width="34" height="3" rx="1.5" fill="#1D68FF" />
            <rect x="117" y="68" width="22" height="3" rx="1.5" fill="#1D68FF" />

            {/* Orange fanning paper sheets at base */}
            <path d="M 98 124 C 112 118 125 96 130 84 C 122 96 110 110 98 124 Z" fill="#FFA500" />
            <path d="M 104 124 C 120 114 138 92 146 80 C 136 94 122 110 104 124 Z" fill="#FF7700" />
          </g>
        </svg>
      </div>
    );
  }

  // Full Wordmark Variant
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      <div className={sizeClasses[size]}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-2xs select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nilBlueGrad2" x1="20" y1="20" x2="110" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D68FF" />
              <stop offset="100%" stopColor="#0B40D6" />
            </linearGradient>
            <linearGradient id="nilOrangeGrad2" x1="100" y1="25" x2="185" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB100" />
              <stop offset="50%" stopColor="#FF7700" />
              <stop offset="100%" stopColor="#E84A00" />
            </linearGradient>
            <filter id="docShadow2" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          <rect width="200" height="200" rx="36" fill="#FFFFFF" />

          {/* Letter P */}
          <path
            d="M 98 25 L 148 25 C 172 25 186 42 186 68 C 186 94 172 112 146 112 L 132 112 L 132 135 L 98 135 Z"
            fill="url(#nilOrangeGrad2)"
          />

          {/* Letter N */}
          <path
            d="M 32 30 C 32 23 38 18 45 18 C 52 18 58 23 58 30 L 58 88 L 96 136 C 99 140 98 147 92 149 C 87 151 81 149 77 144 L 32 86 Z"
            fill="url(#nilBlueGrad2)"
          />
          <rect x="30" y="25" width="28" height="110" rx="14" fill="url(#nilBlueGrad2)" />

          {/* Document */}
          <g filter="url(#docShadow2)">
            <path
              d="M 112 36 L 146 36 L 160 50 L 160 102 C 160 105 158 107 155 107 L 112 107 C 109 107 107 105 107 102 L 107 41 C 107 38 109 36 112 36 Z"
              fill="#FFFFFF"
            />
            <path d="M 146 36 L 146 50 L 160 50 Z" fill="#D6E4FF" />
            <rect x="117" y="52" width="28" height="3" rx="1.5" fill="#1D68FF" />
            <rect x="117" y="60" width="34" height="3" rx="1.5" fill="#1D68FF" />
            <rect x="117" y="68" width="22" height="3" rx="1.5" fill="#1D68FF" />
            <path d="M 98 124 C 112 118 125 96 130 84 C 122 96 110 110 98 124 Z" fill="#FFA500" />
            <path d="M 104 124 C 120 114 138 92 146 80 C 136 94 122 110 104 124 Z" fill="#FF7700" />
          </g>
        </svg>
      </div>

      <div>
        <div className="flex items-baseline font-black tracking-tight text-slate-900 dark:text-white leading-none">
          <span className="text-blue-600 dark:text-blue-400 text-lg">NiL</span>
          <span className="text-slate-900 dark:text-white text-lg ml-1">Printers</span>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-orange-500 rounded-full mt-1"></div>
      </div>
    </div>
  );
};
