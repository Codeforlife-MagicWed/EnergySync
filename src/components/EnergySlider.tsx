import React from 'react';
import { Zap, Activity, Feather, Sparkles } from 'lucide-react';
import { EnergyLevel, EnergyFilterMode } from '../types';

interface EnergySliderProps {
  energyScore: number;
  onEnergyScoreChange: (score: number) => void;
  energyLevel: EnergyLevel;
  filterMode: EnergyFilterMode;
  onFilterModeChange: (mode: EnergyFilterMode) => void;
}

export const EnergySlider: React.FC<EnergySliderProps> = ({
  energyScore,
  onEnergyScoreChange,
  filterMode,
  onFilterModeChange,
}) => {
  const getLevelDetails = () => {
    if (energyScore > 70) {
      return {
        level: 'High' as EnergyLevel,
        badge: 'High Energy Focus',
        badgeColor: 'text-emerald-900 bg-emerald-500/20',
        title: 'Deep Architecture & Strategic Problem Solving',
        description:
          'Your cognitive vitality is peaked. Ideal window for complex coding, high-stakes decisions, and core writing.',
        thumbBorder: '#059669',
      };
    } else if (energyScore >= 30) {
      return {
        level: 'Medium' as EnergyLevel,
        badge: 'Steady Flow State',
        badgeColor: 'text-purple-900 bg-purple-500/20',
        title: 'Collaborative Sync & Linear Execution',
        description:
          'Balanced, sustainable stamina. Ideal for code reviews, team syncs, progress updates, and structured drafting.',
        thumbBorder: '#7c3aed',
      };
    } else {
      return {
        level: 'Low' as EnergyLevel,
        badge: 'Gentle Low Energy Flow',
        badgeColor: 'text-sky-900 bg-sky-500/20',
        title: 'Frictionless Admin & Calming Sorting',
        description:
          'Low cognitive strain mode. Wind down with effortless inbox triage, note archiving, and lightweight organizing.',
        thumbBorder: '#0284c7',
      };
    }
  };

  const current = getLevelDetails();

  return (
    <div className="relative z-10 w-full max-w-[90rem] mx-auto px-6 sm:px-10 my-3">
      {/* Frameless Floating Vitality Slider */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-white/5 backdrop-blur-2xl transition-all duration-300 border-none shadow-none">
        {/* Top Row: Vitality Index & Live Value */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider ${current.badgeColor}`}>
                {current.badge}
              </span>
              {filterMode === 'auto' && (
                <span className="text-[11px] font-bold text-[#0f172a]/70 flex items-center gap-1 bg-white/20 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Filtering Active
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a]">
              How is your vitality index right now?
            </h2>
          </div>

          <div className="flex items-baseline gap-1.5 self-start sm:self-auto">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0f172a]">
              {energyScore}%
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f172a]/40">vitality</span>
          </div>
        </div>

        {/* Custom Range Slider Track */}
        <div className="relative my-4 px-1">
          <div className="flex justify-end text-[11px] font-bold uppercase tracking-wider text-[#0f172a]/50 mb-2">
            <span>{energyScore}% Capacity</span>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={energyScore}
            onChange={(e) => onEnergyScoreChange(Number(e.target.value))}
            className="custom-range"
            style={{
              borderColor: current.thumbBorder,
            }}
          />

          {/* Quick preset markers */}
          <div className="flex justify-between items-center text-[11px] font-semibold text-[#0f172a]/60 mt-3 px-1">
            <button
              type="button"
              onClick={() => onEnergyScoreChange(20)}
              className={`hover:text-sky-700 transition-colors flex items-center gap-1 cursor-pointer ${
                energyScore < 30 ? 'text-sky-700 font-bold' : ''
              }`}
            >
              <Feather className="w-3 h-3" /> Low Energy (1-29)
            </button>
            <button
              type="button"
              onClick={() => onEnergyScoreChange(55)}
              className={`hover:text-purple-700 transition-colors flex items-center gap-1 cursor-pointer ${
                energyScore >= 30 && energyScore <= 70 ? 'text-purple-700 font-bold' : ''
              }`}
            >
              <Activity className="w-3 h-3" /> Med Energy (30-70)
            </button>
            <button
              type="button"
              onClick={() => onEnergyScoreChange(85)}
              className={`hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer ${
                energyScore > 70 ? 'text-emerald-700 font-bold' : ''
              }`}
            >
              <Zap className="w-3 h-3" /> High Energy (71-100)
            </button>
          </div>
        </div>

        {/* Filter mode pills with clean whitespace */}
        <div className="pt-3 mt-3 border-t border-black/[0.06] flex items-center justify-end">
          {/* Filter Mode Control Pills */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/20">
            <button
              type="button"
              onClick={() => onFilterModeChange('auto')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === 'auto'
                  ? 'bg-[#0f172a] text-white shadow-none'
                  : 'text-[#0f172a]/60 hover:text-[#0f172a]'
              }`}
              title="Auto-filter task list by your current energy score"
            >
              Auto Match
            </button>
            <button
              type="button"
              onClick={() => onFilterModeChange('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === 'all'
                  ? 'bg-[#0f172a] text-white shadow-none'
                  : 'text-[#0f172a]/60 hover:text-[#0f172a]'
              }`}
              title="Show all tasks regardless of energy score"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={() => onFilterModeChange('high')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === 'high'
                  ? 'bg-emerald-600 text-white shadow-none'
                  : 'text-[#0f172a]/60 hover:text-emerald-700'
              }`}
            >
              High
            </button>
            <button
              type="button"
              onClick={() => onFilterModeChange('medium')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === 'medium'
                  ? 'bg-purple-600 text-white shadow-none'
                  : 'text-[#0f172a]/60 hover:text-purple-700'
              }`}
            >
              Med
            </button>
            <button
              type="button"
              onClick={() => onFilterModeChange('low')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === 'low'
                  ? 'bg-sky-600 text-white shadow-none'
                  : 'text-[#0f172a]/60 hover:text-sky-700'
              }`}
            >
              Low
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
