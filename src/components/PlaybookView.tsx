import React from 'react';
import { motion } from 'motion/react';
import { BatteryCharging, LayoutGrid, LifeBuoy, ArrowRight, Sparkles } from 'lucide-react';

interface PlaybookViewProps {
  onStartSyncing?: () => void;
}

export const PlaybookView: React.FC<PlaybookViewProps> = ({ onStartSyncing }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative z-10 w-full max-w-[90rem] mx-auto px-6 sm:px-10 py-6 sm:py-12 flex flex-col justify-between"
    >
      {/* Header Headline */}
      <motion.div variants={itemVariants} className="text-left space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
          <Sparkles className="w-3.5 h-3.5 text-slate-900" />
          <span className="label-mono text-xs font-black uppercase text-slate-900 tracking-wider">
            Cognitive Playbook
          </span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
          How to Sync.
        </h2>
        <p className="text-xl text-slate-600 font-medium max-w-2xl leading-relaxed">
          Master your cognitive energy in 3 simple steps.
        </p>
      </motion.div>

      {/* 3 Illustrated Steps Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
      >
        {/* Card 1: The Battery (Vitality) */}
        <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-xl overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-200">
          <div className="h-48 bg-emerald-300 border-b-2 border-slate-900 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:12px_12px]" />
            <BatteryCharging className="w-24 h-24 text-slate-900 relative z-10" strokeWidth={2.2} />
          </div>
          <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 text-left space-y-3 bg-white">
            <div>
              <span className="label-mono text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Step 01 • Vitality
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                1. Check Your Battery
              </h3>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
              Before planning your day, adjust the Vitality Dial. Are you feeling sharp (High) or drained (Low)? Your schedule must match your biology.
            </p>
          </div>
        </div>

        {/* Card 2: The Blueprint (Spatial Planning) */}
        <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-xl overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-200">
          <div className="h-48 bg-violet-300 border-b-2 border-slate-900 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:12px_12px]" />
            <LayoutGrid className="w-24 h-24 text-slate-900 relative z-10" strokeWidth={2.2} />
          </div>
          <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 text-left space-y-3 bg-white">
            <div>
              <span className="label-mono text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded border border-violet-300">
                Step 02 • Architecture
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                2. Build Your Blueprint
              </h3>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
              Tasks are rooms in your day. Match High-Energy deep work to your peak hours. Let Low-Energy tasks act as corridors between deep work.
            </p>
          </div>
        </div>

        {/* Card 3: The Circuit Breaker (Smart Rescue) */}
        <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-xl overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-200">
          <div className="h-48 bg-amber-300 border-b-2 border-slate-900 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:12px_12px]" />
            <LifeBuoy className="w-24 h-24 text-slate-900 relative z-10" strokeWidth={2.2} />
          </div>
          <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 text-left space-y-3 bg-white">
            <div>
              <span className="label-mono text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                Step 03 • Protection
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                3. Trigger the Rescue
              </h3>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
              Overwhelmed? Hit Smart Rescue. The AI will detect cognitive overload and propose deferring low-priority tasks to tomorrow. You are always in control.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Interactive Bottom CTA */}
      {onStartSyncing && (
        <motion.div variants={itemVariants} className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={onStartSyncing}
            className="px-8 py-3.5 rounded-xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-[4px_4px_0px_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
          >
            <span>Launch Vitality Pulse</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
