import React from 'react';
import {
  Flame,
  Activity,
  Zap,
  Leaf,
  Lock,
  Clock,
  Calendar,
  Mail,
  Repeat,
} from 'lucide-react';
import { PriorityLevel, EnergyLevel } from '../types';

export type UnifiedPriority = 'Critical' | 'Core' | 'Can Wait';
export type UnifiedEnergy = 'High' | 'Medium' | 'Low';

/**
 * Normalizes any energy string value to standard EnergyLevel ('High' | 'Medium' | 'Low')
 */
export function normalizeEnergy(e?: string): EnergyLevel {
  if (!e) return 'Medium';
  const clean = e.trim().toLowerCase();
  if (clean === 'high' || clean === 'peak' || clean === 'deep') return 'High';
  if (clean === 'low' || clean === 'gentle' || clean === 'rest' || clean === 'light') return 'Low';
  return 'Medium';
}

/**
 * Normalizes legacy priority tags ('P1', 'P2', 'P3') to human-centric naming
 */
export function normalizePriority(p?: string): UnifiedPriority {
  if (!p) return 'Core';
  const clean = p.trim().toLowerCase();
  if (clean === 'p1' || clean.includes('critical') || clean.includes('urgent')) {
    return 'Critical';
  }
  if (clean === 'p3' || clean.includes('wait') || clean.includes('defer')) {
    return 'Can Wait';
  }
  return 'Core';
}

/**
 * Priority Tag Configuration (Neo-Brutalist Theme)
 */
export function getPriorityBadgeConfig(priority?: string) {
  const norm = normalizePriority(priority);
  switch (norm) {
    case 'Critical':
      return {
        priority: 'Critical' as UnifiedPriority,
        label: 'Critical',
        icon: <Flame className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
        baseClass:
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
        activeFilterClass: 'bg-rose-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
        inactiveFilterClass:
          'bg-white hover:bg-rose-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
      };
    case 'Can Wait':
      return {
        priority: 'Can Wait' as UnifiedPriority,
        label: 'Can Wait',
        icon: <Clock className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
        baseClass:
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
        activeFilterClass: 'bg-slate-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
        inactiveFilterClass:
          'bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
      };
    case 'Core':
    default:
      return {
        priority: 'Core' as UnifiedPriority,
        label: 'Core',
        icon: <Zap className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
        baseClass:
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
        activeFilterClass: 'bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
        inactiveFilterClass:
          'bg-white hover:bg-amber-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
      };
  }
}

/**
 * Energy Tag Configuration (Neo-Brutalist Theme)
 */
export function getEnergyBadgeConfig(energy?: string) {
  const clean = (energy || 'medium').trim().toLowerCase();
  if (clean === 'high') {
    return {
      energy: 'High' as UnifiedEnergy,
      label: 'High',
      longLabel: 'High Energy',
      icon: <Zap className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
      baseClass:
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
      activeFilterClass: 'bg-emerald-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
      inactiveFilterClass:
        'bg-white hover:bg-emerald-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
    };
  }
  if (clean === 'low') {
    return {
      energy: 'Low' as UnifiedEnergy,
      label: 'Low',
      longLabel: 'Low Energy',
      icon: <Leaf className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
      baseClass:
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
      activeFilterClass: 'bg-sky-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
      inactiveFilterClass:
        'bg-white hover:bg-sky-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
    };
  }
  return {
    energy: 'Medium' as UnifiedEnergy,
    label: 'Medium',
    longLabel: 'Med Energy',
    icon: <Activity className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />,
    baseClass:
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
    activeFilterClass: 'bg-purple-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black',
    inactiveFilterClass:
      'bg-white hover:bg-purple-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] font-bold',
  };
}

// ---------------- Reusable Unified Badge Components ---------------- //

interface PriorityBadgeProps {
  priority?: string;
  isInteractive?: boolean;
  isActive?: boolean;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
  size?: 'default' | 'sm';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority = 'Core',
  isInteractive = false,
  isActive = false,
  count,
  onClick,
  className = '',
  title,
  size = 'default',
}) => {
  const config = getPriorityBadgeConfig(priority);
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  if (isInteractive || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || `Priority: ${config.label} (Click to toggle)`}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all duration-150 cursor-pointer border ${sizeClasses} ${
          isActive
            ? config.activeFilterClass
            : config.inactiveFilterClass
        } ${className}`}
      >
        {config.icon}
        <span>{config.label}</span>
        {count !== undefined && (
          <span className="font-mono text-[10px] opacity-90">({count})</span>
        )}
      </button>
    );
  }

  return (
    <span
      title={title || `Priority: ${config.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClasses} ${config.baseClass} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {count !== undefined && (
        <span className="font-mono text-[10px] opacity-90">({count})</span>
      )}
    </span>
  );
};

interface EnergyBadgeProps {
  energy?: string;
  isInteractive?: boolean;
  isActive?: boolean;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  useLongLabel?: boolean;
  title?: string;
  size?: 'default' | 'sm';
}

export const EnergyBadge: React.FC<EnergyBadgeProps> = ({
  energy = 'Medium',
  isInteractive = false,
  isActive = false,
  count,
  onClick,
  className = '',
  useLongLabel = false,
  title,
  size = 'default',
}) => {
  const config = getEnergyBadgeConfig(energy);
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const label = useLongLabel ? config.longLabel : config.label;

  if (isInteractive || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || `Energy Level: ${label}`}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all duration-150 cursor-pointer border ${sizeClasses} ${
          isActive
            ? config.activeFilterClass
            : config.inactiveFilterClass
        } ${className}`}
      >
        {config.icon}
        <span>{label}</span>
        {count !== undefined && (
          <span className="font-mono text-[10px] opacity-90">({count})</span>
        )}
      </button>
    );
  }

  return (
    <span
      title={title || `Energy Level: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${sizeClasses} ${config.baseClass} ${className}`}
    >
      {config.icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[10px] opacity-90">({count})</span>
      )}
    </span>
  );
};

/**
 * Fixed Time Badge: Neo-Brutalist solid badge
 */
interface FixedTimeBadgeProps {
  startTime?: string;
  endTime?: string;
  className?: string;
  size?: 'default' | 'sm';
}

export const FixedTimeBadge: React.FC<FixedTimeBadgeProps> = ({
  startTime,
  endTime,
  className = '',
  size = 'default',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const timeText = startTime && endTime ? `${startTime} – ${endTime}` : 'Fixed Time';

  return (
    <span
      title="Fixed Schedule Anchor — Bypasses dynamic energy filtering"
      className={`inline-flex items-center gap-1.5 rounded-full font-black bg-amber-200 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${sizeClasses} ${className}`}
    >
      <Lock className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
      <span>{timeText}</span>
    </span>
  );
};

interface TimeDurationBadgeProps {
  duration: string;
  className?: string;
  size?: 'default' | 'sm';
}

export const TimeDurationBadge: React.FC<TimeDurationBadgeProps> = ({
  duration,
  className = '',
  size = 'default',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${sizeClasses} ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
      <span>{duration}</span>
    </span>
  );
};

interface DueDateBadgeProps {
  dueDate: string;
  className?: string;
  size?: 'default' | 'sm';
}

export const DueDateBadge: React.FC<DueDateBadgeProps> = ({
  dueDate,
  className = '',
  size = 'default',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold text-slate-900 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${sizeClasses} ${className}`}
    >
      <Calendar className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
      <span>{dueDate}</span>
    </span>
  );
};

export const GmailAiBadge: React.FC<{ className?: string; size?: 'default' | 'sm' }> = ({
  className = '',
  size = 'default',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-black text-slate-900 bg-blue-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${sizeClasses} ${className}`}
    >
      <Mail className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
      <span>Gmail AI</span>
    </span>
  );
};

export const RecurringBadge: React.FC<{
  recurringDays?: string[];
  className?: string;
  size?: 'default' | 'sm';
}> = ({ recurringDays, className = '', size = 'default' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]';
  const label =
    recurringDays && recurringDays.length > 0
      ? `Weekly (${recurringDays.join(', ')})`
      : 'Weekly';

  return (
    <span
      title={`Recurring weekly task: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-black text-slate-900 bg-indigo-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${sizeClasses} ${className}`}
    >
      <Repeat className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
      <span>{label}</span>
    </span>
  );
};

