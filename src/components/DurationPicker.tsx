import React, { useState, useEffect } from 'react';
import { Clock, Plus, Minus, Sparkles, ChevronDown } from 'lucide-react';

export interface DurationPickerProps {
  value: number; // in minutes
  onChange: (minutes: number, formatted: string) => void;
  className?: string;
  compact?: boolean;
  label?: string;
  disabled?: boolean;
}

export const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25, badge: 'Pomo' },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
];

/**
 * Formats minutes into standard compact string e.g. "1h 30m" or "45m"
 */
export function formatDurationString(mins: number): string {
  if (isNaN(mins) || mins <= 0) return '30m';
  const totalMins = Math.round(mins);
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;

  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMins}m`;
}

/**
 * Formats minutes into human readable text e.g. "1 hr 30 mins" or "45 mins"
 */
export function formatDurationLong(mins: number): string {
  if (isNaN(mins) || mins <= 0) return '30 mins';
  const totalMins = Math.round(mins);
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;

  if (hours > 0 && remainingMins > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
}

/**
 * Parses user input (string or number) into total minutes
 */
export function parseDurationToMinutes(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) || input <= 0 ? 30 : Math.round(input);
  }
  const raw = (input || '').trim().toLowerCase();
  if (!raw) return 30;

  // Match "1h 30m", "1 hr 30 min", "1.5h", "90m", "90"
  const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?|hrs?)/i);
  const minMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?)/i);
  const pureNumMatch = raw.match(/^(\d+(?:\.\d+)?)$/);

  if (pureNumMatch) {
    const val = parseFloat(pureNumMatch[1]);
    return isNaN(val) || val <= 0 ? 30 : Math.round(val);
  }
  if (hourMatch && minMatch) {
    const h = parseFloat(hourMatch[1]) || 0;
    const m = parseFloat(minMatch[1]) || 0;
    return Math.round(h * 60 + m);
  }
  if (hourMatch) {
    const h = parseFloat(hourMatch[1]) || 0;
    return Math.round(h * 60);
  }
  if (minMatch) {
    const m = parseFloat(minMatch[1]) || 0;
    return Math.round(m);
  }

  const parsed = parseFloat(raw);
  return isNaN(parsed) || parsed <= 0 ? 30 : Math.round(parsed);
}

export const DurationPicker: React.FC<DurationPickerProps> = ({
  value,
  onChange,
  className = '',
  compact = false,
  label = 'Estimated Duration',
  disabled = false,
}) => {
  const currentMinutes = Math.max(1, value || 30);
  const [rawText, setRawText] = useState<string>(String(currentMinutes));

  useEffect(() => {
    const validMins = Math.max(1, value || 30);
    setRawText(String(validMins));
  }, [value]);

  const updateDuration = (newTotalMinutes: number) => {
    const clamped = Math.max(1, Math.min(24 * 60, Math.round(newTotalMinutes)));
    setRawText(String(clamped));
    onChange(clamped, formatDurationString(clamped));
  };

  const handleAdjust = (deltaMinutes: number) => {
    updateDuration(currentMinutes + deltaMinutes);
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawText(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      updateDuration(parsed);
    }
  };

  // Compact inline version (used in table/list rows)
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
          <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <input
            type="number"
            min="1"
            max="1440"
            step="1"
            disabled={disabled}
            value={rawText}
            onChange={handleRawChange}
            className="w-12 bg-transparent font-black text-xs text-slate-900 border-none p-0 focus:outline-none font-mono text-center"
            title="Estimated duration in minutes"
          />
          <span className="text-[10px] font-black text-slate-700">m</span>
        </div>

        {/* Stepper buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || currentMinutes <= 5}
            onClick={() => handleAdjust(-5)}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 cursor-pointer"
            title="Decrease 5 minutes"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAdjust(5)}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 cursor-pointer"
            title="Increase 5 minutes"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    );
  }

  // Simplified Modern Duration Picker
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with Title and Formatted Duration */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{label}</span>
        </label>
        <span className="text-xs font-black font-mono text-amber-900 bg-amber-200/80 border-2 border-slate-900 px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#0f172a]">
          {formatDurationLong(currentMinutes)}
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {DURATION_PRESETS.map((preset) => {
          const isSelected = currentMinutes === preset.minutes;
          return (
            <button
              key={preset.minutes}
              type="button"
              disabled={disabled}
              onClick={() => updateDuration(preset.minutes)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-2 border-slate-900 ${
                isSelected
                  ? 'bg-amber-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                  : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[1px_1px_0px_#0f172a]'
              }`}
            >
              <span>{preset.label}</span>
              {preset.badge && (
                <span
                  className={`ml-1 text-[9px] px-1 py-0.5 rounded border border-slate-900 font-mono ${
                    isSelected ? 'bg-white text-slate-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {preset.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Clean Stepper & Custom Number Input */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
        {/* Minus / Direct Input / Plus Stepper */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || currentMinutes <= 5}
            onClick={() => handleAdjust(-5)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 cursor-pointer"
            title="Decrease 5m"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
            <input
              type="number"
              min="1"
              max="1440"
              disabled={disabled}
              value={rawText}
              onChange={handleRawChange}
              className="w-12 text-center font-black text-xs bg-transparent border-none focus:outline-none font-mono text-slate-900 p-0"
            />
            <span className="text-[11px] font-black text-slate-600">mins</span>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAdjust(5)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 cursor-pointer"
            title="Increase 5m"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Shift Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAdjust(15)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-black bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            +15m
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAdjust(30)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-black bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            +30m
          </button>
        </div>
      </div>
    </div>
  );
};
