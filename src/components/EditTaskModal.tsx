import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Lock,
  Unlock,
  Clock,
  Calendar,
  Repeat,
  Trash2,
  Check,
  Zap,
  Edit2,
} from 'lucide-react';
import { Task, EnergyLevel, PriorityLevel, TaskBucket } from '../types';
import {
  deriveBucketFromDate,
  getTodayDateString,
  ORDERED_DAYS_OF_WEEK,
} from '../utils/dateUtils';
import { parseSingleTaskWithAI } from '../utils/aiScheduler';
import { normalizePriority } from './Badges';
import { DurationPicker, parseDurationToMinutes } from './DurationPicker';

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  allTasks?: Task[];
  onClose: () => void;
  onUpdateTask: (task: Task, updateScope?: 'single' | 'all_recurring') => void;
  onDeleteRequest?: (task: Task) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  allTasks = [],
  onClose,
  onUpdateTask,
  onDeleteRequest,
}) => {
  if (!isOpen || !task) return null;

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editEnergy, setEditEnergy] = useState<EnergyLevel>(task.energyLevel);
  const [editPriority, setEditPriority] = useState<PriorityLevel>(
    normalizePriority(task.priority)
  );
  const [editTime, setEditTime] = useState(task.estimatedTime || '30m');
  const [editDueDate, setEditDueDate] = useState(task.dueDate || getTodayDateString());
  const [editIsFixedTime, setEditIsFixedTime] = useState<boolean>(!!task.isFixedTime);
  const [editStartTime, setEditStartTime] = useState<string>(task.startTime || '14:00');
  const [editEndTime, setEditEndTime] = useState<string>(task.endTime || '15:30');

  // Repeat (Weekly) State
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>(task.recurringDays || []);
  const [updateScope, setUpdateScope] = useState<'single' | 'all_recurring'>('single');
  const [editAiFeedback, setEditAiFeedback] = useState<string | null>(null);

  // Synchronize state on modal open or task change
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || '');
      setEditPriority(normalizePriority(task.priority));
      setEditEnergy(task.energyLevel);
      setEditTime(task.estimatedTime || '30m');
      setEditDueDate(task.dueDate || getTodayDateString());
      setEditIsFixedTime(!!task.isFixedTime);
      setEditStartTime(task.startTime || '14:00');
      setEditEndTime(task.endTime || '15:30');
      setEditSelectedDays(task.recurringDays || []);
      setUpdateScope('single');
      setEditAiFeedback(null);
    }
  }, [task, isOpen]);

  // AI helper for analyzing task text in edit mode
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
    if (!allTasks || allTasks.length === 0 || !task) return [];
    const targetGroupId = task.recurringGroupId;
    const targetTitle = task.title.trim().toLowerCase();

    return allTasks.filter((t) => {
      if (targetGroupId && t.recurringGroupId === targetGroupId) return true;
      if (t.isRecurring && t.title.trim().toLowerCase() === targetTitle) return true;
      return false;
    });
  }, [allTasks, task]);

  const isRepeatedTask = task.isRecurring || matchingRecurringTasks.length > 1;

  const toggleRecurringDay = (day: string) => {
    if (editSelectedDays.includes(day)) {
      setEditSelectedDays(editSelectedDays.filter((d) => d !== day));
    } else {
      setEditSelectedDays([...editSelectedDays, day]);
    }
  };

  const handleSave = (scope: 'single' | 'all_recurring' = updateScope) => {
    if (!editTitle.trim() || !task) return;

    let minutes = 30;
    if (editIsFixedTime && editStartTime && editEndTime) {
      const [startH, startM] = editStartTime.split(':').map(Number);
      const [endH, endM] = editEndTime.split(':').map(Number);
      const totalStart = (startH || 0) * 60 + (startM || 0);
      const totalEnd = (endH || 0) * 60 + (endM || 0);
      minutes = Math.max(15, totalEnd - totalStart);
    } else {
      minutes = parseDurationToMinutes(editTime);
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
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(updateScope);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-[6px_6px_0px_#0f172a] border-[3px] border-slate-900 flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Edit Task</h3>
              <p className="text-xs font-semibold text-slate-600">Update schedule, priority, energy, or duration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900 transition-transform active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title Input + AI Trigger */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-900">
              Task Title
            </label>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border-2 border-slate-900 px-3 py-2 focus-within:shadow-[2px_2px_0px_#0f172a] transition-all">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleApplyAiToEdit}
                disabled={!editTitle.trim()}
                title="Apply AI to analyze title, duration, energy, and priority"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-indigo-200 hover:bg-indigo-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                <span>AI Assist</span>
              </button>
            </div>
          </div>

          {editAiFeedback && (
            <div className="text-xs font-bold text-slate-900 bg-indigo-100 border-2 border-slate-900 p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in shadow-[2px_2px_0px_#0f172a]">
              <Sparkles className="w-4 h-4 text-indigo-700 flex-shrink-0" />
              <span>{editAiFeedback}</span>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-900">
              Notes & Sub-steps
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Add details, links, or bullet checklist items..."
              rows={2}
              className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:shadow-[2px_2px_0px_#0f172a] resize-none font-mono"
            />
          </div>

          {/* Priority & Energy Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                <option value="Critical">🔥 Critical Priority (P1)</option>
                <option value="Core">⚡ Core Priority (P2)</option>
                <option value="Can Wait">⏳ Can Wait (P3)</option>
              </select>
            </div>

            {/* Energy */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                Energy Level
              </label>
              <select
                value={editEnergy}
                onChange={(e) => setEditEnergy(e.target.value as EnergyLevel)}
                className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                <option value="High">⚡ High Energy (Purple)</option>
                <option value="Medium">🌀 Medium Energy (Blue)</option>
                <option value="Low">🌱 Low Energy (Green)</option>
              </select>
            </div>
          </div>

          {/* Target Due Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Scheduled Date</span>
            </label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none shadow-[2px_2px_0px_#0f172a] cursor-pointer"
            />
          </div>

          {/* Fixed Time vs Flexible Toggle */}
          <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-slate-900 space-y-3 shadow-[2px_2px_0px_#0f172a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {editIsFixedTime ? (
                  <Lock className="w-4 h-4 text-slate-900" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-900" />
                )}
                <span className="text-xs font-black text-slate-900">
                  {editIsFixedTime ? 'Fixed Time Block (Pinned on Grid)' : 'Flexible Duration Task'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !editIsFixedTime;
                  setEditIsFixedTime(next);
                  if (!next) {
                    setEditSelectedDays([]);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-2 border-slate-900 ${
                  editIsFixedTime
                    ? 'bg-amber-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {editIsFixedTime ? 'Fixed' : 'Flexible'}
              </button>
            </div>

            {editIsFixedTime ? (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <span className="text-xs font-bold text-slate-600">From:</span>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
                <span className="text-xs font-black text-slate-900">–</span>
                <span className="text-xs font-bold text-slate-600">To:</span>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-700 font-bold">Estimated Duration</span>
                <DurationPicker
                  compact
                  value={parseDurationToMinutes(editTime)}
                  onChange={(_, formatted) => setEditTime(formatted)}
                />
              </div>
            )}
          </div>

          {/* Repeat (Weekly) Section if Fixed Time */}
          {editIsFixedTime && (
            <div className="p-3.5 rounded-xl bg-amber-100/60 border-2 border-slate-900 space-y-2 shadow-[2px_2px_0px_#0f172a]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-slate-900" />
                  <span>Repeat (Weekly)</span>
                </label>
                {editSelectedDays.length > 0 && (
                  <span className="text-[10px] font-black text-slate-900 bg-amber-300 border border-slate-900 px-2 py-0.5 rounded-md">
                    {editSelectedDays.join(', ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
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
          )}

          {/* Recurring Scope Selector */}
          {isRepeatedTask && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border-2 border-slate-900 space-y-2 shadow-[2px_2px_0px_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Update Recurring Series</span>
                </span>
                <span className="text-[10px] font-bold text-slate-900 bg-indigo-200 border border-slate-900 px-2 py-0.5 rounded-md">
                  {matchingRecurringTasks.length > 0
                    ? `${matchingRecurringTasks.length} in series`
                    : 'Recurring'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUpdateScope('single')}
                  className={`p-2 rounded-lg text-left transition-all border-2 border-slate-900 cursor-pointer ${
                    updateScope === 'single'
                      ? 'bg-amber-100 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-black text-slate-900">Only this task</div>
                  <div className="text-[10px] font-medium text-slate-600 mt-0.5">This day only</div>
                </button>

                <button
                  type="button"
                  onClick={() => setUpdateScope('all_recurring')}
                  className={`p-2 rounded-lg text-left transition-all border-2 border-slate-900 cursor-pointer ${
                    updateScope === 'all_recurring'
                      ? 'bg-amber-100 shadow-[2px_2px_0px_#0f172a]'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-black text-slate-900">All in series</div>
                  <div className="text-[10px] font-medium text-slate-600 mt-0.5">All repeat days</div>
                </button>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 mt-1">
            {onDeleteRequest ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteRequest(task);
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border-2 border-rose-600 shadow-[2px_2px_0px_#e11d48] transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border-2 border-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-black bg-amber-400 text-slate-900 border-2 border-slate-900 hover:bg-amber-300 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
