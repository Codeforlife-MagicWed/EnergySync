import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskBucket, EnergyFilterMode, PriorityFilterMode, EnergyLevel } from '../types';
import { TaskRow } from './TaskRow';
import { TimeBlockCalendar } from './TimeBlockCalendar';
import { sortTasksMultiTier } from '../utils/sorting';
import {
  isTaskInBucket,
  getTodayDateString,
  getTomorrowDateString,
  getDaysDifference,
  getTabDateSubtitle,
} from '../utils/dateUtils';
import {
  Sun,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Inbox,
  Zap,
  Feather,
  Activity,
  LayoutList,
  Calendar as CalendarViewIcon,
  Plus,
  Flame,
  Filter,
  Layers,
  Sparkles,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PriorityBadge, EnergyBadge, normalizePriority, normalizeEnergy } from './Badges';

interface TaskListProps {
  tasks: Task[];
  activeBucket: TaskBucket;
  onActiveBucketChange: (bucket: TaskBucket) => void;
  filterMode: EnergyFilterMode;
  onFilterModeChange: (mode: EnergyFilterMode) => void;
  priorityFilter?: PriorityFilterMode;
  onPriorityFilterChange?: (mode: PriorityFilterMode) => void;
  currentEnergyLevel: EnergyLevel;
  onToggleStatus: (taskId: string, coords?: { startX: number; startY: number }) => void;
  onDeleteRequest: (task: Task) => void;
  onUpdateTask: (task: Task, updateScope?: 'single' | 'all_recurring') => void;
  onMoveBucket: (taskId: string, bucket: TaskBucket) => void;
  onOpenCreateModal?: () => void;
  onOpenClearAllModal?: () => void;
}

export type ActionBoardViewMode = 'horizon_list' | 'time_block';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeBucket,
  onActiveBucketChange,
  filterMode,
  onFilterModeChange,
  priorityFilter = 'all',
  onPriorityFilterChange,
  currentEnergyLevel,
  onToggleStatus,
  onDeleteRequest,
  onUpdateTask,
  onMoveBucket,
  onOpenCreateModal,
  onOpenClearAllModal,
}) => {
  // Dual-View Toggle state
  const [viewMode, setViewMode] = useState<ActionBoardViewMode>('horizon_list');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [dragOverBucket, setDragOverBucket] = useState<TaskBucket | null>(null);

  // Fallback internal state if not managed by parent
  const [internalPriorityFilter, setInternalPriorityFilter] = useState<PriorityFilterMode>('all');
  const activePriorityFilter = onPriorityFilterChange ? priorityFilter : internalPriorityFilter;
  const setPriorityFilter = onPriorityFilterChange || setInternalPriorityFilter;

  // 1. Strict Date Filtering for Horizon Tabs (Single Source of Truth: assigned Date)
  const bucketTasks = useMemo(() => {
    return tasks.filter((t) => isTaskInBucket(t, activeBucket));
  }, [tasks, activeBucket]);

  const completedInBucketCount = useMemo(() => {
    return bucketTasks.filter((t) => t.status === 'completed').length;
  }, [bucketTasks]);

  // 2. Energy & Priority Filter
  const filteredTasks = useMemo(() => {
    return bucketTasks.filter((t) => {
      if (activeBucket === 'completed') return true;

      // When user hides completed tasks in the active horizon
      if (!showCompleted && t.status === 'completed') {
        return false;
      }

      const taskEnergy = normalizeEnergy(t.energyLevel);
      const activeEnergy = normalizeEnergy(currentEnergyLevel);

      // Energy match
      const matchesEnergy = (() => {
        if (filterMode === 'all') return true;
        if (filterMode === 'auto') return taskEnergy === activeEnergy;
        if (filterMode === 'high') return taskEnergy === 'High';
        if (filterMode === 'medium') return taskEnergy === 'Medium';
        if (filterMode === 'low') return taskEnergy === 'Low';
        return true;
      })();

      // Priority match
      const matchesPriority = (() => {
        if (activePriorityFilter === 'all') return true;
        return normalizePriority(t.priority) === normalizePriority(activePriorityFilter);
      })();

      return matchesEnergy && matchesPriority;
    });
  }, [bucketTasks, activeBucket, filterMode, activePriorityFilter, currentEnergyLevel]);

  // 3. Strict Multi-Tier Sorting
  const sortedTasks = useMemo(() => {
    return sortTasksMultiTier(filteredTasks, currentEnergyLevel);
  }, [filteredTasks, currentEnergyLevel]);

  // Grouping by Date for Multi-Date horizons (All / Next Week / Next Month)
  const groupedTasksByDate = useMemo(() => {
    if (activeBucket === 'today' || activeBucket === 'tomorrow' || activeBucket === 'completed') {
      return null; // Do NOT group by redundant date headers on Today or Tomorrow
    }

    const groups: { [dateStr: string]: Task[] } = {};
    for (const task of sortedTasks) {
      const dateKey = task.dueDate || 'No Date Assigned';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    }

    return groups;
  }, [sortedTasks, activeBucket]);

  const sortedDateKeys = useMemo(() => {
    if (!groupedTasksByDate) return [];
    return Object.keys(groupedTasksByDate).sort((a, b) => {
      if (a === 'No Date Assigned') return 1;
      if (b === 'No Date Assigned') return -1;
      return a.localeCompare(b);
    });
  }, [groupedTasksByDate]);

  // Strict Horizon Counts using Date single source of truth
  const allCount = tasks.length;
  const todayCount = tasks.filter((t) => isTaskInBucket(t, 'today')).length;
  const tomorrowCount = tasks.filter((t) => isTaskInBucket(t, 'tomorrow')).length;
  const nextWeekCount = tasks.filter((t) => isTaskInBucket(t, 'next_week')).length;
  const nextMonthCount = tasks.filter((t) => isTaskInBucket(t, 'next_month')).length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  // Calculate estimated focus duration
  const totalMinutes = filteredTasks
    .filter((t) => t.status !== 'completed')
    .reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);

  const formattedDuration =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ''}`
      : `${totalMinutes}m`;

  const tabs: Array<{
    id: TaskBucket;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = [
    {
      id: 'all',
      label: 'All',
      icon: <Layers className="w-3.5 h-3.5 text-violet-600" />,
      count: allCount,
    },
    {
      id: 'today',
      label: 'Today',
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
      count: todayCount,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      icon: <Calendar className="w-3.5 h-3.5 text-sky-600" />,
      count: tomorrowCount,
    },
    {
      id: 'next_week',
      label: 'Next Week',
      icon: <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />,
      count: nextWeekCount,
    },
    {
      id: 'next_month',
      label: 'Next Month',
      icon: <CalendarRange className="w-3.5 h-3.5 text-purple-600" />,
      count: nextMonthCount,
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      count: completedCount,
    },
  ];

  const formatHeaderDate = (dateStr: string) => {
    if (dateStr === 'No Date Assigned') return 'No Assigned Date';
    try {
      const todayStr = getTodayDateString();
      const tomorrowStr = getTomorrowDateString();
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const formatted = d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        if (dateStr === todayStr) {
          return `Today • ${formatted}`;
        }
        if (dateStr === tomorrowStr) {
          return `Tomorrow • ${formatted}`;
        }
        if (dateStr < todayStr) {
          return `Overdue • ${formatted}`;
        }
        return formatted;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleTabDrop = (targetBucket: TaskBucket, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBucket(null);
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const { taskId } = JSON.parse(raw);
      if (taskId) {
        if (targetBucket === 'completed') {
          onToggleStatus(taskId);
        } else if (targetBucket !== 'all') {
          onMoveBucket(taskId, targetBucket);
        }
      }
    } catch (err) {
      console.error('Drag drop error:', err);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative z-10 w-full max-w-[90rem] mx-auto px-6 sm:px-10 pb-28 pt-2"
    >
      {/* Frameless Navigation & Dual-View Toggle Row */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 border-b border-black/[0.06] pb-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0f172a]/50">
              Multi-View Action Board
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a]">
              {viewMode === 'horizon_list'
                ? tabs.find((t) => t.id === activeBucket)?.label || 'Action Board'
                : 'Time-Block Calendar'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Dual-View Toggle (Neo-Brutalist Tactile) */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <button
                onClick={() => setViewMode('horizon_list')}
                title="Switch to Horizon List View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'horizon_list'
                    ? 'bg-slate-900 text-white shadow-[1px_1px_0px_#0f172a]'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Horizon List</span>
              </button>
              <button
                onClick={() => setViewMode('time_block')}
                title="Switch to Time-Block Calendar View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'time_block'
                    ? 'bg-slate-900 text-white shadow-[1px_1px_0px_#0f172a]'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <CalendarViewIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Time-Block Grid</span>
              </button>
            </div>

            {/* Time Duration Badge */}
            {filteredTasks.length > 0 && activeBucket !== 'completed' && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-900 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] px-3.5 py-1.5 rounded-xl font-mono font-black">
                <Clock className="w-3.5 h-3.5 text-sky-700" strokeWidth={2.5} />
                <span>Est. Focus: <strong>{formattedDuration}</strong></span>
              </div>
            )}

            {/* NEW ACTION + Brutalist CTA Button */}
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="btn-brutalist-accent px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2.5 cursor-pointer"
              >
                <span className="tracking-wide uppercase">NEW ACTION</span>
                <span className="label-mono text-xs border border-white px-1.5 py-0.2 rounded font-mono">
                  +
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Time Horizon Tabs (Active Drag-and-Drop Drop Targets) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeBucket === tab.id;
            const isDragOver = dragOverBucket === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onActiveBucketChange(tab.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverBucket(tab.id);
                }}
                onDragLeave={() => {
                  if (dragOverBucket === tab.id) setDragOverBucket(null);
                }}
                onDrop={(e) => handleTabDrop(tab.id, e)}
                title={`Click or drop task here to move to ${tab.label}`}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0 border-2 border-slate-900 ${
                  isDragOver
                    ? 'ring-2 ring-indigo-500 bg-indigo-200 scale-105 shadow-[4px_4px_0px_#0f172a]'
                    : isActive
                    ? 'bg-slate-900 text-white shadow-[3px_3px_0px_#0f172a]'
                    : 'bg-white hover:bg-slate-50 text-slate-800 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-y-[2px] active:shadow-none'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md border ${
                    isActive
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dual Filter Mode Pills: Energy & Priority (in Horizon List View) */}
        {viewMode === 'horizon_list' && activeBucket !== 'completed' && bucketTasks.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2.5 gap-x-6 text-xs pt-2 border-t-2 border-slate-900/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-y-2.5 gap-x-6 flex-wrap">
              {/* Energy Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.5} /> Energy:
                </span>
                <button
                  type="button"
                  onClick={() => onFilterModeChange('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${
                    filterMode === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-800 hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a]'
                  }`}
                >
                  <span>All</span>
                  <span className="font-mono text-[10px] opacity-90 font-bold">({bucketTasks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterModeChange(filterMode === 'auto' ? 'all' : 'auto')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${
                    filterMode === 'auto'
                      ? currentEnergyLevel === 'High'
                        ? 'bg-emerald-300 text-slate-900 ring-2 ring-emerald-400'
                        : currentEnergyLevel === 'Medium'
                        ? 'bg-purple-300 text-slate-900 ring-2 ring-purple-400'
                        : 'bg-sky-300 text-slate-900 ring-2 ring-sky-400'
                      : 'bg-white hover:bg-amber-100 text-slate-800 hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a]'
                  }`}
                  title={`Filter tasks matching your current vitality level (${currentEnergyLevel})`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" strokeWidth={2.5} />
                  <span>Match Energy ({currentEnergyLevel})</span>
                  <span className="font-mono text-[10px] opacity-90 font-bold">
                    ({bucketTasks.filter((t) => normalizeEnergy(t.energyLevel) === normalizeEnergy(currentEnergyLevel)).length})
                  </span>
                </button>

                <EnergyBadge
                  energy="High"
                  isInteractive
                  isActive={filterMode === 'high'}
                  count={bucketTasks.filter((t) => normalizeEnergy(t.energyLevel) === 'High').length}
                  onClick={() => onFilterModeChange(filterMode === 'high' ? 'all' : 'high')}
                />
                <EnergyBadge
                  energy="Medium"
                  isInteractive
                  isActive={filterMode === 'medium'}
                  count={bucketTasks.filter((t) => normalizeEnergy(t.energyLevel) === 'Medium').length}
                  onClick={() => onFilterModeChange(filterMode === 'medium' ? 'all' : 'medium')}
                />
                <EnergyBadge
                  energy="Low"
                  isInteractive
                  isActive={filterMode === 'low'}
                  count={bucketTasks.filter((t) => normalizeEnergy(t.energyLevel) === 'Low').length}
                  onClick={() => onFilterModeChange(filterMode === 'low' ? 'all' : 'low')}
                />
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-rose-500" strokeWidth={2.5} /> Priority:
                </span>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${
                    activePriorityFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-800 hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a]'
                  }`}
                >
                  <span>All</span>
                  <span className="font-mono text-[10px] opacity-90 font-bold">({bucketTasks.length})</span>
                </button>
                <PriorityBadge
                  priority="Critical"
                  isInteractive
                  isActive={activePriorityFilter === 'Critical'}
                  count={bucketTasks.filter((t) => normalizePriority(t.priority) === 'Critical').length}
                  onClick={() => setPriorityFilter(activePriorityFilter === 'Critical' ? 'all' : 'Critical')}
                />
                <PriorityBadge
                  priority="Core"
                  isInteractive
                  isActive={activePriorityFilter === 'Core'}
                  count={bucketTasks.filter((t) => normalizePriority(t.priority) === 'Core').length}
                  onClick={() => setPriorityFilter(activePriorityFilter === 'Core' ? 'all' : 'Core')}
                />
                <PriorityBadge
                  priority="Can Wait"
                  isInteractive
                  isActive={activePriorityFilter === 'Can Wait'}
                  count={bucketTasks.filter((t) => normalizePriority(t.priority) === 'Can Wait').length}
                  onClick={() => setPriorityFilter(activePriorityFilter === 'Can Wait' ? 'all' : 'Can Wait')}
                />
              </div>
            </div>

            {/* Quick Actions at the far right of Filter Bar: Reset Filters & Clear All */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {completedInBucketCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  title={showCompleted ? 'Hide completed tasks in this view' : 'Show completed tasks in this view'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    showCompleted
                      ? 'bg-emerald-500/20 text-emerald-950 hover:bg-emerald-500/30 border-emerald-500/30'
                      : 'bg-white/10 text-[#0f172a]/60 hover:text-[#0f172a] border-white/20'
                  }`}
                >
                  {showCompleted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Completed ({completedInBucketCount})</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3 text-[#0f172a]/50" />
                      <span>Hidden ({completedInBucketCount})</span>
                    </>
                  )}
                </button>
              )}

              {(filterMode !== 'all' || activePriorityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    onFilterModeChange('all');
                    setPriorityFilter('all');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-black/5 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                  title="Clear all active filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}

              {onOpenClearAllModal && tasks.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenClearAllModal}
                  title="Clear all tasks (Action Board Reset)"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors px-3 py-1 rounded-md text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Completed View Clear All Action */}
        {viewMode === 'horizon_list' && activeBucket === 'completed' && onOpenClearAllModal && tasks.length > 0 && (
          <div className="flex items-center justify-end pt-1 border-t border-black/[0.04] text-xs">
            <button
              type="button"
              onClick={onOpenClearAllModal}
              title="Clear all tasks (Action Board Reset)"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors px-3 py-1 rounded-md text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Main View Content: Horizon List View vs Time-Block Calendar View */}
      {viewMode === 'time_block' ? (
        <motion.div variants={itemVariants}>
          <TimeBlockCalendar
            tasks={tasks}
            allTasks={tasks}
            currentEnergyLevel={currentEnergyLevel}
            activeBucket={activeBucket}
            onActiveBucketChange={onActiveBucketChange}
            onToggleStatus={onToggleStatus}
            onDeleteRequest={onDeleteRequest}
            onUpdateTask={onUpdateTask}
            onMoveBucket={onMoveBucket}
            onOpenCreateModal={onOpenCreateModal}
          />
        </motion.div>
      ) : (
        /* Horizon List View */
        <motion.div variants={containerVariants} className="w-full">
          {/* Dynamic Tab Date Header (Clean & Frameless) */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-4 sm:mb-6 px-1 text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#0f172a]/50 select-none">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0f172a]/50" />
            <span>{getTabDateSubtitle(activeBucket)}</span>
          </motion.div>

          {sortedTasks.length > 0 ? (
            <motion.div variants={containerVariants} className="space-y-4">
              {/* If Today, Tomorrow, or Completed: List directly without redundant date headers */}
              {groupedTasksByDate === null ? (
                <motion.div variants={containerVariants} className="space-y-2">
                  {sortedTasks.map((task) => (
                    <motion.div key={task.id} variants={itemVariants}>
                      <TaskRow
                        task={task}
                        allTasks={tasks}
                        onToggleStatus={onToggleStatus}
                        onDeleteRequest={onDeleteRequest}
                        onUpdateTask={onUpdateTask}
                        onMoveBucket={onMoveBucket}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* For Multi-Day horizons (All / Next Week / Next Month): Group by scheduled day */
                sortedDateKeys.map((dateKey) => {
                  const dateTasks = groupedTasksByDate[dateKey];
                  return (
                    <motion.div key={dateKey} variants={itemVariants} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 pt-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0f172a]/40" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a]/70">
                          {formatHeaderDate(dateKey)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#0f172a]/40">
                          ({dateTasks.length})
                        </span>
                      </div>

                      <motion.div variants={containerVariants} className="space-y-2">
                        {dateTasks.map((task) => (
                          <motion.div key={task.id} variants={itemVariants}>
                            <TaskRow
                              task={task}
                              allTasks={tasks}
                              onToggleStatus={onToggleStatus}
                              onDeleteRequest={onDeleteRequest}
                              onUpdateTask={onUpdateTask}
                              onMoveBucket={onMoveBucket}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="py-16 text-center rounded-3xl bg-white/5 backdrop-blur-2xl px-6">
              <div className="w-12 h-12 rounded-full bg-white/10 mx-auto mb-3 flex items-center justify-center text-[#0f172a]/40">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f172a] mb-1">
                {bucketTasks.length > 0
                  ? 'No tasks matching current filter criteria'
                  : `No tasks scheduled for ${tabs.find((t) => t.id === activeBucket)?.label}`}
              </h4>
              <p className="text-xs text-[#0f172a]/60 max-w-sm mx-auto leading-relaxed">
                {bucketTasks.length > 0 ? (
                  <button
                    onClick={() => {
                      onFilterModeChange('all');
                      setPriorityFilter('all');
                    }}
                    className="font-bold underline text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Reset filters & show all ({bucketTasks.length}) tasks in this horizon
                  </button>
                ) : (
                  <span>
                    No tasks yet.{' '}
                    {onOpenCreateModal && (
                      <button
                        onClick={onOpenCreateModal}
                        className="font-bold underline text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Click here to add your first task
                      </button>
                    )}
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
