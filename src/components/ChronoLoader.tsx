import React from 'react';
import { motion } from 'motion/react';

interface ChronoLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'pet' | 'clock';
}

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const ChronoLoader: React.FC<ChronoLoaderProps> = ({
  size = 'sm',
  className = 'text-current',
  variant = 'pet',
}) => {
  const sizeClass = sizeMap[size] || sizeMap.sm;

  if (variant === 'clock') {
    return (
      <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Clock Outer Rim */}
          <circle cx="12" cy="12" r="9" />
          {/* Static Hour Hand */}
          <line x1="12" y1="12" x2="12" y2="7" />
        </svg>
        {/* Spinning Minute Hand */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-full h-full relative">
            <span
              className="absolute left-1/2 bottom-1/2 w-[2px] h-[36%] -translate-x-1/2 bg-current rounded-full origin-bottom"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Thematic Monochrome Outline Chrono-Egg Pet with flapping wings & spinning clock center
  return (
    <motion.div
      animate={{
        y: [0, -2.5, 0],
        scaleY: [1, 0.94, 1],
      }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full overflow-visible"
      >
        {/* Left Wing Flapping */}
        <motion.path
          d="M 6 15 C 2 12, 1 18, 7 20"
          animate={{ rotate: [-15, 20, -15], originX: '7px', originY: '17px' }}
          transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Right Wing Flapping */}
        <motion.path
          d="M 26 15 C 30 12, 31 18, 25 20"
          animate={{ rotate: [15, -20, 15], originX: '25px', originY: '17px' }}
          transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Chrono-Egg Body */}
        <ellipse cx="16" cy="17" rx="9" ry="11" />

        {/* Inner Clock Face Frame */}
        <circle cx="16" cy="17" r="4.5" strokeWidth="2" />

        {/* Halo / Top Ring Accent */}
        <path d="M 12 5 C 14 3.5, 18 3.5, 20 5" strokeWidth="2" />
      </svg>

      {/* Spinning Center Clock Hand */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="w-[2px] h-[22%] bg-current rounded-full origin-bottom translate-y-[-18%]" />
      </motion.div>
    </motion.div>
  );
};
