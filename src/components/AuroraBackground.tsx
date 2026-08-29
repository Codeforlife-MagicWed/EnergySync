import React from 'react';
import { EnergyLevel } from '../types';

interface AuroraBackgroundProps {
  energyLevel: EnergyLevel;
  energyScore: number;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  energyLevel,
}) => {
  const getGradients = () => {
    switch (energyLevel) {
      case 'High':
        return {
          blob1: 'from-[#ffdfd3] via-[#fbc2eb] to-transparent',
          blob2: 'from-[#ffcfdf] via-[#ffdfd3] to-transparent',
          blob3: 'from-[#e0c3fc] via-[#fbc2eb] to-transparent',
          baseAura: 'rgba(255, 223, 211, 0.35)',
        };
      case 'Low':
        return {
          blob1: 'from-[#8ec5fc] via-[#e0c3fc] to-transparent',
          blob2: 'from-[#84fab0] via-[#8ec5fc] to-transparent',
          blob3: 'from-[#e0c3fc] via-[#8ec5fc] to-transparent',
          baseAura: 'rgba(142, 197, 252, 0.35)',
        };
      case 'Medium':
      default:
        return {
          blob1: 'from-[#ffdfd3] via-[#e0c3fc] to-transparent',
          blob2: 'from-[#e0c3fc] via-[#8ec5fc] to-transparent',
          blob3: 'from-[#fbc2eb] via-[#8ec5fc] to-transparent',
          baseAura: 'rgba(224, 195, 252, 0.35)',
        };
    }
  };

  const gradients = getGradients();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#ffffff]">
      {/* Base radial gradients matching the multi-spectrum aurora design */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `
            radial-gradient(at 0% 0%, #ffdfd3 0px, transparent 55%),
            radial-gradient(at 100% 0%, #e0c3fc 0px, transparent 55%),
            radial-gradient(at 100% 100%, #8ec5fc 0px, transparent 55%),
            radial-gradient(at 0% 100%, #ffcfdf 0px, transparent 55%),
            #ffffff
          `,
        }}
      />

      {/* Floating Animated Aurora Blob 1 */}
      <div
        className={`absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-tr ${gradients.blob1} blur-[110px] opacity-75 aurora-blob-1 transition-all duration-1000`}
      />

      {/* Floating Animated Aurora Blob 2 */}
      <div
        className={`absolute top-[20%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl ${gradients.blob2} blur-[120px] opacity-70 aurora-blob-2 transition-all duration-1000`}
      />

      {/* Floating Animated Aurora Blob 3 */}
      <div
        className={`absolute -bottom-[15%] left-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr ${gradients.blob3} blur-[110px] opacity-70 aurora-blob-3 transition-all duration-1000`}
      />

      {/* Subtle organic light sheen */}
      <div className="absolute inset-0 bg-radial from-transparent via-white/10 to-white/30" />
    </div>
  );
};
