import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ArrowRight,
  Lock,
  GripVertical,
  Repeat,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Task, EnergyLevel, PriorityLevel, TaskBucket } from '../types';
import {
  deriveBucketFromDate,
  getTodayDateString,
  ORDERED_DAYS_OF_WEEK,
} from '../utils/dateUtils';
import {
  parseSingleTaskWithAI,
} from '../utils/aiScheduler';
import {
  PriorityBadge,
  EnergyBadge,
  FixedTimeBadge,
  TimeDurationBadge,
  DueDateBadge,
  GmailAiBadge,
  RecurringBadge,
  normalizePriority,
} from './Badges';
import { DurationPicker, parseDurationToMinutes, formatDurationString } from './DurationPicker';

interface TaskRowProps {
  task: Task;
  allTasks?: Task[];
  onToggleStatus: (taskId: string, coords?: { startX: number; startY: number }) => void;
  onDeleteRequest: (task: Task) => void;
  onUpdateTask: (task: Task, updateScope?: 'single' | 'all_recurring') => void;
  onMoveBucket: (taskId: string, bucket: TaskBucket) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  allTasks = [],
  onToggleStatus,
  onDeleteRequest,
  onUpdateTask,
  onMoveBucket,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editEnergy, setEditEnergy] = useState<EnergyLevel>(task.energyLevel);
  const [editPriority, setEditPriority] = useState<PriorityLevel>(
    normalizePriority(task.priority)
  );
  const [editTime, setEditTime] = useState(task.estimatedTime);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || getTodayDateString());
  const [editIsFixedTime, setEditIsFixedTime] = useState<boolean>(!!task.isFixedTime);
  const [editStartTime, setEditStartTime] = useState<string>(task.startTime || '14:00');
  const [editEndTime, setEditEndTime] = useState<string>(task.endTime || '15:30');

  // Repeat (Weekly) State
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>(task.recurringDays || []);
  const [updateScope, setUpdateScope] = useState<'single' | 'all_recurring'>('single');
  const [editAiFeedback, setEditAiFeedback] = useState<string | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isCompleted = task.status === 'completed';

  // Synchronize state if task prop changes
  useEffect(() => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(normalizePriority(task.priority));
    setEditEnergy(task.energyLevel);
    setEditTime(task.estimatedTime);
    setEditDueDate(task.dueDate || getTodayDateString());
    setEditIsFixedTime(!!task.isFixedTime);
    setEditStartTime(task.startTime || '14:00');
    setEditEndTime(task.endTime || '15:30');
    setEditSelectedDays(task.recurringDays || []);
    setUpdateScope('single');
    setEditAiFeedback(null);
  }, [task, isEditing]);

  // AI helper for single task in edit mode
  const handleApplyAiToEdit = () => {
    if (!editTitle.trim()) return;
    const parsed = parseSingleTaskWithAI(editTitle);

    setEditTitle(parsed.cleanTitle);
    setEditDueDate(parsed.dueDate);
    setEditEnergy(parsed.energyLevel);
    setEditPriority(parsed.priority);
    setEditTime(`${parsed.durationMinutes}m`);

    if (parsed.isFixedTime && parsed.startTime && parsed.endTime) {
      setEditIsFixedTime(true);
      setEditStartTime(parsed.startTime);
      setEditEndTime(parsed.endTime);
    }

    setEditAiFeedback(parsed.explanation);
    setTimeout(() => setEditAiFeedback(null), 5000);
  };

  // Find other occurrences in the repeated series
  const matchingRecurringTasks = useMemo(() => {
    if (!allTasks || allTasks.length === 0) return [];
    const targetGroupId = task.recurringGroupId;
    const targetTitle = task.title.trim().toLowerCase();

    return allTasks.filter((t) => {
      if (targetGroupId && t.recurringGroupId === targetGroupId) return true;
      if (
        !targetGroupId &&
        task.isRecurring &&
        t.isRecurring &&
        t.title.trim().toLowerCase() === targetTitle
      ) {
        return true;
      }
      return false;
    });
  }, [allTasks, task]);

  const isRepeatedTask =
    matchingRecurringTasks.length > 1 ||
    !!task.isRecurring ||
    !!task.recurringGroupId ||
    (task.recurringDays && task.recurringDays.length > 0) ||
    (editIsFixedTime && editSelectedDays.length > 0);

  // Toggle recurring day selection in edit mode
  const toggleRecurringDay = (day: string) => {
    setEditSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // 1-Click Priority Toggle: Critical -> Core -> Can Wait -> Critical
  const handleTogglePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) return;
    const current = normalizePriority(task.priority);
    const nextPriority: PriorityLevel =
      current === 'Critical' ? 'Core' : current === 'Core' ? 'Can Wait' : 'Critical';
    onUpdateTask({
      ...task,
      priority: nextPriority,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = (scope: 'single' | 'all_recurring') => {
    if (!editTitle.trim()) return;

    let minutes = 30;
    if (editIsFixedTime && editStartTime && editEndTime) {
      const [startH, startM] = editStartTime.split(':').map(Number);
      const [endH, endM] = editEndTime.split(':').map(Number);
      if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
        let diff = endH * 60 + endM - (startH * 60 + startM);
        if (diff < 0) diff += 24 * 60;
        if (diff > 0) minutes = diff;
      }
    } else {
      const rawTime = editTime.trim().toLowerCase();
      const hourMatch = rawTime.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?|hrs?)/i);
      const minMatch = rawTime.match(/(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?)/i);
      const pureNumberMatch = rawTime.match(/^(\d+(?:\.\d+)?)$/);

      if (pureNumberMatch) {
        minutes = parseFloat(pureNumberMatch[1]);
      } else if (hourMatch && minMatch) {
        minutes = parseFloat(hourMatch[1]) * 60 + parseFloat(minMatch[1]);
      } else if (hourMatch) {
        minutes = parseFloat(hourMatch[1]) * 60;
      } else if (minMatch) {
        minutes = parseFloat(minMatch[1]);
      } else {
        const parsed = parseFloat(rawTime);
        if (!isNaN(parsed) && parsed > 0) {
          minutes = parsed;
        }
      }
    }

    if (isNaN(minutes) || minutes <= 0) {
      minutes = 30;
    }

    const formattedTime =
      minutes >= 60
        ? `${Math.floor(minutes / 60)}h${Math.round(minutes % 60) > 0 ? ` ${Math.round(minutes % 60)}m` : ''}`
        : `${minutes % 1 === 0 ? minutes : minutes.toFixed(1)}m`;

    const derivedBucket = deriveBucketFromDate(editDueDate);
    const hasRecurringDays = editIsFixedTime && editSelectedDays.length > 0;

    const updatedTask: Task = {
      ...task,
      title: editTitle.trim(),
      description: editDesc.trim(),
      energyLevel: editEnergy,
      priority: editPriority,
      estimatedTime: formattedTime,
      estimatedMinutes: minutes,
      dueDate: editDueDate,
      bucket: derivedBucket,
      isFixedTime: editIsFixedTime,
      startTime: editIsFixedTime ? editStartTime : undefined,
      endTime: editIsFixedTime ? editEndTime : undefined,
      isRecurring: hasRecurringDays,
      recurringDays: hasRecurringDays ? [...editSelectedDays] : undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updatedTask, scope);
    setIsEditing(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(updateScope);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleFormSubmit}
        className="bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0px_#0f172a] p-4 text-slate-900 my-2 space-y-3 animate-in fade-in duration-150"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title..."
              className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-md px-3 py-1.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#0f172a] transition-all"
              autoFocus
            />

            {/* Quick AI Suggestion Action for Single Task */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleApplyAiToEdit}
                disabled={!editTitle.trim()}
                title="Apply AI to analyze title, duration, energy, and priority"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-indigo-200 hover:bg-indigo-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                <span>✨ Apply AI</span>
              </button>
            </div>
          </div>

          {editAiFeedback && (
            <div className="text-xs font-bold text-slate-900 bg-indigo-100 border-2 border-slate-900 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in shadow-[2px_2px_0px_#0f172a]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>{editAiFeedback}</span>
            </div>
          )}

          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description, notes, or checklist sub-steps..."
            rows={2}
            className="w-full bg-slate-50 border-2 border-slate-900 rounded-md px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#0f172a] resize-none font-mono transition-all"
          />

          {/* Primary Controls Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Priority Select */}
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
              className="bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
            >
              <option value="Critical">Critical Priority</option>
              <option value="Core">Core Priority</option>
              <option value="Can Wait">Can Wait</option>
            </select>

            {/* Energy Select */}
            <select
              value={editEnergy}
              onChange={(e) => setEditEnergy(e.target.value as EnergyLevel)}
              className="bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
            >
              <option value="High">High Energy</option>
              <option value="Medium">Medium Energy</option>
              <option value="Low">Low Energy</option>
            </select>

            {/* Fixed Time Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !editIsFixedTime;
                setEditIsFixedTime(next);
                if (!next) {
                  setEditSelectedDays([]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-2 border-slate-900 ${
                editIsFixedTime
                  ? 'bg-amber-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Fixed Time: {editIsFixedTime ? 'ON' : 'OFF'}</span>
            </button>

            {editIsFixedTime ? (
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer border-none"
                />
                <span className="text-slate-900 font-black">–</span>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer border-none"
                />
              </div>
            ) : (
              <DurationPicker
                compact
                value={parseDurationToMinutes(editTime)}
                onChange={(mins, formatted) => setEditTime(formatted)}
              />
            )}

            {/* Target Date Picker */}
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
            />
          </div>

          {/* Repeat (Weekly) Section in Edit Mode */}
          {editIsFixedTime && (
            <div className="p-3 rounded-xl bg-amber-50 border-2 border-slate-900 space-y-2.5 animate-in fade-in shadow-[2px_2px_0px_#0f172a]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-slate-900" />
                  <span>Repeat (Weekly)</span>
                </label>
                {editSelectedDays.length > 0 && (
                  <span className="text-[11px] font-black text-slate-900 bg-amber-300 border border-slate-900 px-2 py-0.5 rounded-md">
                    {editSelectedDays.join(', ')}
                  </span>
                )}
              </div>

              {/* Day Selectors: [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun] */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700">
                  Select Recurring Days:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ORDERED_DAYS_OF_WEEK.map((day) => {
                    const isSelected = editSelectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRecurringDay(day)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border-2 border-slate-900 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                            : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Repeated Task Update Scope Selector (Only this task vs All repeated tasks) */}
          {isRepeatedTask && (
            <div className="p-3 rounded-xl bg-indigo-50 border-2 border-slate-900 space-y-2.5 animate-in fade-in shadow-[2px_2px_0px_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Update Repeated Task</span>
                </span>
                <span className="text-[11px] font-bold text-slate-900 bg-indigo-200 border border-slate-900 px-2 py-0.5 rounded-md">
                  {matchingRecurringTasks.length > 0
                    ? `${matchingRecurringTasks.length} session${matchingRecurringTasks.length !== 1 ? 's' : ''} in series`
                    : 'Recurring task'}
                </span>
              </div>

              {/* Selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUpdateScope('single')}
                  className={`p-2.5 rounded-lg text-left transition-all border-2 border-slate-900 cursor-pointer ${
                    updateScope === 'single'
                      ? 'bg-amber-100 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                        updateScope === 'single'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white'
                      }`}
                    >
                      {updateScope === 'single' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>Only this task</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1 ml-5.5 leading-snug">
                    Apply edits to this occurrence only ({editDueDate})
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUpdateScope('all_recurring')}
                  className={`p-2.5 rounded-lg text-left transition-all border-2 border-slate-900 cursor-pointer ${
                    updateScope === 'all_recurring'
                      ? 'bg-amber-100 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                        updateScope === 'all_recurring'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white'
                      }`}
                    >
                      {updateScope === 'all_recurring' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span>All repeated tasks</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1 ml-5.5 leading-snug">
                    Update all {matchingRecurringTasks.length > 0 ? matchingRecurringTasks.length : ''} occurrences in this series
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t-2 border-slate-900">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-transparent border-2 border-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isRepeatedTask ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('single')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 border-slate-900 ${
                    updateScope === 'single'
                      ? 'bg-amber-400 text-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a]'
                      : 'bg-white text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#0f172a]'
                  }`}
                >
                  Save This Task Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('all_recurring')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-2 border-slate-900 ${
                    updateScope === 'all_recurring'
                      ? 'bg-amber-400 text-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a]'
                      : 'bg-indigo-300 text-slate-900 hover:bg-indigo-200 shadow-[2px_2px_0px_#0f172a]'
                  }`}
                >
                  Save All Repeated Tasks
                  {matchingRecurringTasks.length > 0 ? ` (${matchingRecurringTasks.length})` : ''}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] transition-all cursor-pointer"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  return (
    <div
      draggable={!isCompleted && !isEditing}
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            taskId: task.id,
            fromBucket: task.bucket,
          })
        );
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => !isCompleted && setIsEditing(true)}
      className={`group relative py-3 px-4 sm:px-5 rounded-xl transition-all duration-150 flex items-start gap-3.5 cursor-grab active:cursor-grabbing border-2 ${
        isDragging ? 'opacity-40 scale-[0.98]' : ''
      } ${
        isCompleted
          ? 'bg-slate-100/80 border-slate-400 opacity-60 shadow-none cursor-default'
          : task.isFixedTime
          ? 'bg-amber-50/90 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:translate-y-[-1px]'
          : 'bg-white border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:translate-y-[-1px]'
      }`}
    >
      {/* Drag Grip Indicator & Brutalist Checkbox */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {!isCompleted && (
          <div
            className={`text-slate-400 group-hover:text-slate-900 transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-40'
            }`}
            title="Drag to move between horizon tabs or onto Calendar timeline grid"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            onToggleStatus(task.id, { startX, startY });
          }}
          title={isCompleted ? 'Mark as incomplete' : 'Mark task completed'}
          className={`w-5 h-5 rounded-md border-2 border-slate-900 flex items-center justify-center transition-all cursor-pointer ${
            isCompleted
              ? 'bg-slate-900 text-white'
              : 'bg-white hover:bg-slate-100 text-transparent hover:text-slate-400 shadow-[1px_1px_0px_#0f172a]'
          }`}
        >
          <Check className={`w-3.5 h-3.5 transition-transform stroke-[3] ${isCompleted ? 'scale-100 text-white' : 'scale-75'}`} />
        </button>
      </div>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {/* Unified Badges / Micro Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {/* Fixed Time Anchor Tag */}
          {task.isFixedTime && (
            <FixedTimeBadge
              startTime={task.startTime}
              endTime={task.endTime}
            />
          )}

          {/* Recurring Weekly Badge */}
          {task.isRecurring && (
            <RecurringBadge recurringDays={task.recurringDays} />
          )}

          {/* Unified Priority Tag (Clickable 1-Click Cycler) */}
          <PriorityBadge
            priority={task.priority}
            isInteractive={!isCompleted}
            onClick={handleTogglePriority}
            title="Click to cycle priority (Critical -> Core -> Can Wait)"
          />

          {/* Unified Energy Tag */}
          <EnergyBadge
            energy={task.energyLevel}
            useLongLabel
          />

          {/* Time Duration Badge */}
          <TimeDurationBadge duration={task.estimatedTime} />

          {/* Due Date Indicator */}
          {task.dueDate && <DueDateBadge dueDate={task.dueDate} />}

          {/* Gmail AI Source */}
          {task.source === 'gmail_scan' && <GmailAiBadge />}
        </div>

        {/* Task Title with In-place Edit trigger */}
        <h3
          onClick={() => !isCompleted && setIsEditing(true)}
          title="Click to edit task inline"
          className={`text-sm sm:text-base font-black tracking-tight leading-snug transition-all cursor-text ${
            isCompleted
              ? 'line-through text-slate-500'
              : normalizePriority(task.priority) === 'Critical'
              ? 'text-slate-950 font-black'
              : 'text-slate-900'
          }`}
        >
          {task.title}
        </h3>

        {/* Description / Subtext */}
        {task.description && (
          <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Quick Actions (Horizon Shift, Edit, Delete) */}
      <div
        className={`flex items-center gap-1.5 transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-0'
        }`}
      >
        {/* Quick Horizon Shift */}
        {task.bucket === 'today' ? (
          <button
            onClick={() => onMoveBucket(task.id, 'tomorrow')}
            title="Defer to Tomorrow"
            className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] bg-white transition-all cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onMoveBucket(task.id, 'today')}
            title="Move to Today"
            className="p-1.5 rounded-lg text-slate-900 hover:bg-emerald-100 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] bg-white transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Inline Edit Trigger */}
        <button
          onClick={() => setIsEditing(true)}
          title="Edit task (with repeat options)"
          className="p-1.5 rounded-lg text-slate-900 hover:bg-amber-100 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] bg-white transition-all cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDeleteRequest(task)}
          title="Delete task"
          className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] bg-white transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

