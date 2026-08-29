import React from 'react';

interface EnergySyncLogoProps {
  className?: string;
  size?: number;
}

export const EnergySyncLogo: React.FC<EnergySyncLogoProps> = ({
  className = 'w-10 h-10',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-slate-900 ${className}`}
      style={style}
    >
      {/* 1. Outer Heavy Ring */}
      <circle
        cx="100"
        cy="100"
        r="78"
        stroke="currentColor"
        strokeWidth="11"
        fill="none"
      />

      {/* 2. Inner Precise Ring */}
      <circle
        cx="100"
        cy="100"
        r="57"
        stroke="currentColor"
        strokeWidth="4.5"
        fill="none"
      />

      {/* 3. 12 Clock Hour Ticks */}
      <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
        {/* 12 o'clock */}
        <line x1="100" y1="22" x2="100" y2="43" />
        {/* 1 o'clock */}
        <line x1="139" y1="32.5" x2="127" y2="53.3" />
        {/* 2 o'clock */}
        <line x1="167.5" y1="61" x2="147" y2="72.8" />
        {/* 3 o'clock */}
        <line x1="178" y1="100" x2="157" y2="100" />
        {/* 4 o'clock */}
        <line x1="167.5" y1="139" x2="147" y2="127.2" />
        {/* 5 o'clock */}
        <line x1="139" y1="167.5" x2="127" y2="146.7" />
        {/* 6 o'clock */}
        <line x1="100" y1="178" x2="100" y2="157" />
        {/* 7 o'clock */}
        <line x1="61" y1="167.5" x2="73" y2="146.7" />
        {/* 8 o'clock */}
        <line x1="32.5" y1="139" x2="53" y2="127.2" />
        {/* 9 o'clock */}
        <line x1="22" y1="100" x2="43" y2="100" />
        {/* 10 o'clock */}
        <line x1="32.5" y1="61" x2="53" y2="72.8" />
        {/* 11 o'clock */}
        <line x1="61" y1="32.5" x2="73" y2="53.3" />
      </g>

      {/* 4. Power Icon at 12 o'clock */}
      <g stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M 92 48 A 9 9 0 1 0 108 48" />
        <line x1="100" y1="39" x2="100" y2="49" />
      </g>

      {/* 5. Central Dynamic Lightning Bolt */}
      <polygon
        points="114,40 90,78 77,96 122,80 85,184 105,104 122,104"
        fill="currentColor"
      />

      {/* 6. Clock Hands */}
      {/* Hour Hand (10:30 position) */}
      <polygon
        points="100,98 78,71 82,68 103,96"
        fill="currentColor"
      />
      {/* Minute Hand (2:00 position) */}
      <polygon
        points="98,98 132,65 135,69 101,102"
        fill="currentColor"
      />

      {/* 7. Central Hub & Concentric Donut Cutout */}
      <circle cx="100" cy="100" r="12" fill="currentColor" />
      <circle
        cx="100"
        cy="100"
        r="6.5"
        fill="white"
      />
      <circle cx="100" cy="100" r="2.5" fill="currentColor" />
    </svg>
  );
};

export default EnergySyncLogo;
