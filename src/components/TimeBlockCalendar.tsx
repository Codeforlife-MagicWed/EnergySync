import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Unlock,
  Check,
  CheckCircle2,
  Trash2,
  Sparkles,
  GripVertical,
  Plus,
  ArrowRight,
  Eye,
  EyeOff,
  Edit2,
} from 'lucide-react';
import { Task, EnergyLevel, PriorityLevel, TaskBucket } from '../types';
import {
  PriorityBadge,
  EnergyBadge,
  FixedTimeBadge,
  TimeDurationBadge,
  normalizePriority,
} from './Badges';
import {
  getLocalDateString,
  getTodayDateString,
  getTomorrowDateString,
} from '../utils/dateUtils';
import { EditTaskModal } from './EditTaskModal';

interface TimeBlockCalendarProps {
  tasks: Task[];
  allTasks?: Task[];
  currentEnergyLevel: EnergyLevel;
  onToggleStatus: (taskId: string, coords?: { startX: number; startY: number }) => void;
  onDeleteRequest: (task: Task) => void;
  onUpdateTask: (task: Task, updateScope?: 'single' | 'all_recurring') => void;
  onMoveBucket: (taskId: string, bucket: TaskBucket) => void;
  onOpenCreateModal?: () => void;
  activeBucket: TaskBucket;
  onActiveBucketChange: (bucket: TaskBucket) => void;
}

// 24 Hour range (0:00 to 23:00) with 60-pixel hour increments
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT_PX = 64; // px per hour block

export const TimeBlockCalendar: React.FC<TimeBlockCalendarProps> = ({
  tasks,
  allTasks = [],
  currentEnergyLevel,
  onToggleStatus,
  onDeleteRequest,
  onUpdateTask,
  onMoveBucket,
  onOpenCreateModal,
  activeBucket,
  onActiveBucketChange,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (activeBucket === 'tomorrow') return getTomorrowDateString();
    return getTodayDateString();
  });
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [dragOverQuarter, setDragOverQuarter] = useState<number>(0);

  // Sync selectedDate when activeBucket changes from outside (e.g. top horizon tabs)
  useEffect(() => {
    if (activeBucket === 'today') {
      setSelectedDate(getTodayDateString());
    } else if (activeBucket === 'tomorrow') {
      setSelectedDate(getTomorrowDateString());
    }
  }, [activeBucket]);

  // 1. Separate Fixed Anchors vs Flexible Tasks for the selected date (including completed tasks)
  const { fixedAnchors, flexibleTasks, totalForDateCount, completedCount } = useMemo(() => {
    const todayStr = getTodayDateString();
    const tomorrowStr = getTomorrowDateString();

    const allForDate = tasks.filter((t) => {
      // If task has explicit dueDate
      if (t.dueDate) {
        if (t.dueDate === selectedDate) return true;
        // If viewing today, past overdue tasks are included in today's calendar
        if (selectedDate === todayStr && t.dueDate < todayStr) return true;
        return false;
      }
      // If task has no explicit dueDate, infer from bucket
      if (selectedDate === todayStr) {
        return !t.bucket || t.bucket === 'today' || t.bucket === 'all' || t.bucket === 'completed';
      }
      if (selectedDate === tomorrowStr) {
        return t.bucket === 'tomorrow';
      }
      return false;
    });

    const completed = allForDate.filter((t) => t.status === 'completed');

    const visibleTasks = showCompleted
      ? allForDate
      : allForDate.filter((t) => t.status !== 'completed');

    const fixed = visibleTasks.filter(
      (t) => t.isFixedTime && t.startTime && t.endTime
    );
    const flexible = visibleTasks.filter((t) => !t.isFixedTime);

    return {
      fixedAnchors: fixed,
      flexibleTasks: flexible,
      totalForDateCount: allForDate.length,
      completedCount: completed.length,
    };
  }, [tasks, selectedDate, showCompleted]);

  // Convert HH:mm to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Convert minutes from midnight to HH:mm string
  const minutesToTime = (mins: number): string => {
    const normalized = Math.max(0, Math.min(23 * 60 + 59, mins));
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 1-Click Priority Toggle
  const handleTogglePriority = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = normalizePriority(task.priority);
    const nextPriority: PriorityLevel =
      current === 'Critical' ? 'Core' : current === 'Core' ? 'Can Wait' : 'Critical';
    onUpdateTask({
      ...task,
      priority: nextPriority,
      updatedAt: new Date().toISOString(),
    });
  };

  // Unschedule anchor (convert back to flexible)
  const handleUnscheduleTask = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateTask({
      ...task,
      isFixedTime: false,
      startTime: undefined,
      endTime: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  // Drag & Drop Handlers on Timeline Grid Hour Slots
  const handleDragOverHourSlot = (
    e: React.DragEvent,
    hour: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const ratio = offsetY / rect.height;

    // Snap to 15-minute increments (0, 15, 30, 45)
    let quarter = 0;
    if (ratio >= 0.75) quarter = 45;
    else if (ratio >= 0.5) quarter = 30;
    else if (ratio >= 0.25) quarter = 15;

    setDragOverHour(hour);
    setDragOverQuarter(quarter);
  };

  const handleDropOnHourSlot = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { taskId } = JSON.parse(dataStr);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const startMinutes = hour * 60 + dragOverQuarter;
      const durationMins = task.estimatedMinutes || 45;
      const endMinutes = Math.min(24 * 60 - 1, startMinutes + durationMins);

      onUpdateTask({
        ...task,
        dueDate: selectedDate,
        isFixedTime: true,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to parse drag drop data:', err);
    }
  };

  // Drop on Flexible Pool (unpins fixed anchor)
  const handleDropOnFlexibleTray = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { taskId } = JSON.parse(dataStr);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      handleUnscheduleTask(task);
    } catch (err) {
      console.error('Failed to unschedule task:', err);
    }
  };

  // Energy color helper for calendar blocks (Cool spectrum)
  const getEnergyBlockStyle = (energy: EnergyLevel) => {
    switch (energy) {
      case 'High':
        return {
          blockBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-950',
          accent: 'border-l-4 border-l-emerald-600',
        };
      case 'Medium':
        return {
          blockBg: 'bg-purple-500/15 border-purple-500/30 text-purple-950',
          accent: 'border-l-4 border-l-purple-600',
        };
      case 'Low':
      default:
        return {
          blockBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-950',
          accent: 'border-l-4 border-l-cyan-600',
        };
    }
  };

  // Current time line indicator
  const now = new Date();
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const currentTimeTopPx = (currentMinutesFromMidnight / 60) * HOUR_HEIGHT_PX;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Calendar Header & Date Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/10 backdrop-blur-2xl px-5 py-3.5 rounded-3xl border border-white/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-900">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#0f172a]/60">
                Time-Block Calendar
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10 text-[#0f172a] flex items-center gap-1 border border-black/10">
                <Lock className="w-2.5 h-2.5" /> {fixedAnchors.length} Anchored
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#0f172a]">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
          </div>
        </div>

        {/* Date Selector & Horizon Sync */}
        <div className="flex items-center gap-2 flex-wrap">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border-none ${
                showCompleted
                  ? 'bg-emerald-500/20 text-emerald-950 hover:bg-emerald-500/30'
                  : 'bg-white/30 text-[#0f172a]/60 hover:text-[#0f172a]'
              }`}
            >
              {showCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Completed ({completedCount})</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-[#0f172a]/50" />
                  <span>Hidden ({completedCount})</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1 bg-white/30 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                onActiveBucketChange('today');
                setSelectedDate(getTodayDateString());
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === getTodayDateString()
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#0f172a]/60 hover:text-[#0f172a]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onActiveBucketChange('tomorrow');
                setSelectedDate(getTomorrowDateString());
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === getTomorrowDateString()
                  ? 'bg-[#0f172a] text-white'
                  : 'text-[#0f172a]/60 hover:text-[#0f172a]'
              }`}
            >
              Tomorrow
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/30 text-[#0f172a] rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none border-none cursor-pointer"
          />
        </div>
      </div>

      {/* Main Grid & Flexible Pool Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Floating Flexible Task Pool Tray (Left/Top on LG) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={handleDropOnFlexibleTray}
          className="lg:col-span-4 flex flex-col gap-3 bg-white/10 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-white/20 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/[0.06]">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-extrabold text-[#0f172a]">Flexible Task Pool</h4>
              </div>
              <p className="text-[11px] text-[#0f172a]/60 mt-0.5">
                Drag tasks to time slots on the timeline grid to lock.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/30 text-[#0f172a]">
              {flexibleTasks.length}
            </span>
          </div>

          {/* List of Flexible Tasks */}
          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1 no-scrollbar">
            {flexibleTasks.length > 0 ? (
              flexibleTasks.map((task) => {
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    draggable={!isCompleted}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'text/plain',
                        JSON.stringify({
                          taskId: task.id,
                          fromBucket: task.bucket,
                        })
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`group relative p-3 rounded-2xl bg-white/40 hover:bg-white/70 transition-all border border-white/40 shadow-xs cursor-grab active:cursor-grabbing flex flex-col gap-2 ${
                      isCompleted ? 'opacity-40 cursor-default' : ''
                    } ${normalizePriority(task.priority) === 'Critical' ? 'ring-1 ring-rose-400/40 bg-rose-500/5' : ''}`}
                  >
                    {/* Header line: Grip + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <GripVertical className="w-3.5 h-3.5 text-[#0f172a]/30 group-hover:text-[#0f172a]/70" />
                        {/* 1-Click Priority Toggle */}
                        <PriorityBadge
                          priority={task.priority}
                          isInteractive={!isCompleted}
                          onClick={(e) => handleTogglePriority(task, e)}
                          title="Click to cycle priority (Critical -> Core -> Can Wait)"
                        />
                        {/* Energy Pill */}
                        <EnergyBadge energy={task.energyLevel} />
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Duration */}
                        <TimeDurationBadge duration={task.estimatedTime} />

                        {/* Quick Edit & Delete Actions on hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                            }}
                            title="Edit task"
                            className="p-1 rounded-md text-[#0f172a]/40 hover:text-[#0f172a] hover:bg-white/60 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRequest(task);
                            }}
                            title="Delete task"
                            className="p-1 rounded-md text-[#0f172a]/40 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Task Title & Inline Quick Checkbox */}
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const startX = rect.left + rect.width / 2;
                          const startY = rect.top + rect.height / 2;
                          onToggleStatus(task.id, { startX, startY });
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-[#0f172a] text-white'
                            : 'bg-white/60 hover:bg-white text-transparent hover:text-slate-500'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => !isCompleted && setEditingTask(task)}
                        title="Click to edit task details"
                      >
                        <h5
                          className={`text-xs sm:text-sm font-bold tracking-tight text-[#0f172a] leading-snug hover:underline ${
                            isCompleted ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {task.title}
                        </h5>
                        {task.description && (
                          <p className="text-[11px] text-[#0f172a]/60 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Prompt */}
                    <div className="flex items-center justify-between text-[10px] text-[#0f172a]/40 pt-1 border-t border-black/[0.04]">
                      <span>Drag to schedule</span>
                      <button
                        type="button"
                        onClick={() => {
                          const startM = 14 * 60;
                          const dur = task.estimatedMinutes || 45;
                          onUpdateTask({
                            ...task,
                            dueDate: selectedDate,
                            isFixedTime: true,
                            startTime: minutesToTime(startM),
                            endTime: minutesToTime(startM + dur),
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer flex items-center gap-0.5"
                      >
                        <span>Lock at 14:00</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[#0f172a]/40 flex flex-col items-center gap-2">
                <span>All tasks for this day are anchored to time slots.</span>
                {onOpenCreateModal && (
                  <button
                    type="button"
                    onClick={onOpenCreateModal}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 24-Hour Timeline Grid Container (Right on LG) */}
        <div className="lg:col-span-8 bg-white/10 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-white/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/[0.06]">
            <div>
              <h4 className="text-sm font-extrabold text-[#0f172a]">24-Hour Daily Timeline</h4>
              <p className="text-[11px] text-[#0f172a]/60">
                Drop flexible tasks into any 15-minute time bracket to lock schedule.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#0f172a]/70">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Low
              </span>
            </div>
          </div>

          {/* Continuous Vertical Hour Grid */}
          <div className="relative max-h-[640px] overflow-y-auto pr-2 no-scrollbar rounded-2xl bg-white/20 border border-white/30">
            <div
              className="relative w-full"
              style={{ height: `${HOURS.length * HOUR_HEIGHT_PX}px` }}
            >
              {/* Hour Grid Lines and Drop Slots */}
              {HOURS.map((hour) => {
                const isDragTarget = dragOverHour === hour;

                return (
                  <div
                    key={hour}
                    onDragOver={(e) => handleDragOverHourSlot(e, hour)}
                    onDragLeave={() => {
                      if (dragOverHour === hour) setDragOverHour(null);
                    }}
                    onDrop={(e) => handleDropOnHourSlot(e, hour)}
                    className={`absolute left-0 right-0 border-b border-black/[0.06] flex items-start transition-colors ${
                      isDragTarget ? 'bg-indigo-500/10' : 'hover:bg-white/10'
                    }`}
                    style={{
                      top: `${hour * HOUR_HEIGHT_PX}px`,
                      height: `${HOUR_HEIGHT_PX}px`,
                    }}
                  >
                    {/* Hour Label */}
                    <div className="w-16 sm:w-20 py-2 px-3 text-right flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-[#0f172a]/50">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>

                    {/* Quarter-Hour Dashed Guide Lines */}
                    <div className="flex-1 h-full relative border-l border-black/[0.04]">
                      <div className="absolute top-1/4 left-0 right-0 border-b border-dashed border-black/[0.03] pointer-events-none" />
                      <div className="absolute top-2/4 left-0 right-0 border-b border-dashed border-black/[0.04] pointer-events-none" />
                      <div className="absolute top-3/4 left-0 right-0 border-b border-dashed border-black/[0.03] pointer-events-none" />

                      {/* Visual Drop Projection Placeholder */}
                      {isDragTarget && (
                        <div
                          className="absolute left-2 right-2 bg-indigo-500/25 border border-indigo-500/40 rounded-xl flex items-center px-3 text-xs font-bold text-indigo-950 pointer-events-none z-20"
                          style={{
                            top: `${(dragOverQuarter / 60) * 100}%`,
                            height: '42px',
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>
                            Lock to {hour.toString().padStart(2, '0')}:
                            {dragOverQuarter.toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Current Time Red Marker Line (if looking at today) */}
              {selectedDate === getTodayDateString() && (
                <div
                  className="absolute left-16 sm:left-20 right-0 border-t-2 border-rose-500 z-30 pointer-events-none flex items-center"
                  style={{ top: `${currentTimeTopPx}px` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-sm" />
                  <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded-full ml-1 shadow-xs">
                    NOW {now.getHours().toString().padStart(2, '0')}:
                    {now.getMinutes().toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Render Fixed Time Anchors (Pinned Solid Blocks) */}
              {fixedAnchors.map((task) => {
                const startMins = timeToMinutes(task.startTime || '00:00');
                const endMins = timeToMinutes(task.endTime || '01:00');
                let durationMins = endMins - startMins;
                if (durationMins <= 0) durationMins = task.estimatedMinutes || 45;

                const topPx = (startMins / 60) * HOUR_HEIGHT_PX;
                const heightPx = Math.max(34, (durationMins / 60) * HOUR_HEIGHT_PX);

                const energyStyle = getEnergyBlockStyle(task.energyLevel);
                const isCompleted = task.status === 'completed';
                const isShortBlock = durationMins <= 30 || heightPx < 44;

                return (
                  <div
                    key={task.id}
                    draggable={!isCompleted}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'text/plain',
                        JSON.stringify({
                          taskId: task.id,
                          fromBucket: task.bucket,
                        })
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`absolute left-18 sm:left-22 right-3 sm:right-5 rounded-2xl transition-all duration-200 shadow-sm backdrop-blur-xl border z-10 min-h-[36px] cursor-grab active:cursor-grabbing group ${
                      isShortBlock
                        ? 'p-1.5 sm:px-2.5 sm:py-1.5 hover:h-auto hover:min-h-fit hover:z-50 hover:shadow-xl hover:p-2.5'
                        : 'p-2 sm:p-2.5 hover:shadow-md'
                    } ${energyStyle.blockBg} ${energyStyle.accent} ${
                      isCompleted ? 'opacity-40 grayscale-[40%]' : ''
                    }`}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                    }}
                  >
                    {/* Short block (<30m) non-hover default: Single Horizontal Row */}
                    {isShortBlock ? (
                      <>
                        {/* Compact Single-Row View (shown by default, hidden on hover if expanded) */}
                        <div className="flex items-center justify-between gap-2 h-full w-full group-hover:hidden min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const startX = rect.left + rect.width / 2;
                                const startY = rect.top + rect.height / 2;
                                onToggleStatus(task.id, { startX, startY });
                              }}
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-[#0f172a] text-white'
                                  : 'bg-white/60 hover:bg-white text-transparent hover:text-slate-500'
                              }`}
                            >
                              <Check className="w-2 h-2 stroke-[3]" />
                            </button>

                            <FixedTimeBadge
                              startTime={task.startTime}
                              endTime={task.endTime}
                            />

                            <h4
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isCompleted) setEditingTask(task);
                              }}
                              title={task.title}
                              className={`text-xs font-extrabold truncate text-[#0f172a] cursor-pointer hover:underline min-w-0 ${
                                isCompleted ? 'line-through opacity-50' : ''
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                              title="Edit task"
                              className="p-1 rounded-md bg-white/40 hover:bg-white text-[#0f172a]/70 hover:text-[#0f172a] text-[10px] font-bold cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Full View on Hover */}
                        <div className="hidden group-hover:flex flex-col justify-between gap-1.5 w-full min-w-0 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <FixedTimeBadge
                                startTime={task.startTime}
                                endTime={task.endTime}
                              />
                              <PriorityBadge
                                priority={task.priority}
                                isInteractive={!isCompleted}
                                onClick={(e) => handleTogglePriority(task, e)}
                                title="Click to cycle priority"
                              />
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                }}
                                title="Edit task"
                                className="p-1 rounded-lg bg-white/50 hover:bg-white text-[#0f172a]/70 hover:text-[#0f172a] text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleUnscheduleTask(task, e)}
                                title="Unpin / Make Flexible"
                                className="p-1 rounded-lg bg-white/50 hover:bg-white text-[#0f172a]/70 hover:text-[#0f172a] text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Flexible</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRequest(task);
                                }}
                                title="Delete"
                                className="p-1 rounded-lg bg-white/50 hover:bg-rose-500 hover:text-white text-[#0f172a]/70 text-[10px] cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const startX = rect.left + rect.width / 2;
                                const startY = rect.top + rect.height / 2;
                                onToggleStatus(task.id, { startX, startY });
                              }}
                              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-[#0f172a] text-white'
                                  : 'bg-white/60 hover:bg-white text-transparent hover:text-slate-500'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </button>
                            <h4
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isCompleted) setEditingTask(task);
                              }}
                              title={task.title}
                              className={`text-xs sm:text-sm font-extrabold text-[#0f172a] cursor-pointer hover:underline leading-snug ${
                                isCompleted ? 'line-through opacity-50' : ''
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Standard Multi-row Layout for >30m blocks */
                      <div className="flex flex-col justify-between h-full min-w-0">
                        {/* Top Row: Time Range, Lock Anchor Pill, Priority, Actions */}
                        <div className="flex items-center justify-between gap-1 flex-nowrap min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap min-w-0 overflow-hidden">
                            <FixedTimeBadge
                              startTime={task.startTime}
                              endTime={task.endTime}
                            />
                            <PriorityBadge
                              priority={task.priority}
                              isInteractive={!isCompleted}
                              onClick={(e) => handleTogglePriority(task, e)}
                              title="Click to cycle priority"
                            />
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                              title="Edit task"
                              className="p-1 rounded-lg bg-white/40 hover:bg-white text-[#0f172a]/70 hover:text-[#0f172a] text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleUnscheduleTask(task, e)}
                              title="Unpin / Make Flexible"
                              className="p-1 rounded-lg bg-white/40 hover:bg-white text-[#0f172a]/70 hover:text-[#0f172a] text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span className="hidden sm:inline">Make Flexible</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRequest(task);
                              }}
                              title="Delete"
                              className="p-1 rounded-lg bg-white/40 hover:bg-rose-500 hover:text-white text-[#0f172a]/70 text-[10px] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Title & Checkbox */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0 overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const startX = rect.left + rect.width / 2;
                              const startY = rect.top + rect.height / 2;
                              onToggleStatus(task.id, { startX, startY });
                            }}
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-[#0f172a] text-white'
                                : 'bg-white/60 hover:bg-white text-transparent hover:text-slate-500'
                            }`}
                          >
                            <Check className="w-2 sm:w-2.5 h-2 sm:h-2.5 stroke-[3]" />
                          </button>
                          <h4
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isCompleted) setEditingTask(task);
                            }}
                            title="Click to edit task"
                            className={`text-xs sm:text-sm font-extrabold truncate text-[#0f172a] cursor-pointer hover:underline min-w-0 ${
                              isCompleted ? 'line-through opacity-50' : ''
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={!!editingTask}
        task={editingTask}
        allTasks={allTasks.length > 0 ? allTasks : tasks}
        onClose={() => setEditingTask(null)}
        onUpdateTask={onUpdateTask}
        onDeleteRequest={onDeleteRequest}
      />
    </div>
  );
};
