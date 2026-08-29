import React from 'react';
import { Mail, Sparkles, Sun, ArrowRight, Activity, Plus, Zap, Feather } from 'lucide-react';
import { motion } from 'motion/react';
import { EnergyLevel, EnergyFilterMode, Task } from '../types';
import { normalizeEnergy } from './Badges';
import { isTaskInBucket } from '../utils/dateUtils';
import { ChronoLoader } from './ChronoLoader';

interface VitalityPulseDashboardProps {
  energyScore: number;
  onEnergyScoreChange: (score: number) => void;
  energyLevel: EnergyLevel;
  filterMode: EnergyFilterMode;
  onFilterModeChange: (mode: EnergyFilterMode) => void;
  onScanInbox: () => void;
  isScanning: boolean;
  onRescueMe: () => void;
  isRescuing: boolean;
  pendingTodayCount: number;
  tasks: Task[];
  onNavigateToActionBoard: () => void;
  onOpenCreateModal?: () => void;
}

export const VitalityPulseDashboard: React.FC<VitalityPulseDashboardProps> = ({
  energyScore,
  onEnergyScoreChange,
  energyLevel,
  filterMode,
  onFilterModeChange,
  onScanInbox,
  isScanning,
  onRescueMe,
  isRescuing,
  pendingTodayCount,
  tasks,
  onNavigateToActionBoard,
  onOpenCreateModal,
}) => {
  // Compute aligned tasks count with normalized energy and date checking
  const todayTasks = tasks.filter((t) => isTaskInBucket(t, 'today') && t.status !== 'completed');
  const matchingTasks = todayTasks.filter(
    (t) => normalizeEnergy(t.energyLevel) === normalizeEnergy(energyLevel)
  );
  const matchingMinutes = matchingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);

  const getLevelDetails = () => {
    if (energyScore > 70) {
      return {
        level: 'High' as EnergyLevel,
        statusTag: 'Peak High Energy',
        tagStyles: 'text-slate-900 bg-emerald-300 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] font-black tracking-wide',
        summary: 'Deep architectural focus, complex algorithms, and high-impact strategic execution.',
        accentColor: '#059669',
      };
    } else if (energyScore >= 30) {
      return {
        level: 'Medium' as EnergyLevel,
        statusTag: 'Balanced Medium Energy',
        tagStyles: 'text-slate-900 bg-purple-300 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] font-black tracking-wide',
        summary: 'Balanced stamina for collaborative syncs, code reviews, writing, and structured progress.',
        accentColor: '#7c3aed',
      };
    } else {
      return {
        level: 'Low' as EnergyLevel,
        statusTag: 'Gentle Low Energy',
        tagStyles: 'text-slate-900 bg-sky-300 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] font-black tracking-wide',
        summary: 'Frictionless admin, inbox processing, quiet organizing, and gentle micro-tasks.',
        accentColor: '#0284c7',
      };
    }
  };

  const details = getLevelDetails();

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
    <div className="relative z-10 w-full max-w-[90rem] mx-auto px-6 sm:px-10 py-6 sm:py-10 flex flex-col justify-between min-h-[calc(100vh-140px)]">
      {/* Main Orchestrated Content Area with Framer Motion Staggering */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 my-auto flex flex-col justify-center"
      >
        {/* Bold Hero Headline (Neo-Brutalist Typography) */}
        <motion.div variants={itemVariants} className="pt-2 sm:pt-4">
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">
            Architect Your Focus.
          </h2>
          <p className="text-xl text-slate-600 font-medium mb-10 md:mb-12 max-w-2xl leading-relaxed">
            A cognitive time-orchestration engine that adapts to your daily vitality.
          </p>
        </motion.div>

        {/* 2-Column Responsive Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Column: Vitality Pane */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="giant-percent text-[#0f172a] select-none font-extrabold">
              {energyScore}%
            </div>

            <div className="max-w-lg space-y-2 text-sm sm:text-base text-[#0f172a]/80 leading-relaxed">
              <p>
                <strong className="text-[#0f172a] font-bold">Vitality Pulse: </strong>
                <span>{details.summary}</span>
              </p>
              {matchingTasks.length > 0 ? (
                <p className="text-xs text-[#0f172a]/70 pt-1 font-medium">
                  Currently <strong className="text-[#0f172a] font-mono font-black">{matchingTasks.length}</strong> matching {details.level}-energy task{matchingTasks.length > 1 ? 's' : ''} in Today ({matchingMinutes}m estimated).
                </p>
              ) : (
                <p className="text-xs text-[#0f172a]/60 pt-1">
                  No active tasks in Today matching your current {details.level} energy window.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Control Pane (Main Neo-Brutalist Container) */}
          <div className="flex flex-col justify-center gap-6 bg-white/95 backdrop-blur-md p-6 sm:p-10 rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a]">
            {/* Slider Sub-container */}
            <div className="w-full space-y-3 bg-slate-50/80 p-5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="label-mono text-slate-900 font-extrabold text-xs">Adjust Capacity</span>
                <span className="label-mono text-slate-900 font-black text-xs bg-amber-300 border-2 border-slate-900 px-2 py-0.5 rounded-md shadow-[2px_2px_0px_#0f172a]">
                  {energyScore}% ({energyLevel.toUpperCase()})
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                value={energyScore}
                onChange={(e) => onEnergyScoreChange(Number(e.target.value))}
                className="custom-range cursor-pointer"
              />

              <div className="label-mono flex justify-between gap-2 text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => onEnergyScoreChange(20)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 font-black text-[11px] transition-all cursor-pointer ${
                    energyScore < 30
                      ? 'bg-sky-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-sky-100 text-slate-700 shadow-[1px_1px_0px_#0f172a] hover:translate-y-[1px]'
                  }`}
                >
                  Rest 20%
                </button>
                <button
                  type="button"
                  onClick={() => onEnergyScoreChange(50)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 font-black text-[11px] transition-all cursor-pointer ${
                    energyScore >= 30 && energyScore <= 70
                      ? 'bg-purple-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-purple-100 text-slate-700 shadow-[1px_1px_0px_#0f172a] hover:translate-y-[1px]'
                  }`}
                >
                  Neutral 50%
                </button>
                <button
                  type="button"
                  onClick={() => onEnergyScoreChange(85)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 font-black text-[11px] transition-all cursor-pointer ${
                    energyScore > 70
                      ? 'bg-emerald-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-emerald-100 text-slate-700 shadow-[1px_1px_0px_#0f172a] hover:translate-y-[1px]'
                  }`}
                >
                  Peak 85%
                </button>
              </div>
            </div>

            {/* Action Buttons: 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Action Button 1: Scan Mail (Neo-Brutalist Dark Card) */}
              <button
                type="button"
                onClick={onScanInbox}
                disabled={isScanning}
                className="bg-slate-900 hover:bg-slate-850 text-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] active:translate-y-[4px] active:shadow-none flex flex-col justify-between gap-3 text-left cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="label-mono text-[10px] text-white/80 font-black tracking-wider">Gmail Inbox AI</span>
                  <Mail className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg text-white flex items-center gap-2 tracking-tight">
                    {isScanning ? (
                      <>
                        <ChronoLoader size="sm" className="text-emerald-400" />
                        <span>Analyzing Inbox...</span>
                      </>
                    ) : (
                      <span>Scan Mail</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                    {isScanning ? 'Extracting tasks via Gemini...' : 'Extract tasks via Gemini'}
                  </div>
                </div>
              </button>

              {/* Action Button 2: Smart Rescue (Neo-Brutalist Amber Card) */}
              <button
                type="button"
                onClick={onRescueMe}
                disabled={isRescuing || pendingTodayCount === 0}
                title={
                  pendingTodayCount === 0
                    ? 'No pending tasks for today to rescue'
                    : 'Check capacity and defer tasks to Tomorrow'
                }
                className="bg-amber-300 hover:bg-amber-400 text-slate-900 p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0f172a] active:translate-y-[4px] active:shadow-none flex flex-col justify-between gap-3 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="label-mono text-[10px] text-slate-900/80 font-black tracking-wider">Capacity Deferral</span>
                  <Sun className={`w-4 h-4 text-slate-900 group-hover:scale-110 transition-all ${isRescuing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg text-slate-900 flex items-center justify-between tracking-tight">
                    <span>{isRescuing ? 'Evaluating...' : 'Smart Rescue'}</span>
                    {pendingTodayCount > 0 && (
                      <span className="label-mono text-[9px] bg-slate-900 text-amber-300 px-2 py-0.5 rounded-full font-black border border-slate-900">
                        {pendingTodayCount} PENDING
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-800 font-semibold mt-0.5">Time-aware deferral</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Bar matching design variation */}
      <footer className="w-full flex items-center justify-end gap-4 border-t-2 border-[#0f172a] pt-6 mt-8">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onNavigateToActionBoard}
            className="border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-y-[4px] active:shadow-none bg-white hover:bg-slate-50 text-slate-900 font-black px-5 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm cursor-pointer group"
          >
            <span>Open Action Board</span>
            <ArrowRight className="w-4 h-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal || onNavigateToActionBoard}
            className="border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-y-[4px] active:shadow-none bg-violet-600 hover:bg-violet-700 text-white font-black px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 cursor-pointer"
          >
            <span className="tracking-wide uppercase">NEW ACTION</span>
            <span className="label-mono text-xs border border-white px-1.5 py-0.2 rounded font-mono">
              +
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

