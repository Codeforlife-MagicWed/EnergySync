import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Lock,
  X,
  Plus,
  Repeat,
  Trash2,
  ArrowLeft,
  CheckCheck,
  Wand2,
  FileText,
  ListPlus,
  Loader2,
  Zap,
  Flame,
  Activity,
  Leaf,
} from 'lucide-react';
import { EnergyLevel, PriorityLevel, TaskBucket } from '../types';
import {
  suggestEnergyLevel,
  suggestPriorityLevel,
  deriveBucketFromDate,
  extractBulkTasksFromText,
  extractTasksFromText,
} from '../utils/aiScheduler';
import {
  getTodayDateString,
  getLocalDateString,
  ORDERED_DAYS_OF_WEEK,
  generateRecurringDates,
} from '../utils/dateUtils';
import { PriorityBadge, EnergyBadge } from './Badges';
import { DurationPicker, parseDurationToMinutes, formatDurationString } from './DurationPicker';
import { ChronoLoader } from './ChronoLoader';

export interface TaskCreationData {
  title: string;
  description: string;
  energyLevel: EnergyLevel;
  priority: PriorityLevel;
  estimatedTime: string;
  estimatedMinutes: number;
  dueDate: string;
  bucket: TaskBucket;
  isFixedTime?: boolean;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
  recurringDays?: string[];
  recurringGroupId?: string;
}

interface ExtractedTaskItem {
  id: string;
  title: string;
  description: string;
  energyLevel: EnergyLevel;
  priority: PriorityLevel;
  estimatedMinutes: number;
  dueDate: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: TaskCreationData | TaskCreationData[]) => void;
  suggestedEnergy?: EnergyLevel;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  suggestedEnergy = 'Medium',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const todayStr = getTodayDateString();

  // Unified Text Input (Single task or Bulk text)
  const [rawText, setRawText] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);
  const [durationMinutes, setDurationMinutes] = useState<string>('30');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(suggestedEnergy);
  const [priority, setPriority] = useState<PriorityLevel>('Core');

  // Fixed Time Toggle & Inputs
  const [isFixedTime, setIsFixedTime] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('15:30');

  // Recurring (Weekly) State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [endRepeatDate, setEndRepeatDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return getLocalDateString(d);
  });

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Mode & Review States
  const [isReviewingBulk, setIsReviewingBulk] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTaskItem[]>([]);
  const [forceMode, setForceMode] = useState<'auto' | 'single' | 'bulk'>('auto');

  // Compute if input is considered bulk (multiple lines or forced)
  const nonEmptyLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const isAutoBulk = nonEmptyLines.length > 1;
  const isBulkMode = forceMode === 'auto' ? isAutoBulk : forceMode === 'bulk';

  // Auto-resize textarea height
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 72), 240)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [rawText, isBulkMode]);

  // Auto focus & reset form state on open/close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
        adjustTextareaHeight();
      }, 60);
      setEnergyLevel(suggestedEnergy);
      const currentToday = getTodayDateString();
      setDueDate(currentToday);

      const d = new Date();
      d.setDate(d.getDate() + 28);
      setEndRepeatDate(getLocalDateString(d));
    } else {
      setRawText('');
      setDescription('');
      setIsFixedTime(false);
      setSelectedDays([]);
      setPriority('Core');
      setDurationMinutes('30');
      setAiFeedback(null);
      setIsReviewingBulk(false);
      setIsExtracting(false);
      setExtractedTasks([]);
      setForceMode('auto');
    }
  }, [isOpen, suggestedEnergy]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Recalculate duration automatically when Fixed Time start/end times change
  useEffect(() => {
    if (isFixedTime && startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
        let diff = endH * 60 + endM - (startH * 60 + startM);
        if (diff < 0) diff += 24 * 60;
        if (diff > 0) setDurationMinutes(String(diff));
      }
    }
  }, [isFixedTime, startTime, endTime]);

  // Toggle recurring day selection
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Bulk Extraction Trigger
  const handleExtractBulk = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);

    try {
      const parsedResults = await extractTasksFromText(rawText);
      const items: ExtractedTaskItem[] = parsedResults.map((p, idx) => ({
        id: `ext_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        title: p.title || 'Untitled task',
        description: '',
        energyLevel: p.energy,
        priority: p.priority,
        estimatedMinutes: Number(p.duration) || 30,
        dueDate: p.date || todayStr,
      }));

      if (items.length === 0) {
        alert('No actionable tasks could be extracted from the text.');
        setIsExtracting(false);
        return;
      }

      setExtractedTasks(items);
      setIsExtracting(false);
      setIsReviewingBulk(true);
    } catch (err: any) {
      console.error('Task extraction failed:', err);
      alert(`AI Extraction Error: ${err.message || 'Failed to extract tasks'}`);
      setIsExtracting(false);
    }
  };

  // Extracted Task modification helpers
  const handleUpdateExtractedTask = (id: string, updates: Partial<ExtractedTaskItem>) => {
    setExtractedTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteExtractedTask = (id: string) => {
    setExtractedTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddBlankExtractedTask = () => {
    const newItem: ExtractedTaskItem = {
      id: `ext_${Date.now()}_new_${Math.random().toString(36).substring(2, 6)}`,
      title: 'New action item',
      description: '',
      energyLevel: 'Medium',
      priority: 'Core',
      estimatedMinutes: 30,
      dueDate: todayStr,
    };
    setExtractedTasks((prev) => [...prev, newItem]);
  };

  // Approve & Push All Extracted Tasks
  const handleApproveExtractedTasks = () => {
    if (extractedTasks.length === 0) return;

    const formattedTasks: TaskCreationData[] = extractedTasks.map((item) => {
      const mins = item.estimatedMinutes || 30;
      const formattedTime =
        mins >= 60
          ? `${Math.floor(mins / 60)}h${Math.round(mins % 60) > 0 ? ` ${Math.round(mins % 60)}m` : ''}`
          : `${mins % 1 === 0 ? mins : mins.toFixed(1)}m`;

      const targetDate = item.dueDate || todayStr;
      return {
        title: item.title.trim() || 'Untitled Action Item',
        description: item.description?.trim() || '',
        energyLevel: item.energyLevel,
        priority: item.priority,
        estimatedTime: formattedTime,
        estimatedMinutes: mins,
        dueDate: targetDate,
        bucket: deriveBucketFromDate(targetDate),
      };
    });

    onAddTask(formattedTasks);
    onClose();
  };

  // Calculate recurring tasks preview
  const recurringDates =
    isFixedTime && selectedDays.length > 0 && endRepeatDate
      ? generateRecurringDates(dueDate || todayStr, endRepeatDate, selectedDays)
      : [];

  // Single Task Submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    let mins = parseFloat(durationMinutes);
    if (isNaN(mins) || mins <= 0) mins = 30;

    const formattedTime =
      mins >= 60
        ? `${Math.floor(mins / 60)}h${Math.round(mins % 60) > 0 ? ` ${Math.round(mins % 60)}m` : ''}`
        : `${mins % 1 === 0 ? mins : mins.toFixed(1)}m`;

    const targetDueDate = dueDate || getTodayDateString();

    if (isFixedTime && selectedDays.length > 0 && endRepeatDate) {
      const dates = generateRecurringDates(targetDueDate, endRepeatDate, selectedDays);
      const recurringGroupId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const tasksToCreate: TaskCreationData[] = dates.map((dateStr) => ({
        title: rawText.trim(),
        description: description.trim(),
        energyLevel,
        priority,
        estimatedTime: formattedTime,
        estimatedMinutes: mins,
        dueDate: dateStr,
        bucket: deriveBucketFromDate(dateStr),
        isFixedTime: true,
        startTime,
        endTime,
        isRecurring: true,
        recurringDays: [...selectedDays],
        recurringGroupId,
      }));

      onAddTask(tasksToCreate);
    } else {
      const assignedBucket = deriveBucketFromDate(targetDueDate);
      onAddTask({
        title: rawText.trim(),
        description: description.trim(),
        energyLevel,
        priority,
        estimatedTime: formattedTime,
        estimatedMinutes: mins,
        dueDate: targetDueDate,
        bucket: assignedBucket,
        isFixedTime,
        startTime: isFixedTime ? startTime : undefined,
        endTime: isFixedTime ? endTime : undefined,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${
          isReviewingBulk ? 'max-w-2xl' : 'max-w-xl'
        } max-h-[92vh] overflow-y-auto bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-2xl sm:rounded-3xl p-5 sm:p-7 z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-4 text-slate-900 select-none`}
      >
        {/* ========================================================= */}
        {/* STATE 2: REVIEW & ADJUST EXTRACTED TASKS (BULK REVIEW)   */}
        {/* ========================================================= */}
        {isReviewingBulk ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Review Header */}
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-900/10">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReviewingBulk(false)}
                  title="Back to text input"
                  className="p-1.5 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Review & Adjust Tasks</span>
                    </h2>
                    <span className="text-[11px] font-black text-indigo-900 bg-indigo-200 border-2 border-slate-900 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_#0f172a]">
                      {extractedTasks.length} task{extractedTasks.length !== 1 ? 's' : ''} ready
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    Fine-tune dates, energy & priorities before adding to your board
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Extracted Tasks Floating Rows */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {extractedTasks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300">
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    No tasks remaining in this review.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddBlankExtractedTask}
                    className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add a task manually
                  </button>
                </div>
              ) : (
                extractedTasks.map((taskItem, index) => (
                  <div
                    key={taskItem.id}
                    className="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-2.5 animate-in fade-in"
                  >
                    {/* Top Row: Index, Title Input, Trash Action */}
                    <div className="flex items-start gap-2.5">
                      <span className="text-[11px] font-black text-slate-400 pt-2 w-4 select-none">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={taskItem.title}
                          onChange={(e) =>
                            handleUpdateExtractedTask(taskItem.id, { title: e.target.value })
                          }
                          placeholder="Action item title..."
                          className="w-full bg-white border-2 border-slate-900 rounded-lg px-3 py-1.5 font-black text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[1px_1px_0px_#0f172a] placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExtractedTask(taskItem.id)}
                        title="Discard this item"
                        className="p-1.5 rounded-lg border-2 border-slate-900 bg-rose-100 hover:bg-rose-200 text-rose-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline Attributes: Date, Duration, Energy, Priority */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t-2 border-slate-900/10">
                      {/* Date Picker */}
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <input
                          type="date"
                          value={taskItem.dueDate}
                          onChange={(e) =>
                            handleUpdateExtractedTask(taskItem.id, { dueDate: e.target.value })
                          }
                          className="bg-transparent font-black text-[11px] text-slate-900 border-none p-0 focus:outline-none cursor-pointer"
                        />
                      </div>

                      {/* Duration (Unrestricted & Multi-Option) */}
                      <DurationPicker
                        compact
                        value={taskItem.estimatedMinutes}
                        onChange={(mins) =>
                          handleUpdateExtractedTask(taskItem.id, {
                            estimatedMinutes: mins,
                          })
                        }
                      />

                      {/* Energy Selector Pill */}
                      <div className="flex items-center gap-1">
                        {(['High', 'Medium', 'Low'] as EnergyLevel[]).map((eng) => (
                          <button
                            key={eng}
                            type="button"
                            onClick={() =>
                              handleUpdateExtractedTask(taskItem.id, { energyLevel: eng })
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border-2 border-slate-900 transition-all cursor-pointer shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${
                              taskItem.energyLevel === eng
                                ? eng === 'High'
                                  ? 'bg-emerald-400 text-slate-900'
                                  : eng === 'Low'
                                  ? 'bg-sky-300 text-slate-900'
                                  : 'bg-purple-300 text-slate-900'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {eng === 'High' ? (
                              <Zap className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            ) : eng === 'Medium' ? (
                              <Activity className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            ) : (
                              <Leaf className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            )}
                            <span>{eng}</span>
                          </button>
                        ))}
                      </div>

                      {/* Priority Selector Pill */}
                      <div className="flex items-center gap-1">
                        {(['Critical', 'Core', 'Can Wait'] as PriorityLevel[]).map((pri) => (
                          <button
                            key={pri}
                            type="button"
                            onClick={() =>
                              handleUpdateExtractedTask(taskItem.id, { priority: pri })
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border-2 border-slate-900 transition-all cursor-pointer shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${
                              taskItem.priority === pri
                                ? pri === 'Critical'
                                  ? 'bg-rose-400 text-slate-900'
                                  : pri === 'Can Wait'
                                  ? 'bg-slate-300 text-slate-900'
                                  : 'bg-amber-400 text-slate-900'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pri === 'Critical' ? (
                              <Flame className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            ) : pri === 'Can Wait' ? (
                              <Clock className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            ) : (
                              <Zap className="w-3 h-3 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                            )}
                            <span>{pri === 'Critical' ? 'Crit' : pri === 'Can Wait' ? 'Wait' : 'Core'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Another Task in Review Mode */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddBlankExtractedTask}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-indigo-200 hover:bg-indigo-300 border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Item</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReviewingBulk(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Edit Raw Text
              </button>
            </div>

            {/* Review Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-900/10">
              <button
                type="button"
                onClick={() => setIsReviewingBulk(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                Back to Input
              </button>
              <button
                type="button"
                onClick={handleApproveExtractedTasks}
                disabled={extractedTasks.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4 text-slate-900" />
                <span>Approve & Add {extractedTasks.length} Tasks</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* STATE 1: UNIFIED INPUT (SINGLE FORM vs BULK AI DETECTED)  */
          /* ========================================================= */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-900/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center transition-colors ${
                    isBulkMode
                      ? 'bg-indigo-300 text-indigo-950'
                      : energyLevel === 'High'
                      ? 'bg-emerald-300 text-emerald-950'
                      : energyLevel === 'Low'
                      ? 'bg-cyan-300 text-cyan-950'
                      : 'bg-amber-300 text-amber-950'
                  }`}
                >
                  {isBulkMode ? <Wand2 className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                      {isBulkMode ? 'Bulk AI Task Extractor' : 'Create Actionable Task'}
                    </h2>
                    {/* Mode Indicator Pill */}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] transition-all ${
                        isBulkMode
                          ? 'bg-indigo-200 text-indigo-950'
                          : 'bg-amber-200 text-amber-950'
                      }`}
                    >
                      {isBulkMode ? 'Bulk AI Mode' : 'Single Task'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    {isBulkMode
                      ? 'AI will parse multiple tasks, deadlines & energy profiles'
                      : 'Direct entry with cognitive load & schedule alignment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Form Body */}
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* Textarea Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    {isBulkMode ? (
                      <>
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Meeting Notes / Brain Dump</span>
                      </>
                    ) : (
                      <span>Task Name</span>
                    )}
                  </label>

                  {/* AI Quick Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExtractBulk}
                      disabled={!rawText.trim() || isExtracting}
                      title="AI extracts tasks, dates, durations, priority & energy via LLM"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-indigo-200 hover:bg-indigo-300 border-2 border-slate-900 px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isExtracting ? (
                        <>
                          <ChronoLoader size="xs" className="text-slate-900" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                          <span>Extract Tasks via AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    required
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Type a single task, or paste meeting notes/long text for AI extraction..."
                    className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:shadow-[2px_2px_0px_#0f172a] transition-all resize-none leading-relaxed"
                  />

                  {/* Word / Line count indicator for bulk mode */}
                  {isBulkMode && (
                    <div className="flex items-center justify-between pt-1.5 px-1 text-[11px] font-bold text-slate-600">
                      <span>
                        {nonEmptyLines.length} line{nonEmptyLines.length !== 1 ? 's' : ''} •{' '}
                        {rawText.trim().length} characters
                      </span>
                      <button
                        type="button"
                        onClick={() => setForceMode(forceMode === 'single' ? 'auto' : 'single')}
                        className="text-indigo-700 font-black hover:underline cursor-pointer"
                      >
                        {forceMode === 'single' ? 'Auto-detect mode' : 'Treat as single task'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Feedback Banner */}
              {aiFeedback && !isBulkMode && (
                <div className="text-xs font-black text-indigo-950 bg-indigo-100 border-2 border-slate-900 p-2.5 rounded-xl shadow-[2px_2px_0px_#0f172a] animate-in fade-in flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>{aiFeedback}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* MODE A: SINGLE TASK SELECTORS (Smooth Fade-Out in Bulk)   */}
              {/* ========================================================= */}
              <div
                className={`transition-all duration-300 ease-in-out space-y-4 ${
                  isBulkMode
                    ? 'opacity-0 max-h-0 overflow-hidden pointer-events-none scale-[0.98] py-0 my-0'
                    : 'opacity-100 max-h-[800px] scale-100'
                }`}
              >
                {/* Description (Single Task) */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Description / Notes (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Key notes, links, or context..."
                    className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:shadow-[2px_2px_0px_#0f172a] transition-all resize-none font-mono"
                  />
                </div>

                {/* Due Date & Estimated Duration */}
                <div className="space-y-3">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Target Date:
                    </label>
                    <input
                      type="date"
                      required={!isBulkMode}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[1px_1px_0px_#0f172a] cursor-pointer"
                    />
                  </div>

                  {/* Comprehensive Duration Picker */}
                  <DurationPicker
                    value={parseDurationToMinutes(durationMinutes)}
                    onChange={(mins) => {
                      setDurationMinutes(String(mins));
                      // If fixed time is active, automatically adjust endTime based on startTime + mins
                      if (isFixedTime && startTime) {
                        const [startH, startM] = startTime.split(':').map(Number);
                        if (!isNaN(startH) && !isNaN(startM)) {
                          const totalStartMins = startH * 60 + startM;
                          const totalEndMins = (totalStartMins + mins) % (24 * 60);
                          const endH = Math.floor(totalEndMins / 60);
                          const endM = totalEndMins % 60;
                          setEndTime(
                            `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
                          );
                        }
                      }
                    }}
                    label="Estimated Focus Duration"
                  />
                </div>

                {/* Fixed-Time Anchor Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  <button
                    type="button"
                    onClick={() => setIsFixedTime(!isFixedTime)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${
                      isFixedTime
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Fixed Time Anchor: {isFixedTime ? 'ON' : 'OFF'}</span>
                  </button>

                  {isFixedTime && (
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] animate-in fade-in">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-transparent font-black text-slate-900 text-xs focus:outline-none cursor-pointer border-none"
                      />
                      <span className="text-slate-500 font-black">–</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-transparent font-black text-slate-900 text-xs focus:outline-none cursor-pointer border-none"
                      />
                    </div>
                  )}
                </div>

                {/* Repeat (Weekly) Section */}
                {isFixedTime && (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Repeat (Weekly)</span>
                      </label>
                      {selectedDays.length > 0 && (
                        <span className="text-[11px] font-black text-indigo-900 bg-indigo-200 border-2 border-slate-900 px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#0f172a]">
                          {recurringDates.length} session{recurringDates.length !== 1 ? 's' : ''}{' '}
                          generated
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black text-slate-600">
                        Select Recurring Days:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ORDERED_DAYS_OF_WEEK.map((day) => {
                          const isSelected = selectedDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${
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

                    {selectedDays.length > 0 && (
                      <div className="space-y-1 pt-1 animate-in fade-in">
                        <label className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>End Repeat:</span>
                        </label>
                        <input
                          type="date"
                          min={dueDate}
                          value={endRepeatDate}
                          onChange={(e) => setEndRepeatDate(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[1px_1px_0px_#0f172a] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Priority & Energy Tactile Selectable Buttons */}
                <div className="space-y-3 pt-1">
                  {/* Priority Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider w-16">
                      Priority:
                    </span>
                    <button
                      type="button"
                      onClick={() => setPriority('Critical')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        priority === 'Critical'
                          ? 'bg-rose-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-rose-50 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Flame className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>Critical</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('Core')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        priority === 'Core'
                          ? 'bg-amber-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-amber-50 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>Core</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('Can Wait')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        priority === 'Can Wait'
                          ? 'bg-slate-300 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>Can Wait</span>
                    </button>
                  </div>

                  {/* Energy Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider w-16">
                      Energy:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnergyLevel('High')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        energyLevel === 'High'
                          ? 'bg-emerald-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-emerald-50 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>High Energy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnergyLevel('Medium')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        energyLevel === 'Medium'
                          ? 'bg-purple-300 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-purple-50 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Activity className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>Medium Energy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnergyLevel('Low')}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                        energyLevel === 'Low'
                          ? 'bg-sky-300 text-slate-900 shadow-[2px_2px_0px_#0f172a] -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-sky-50 shadow-[1px_1px_0px_#0f172a]'
                      }`}
                    >
                      <Leaf className="w-4 h-4 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                      <span>Low Energy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* MODE B: BULK AI PROMPT CARD (Appears in Bulk Mode)       */}
              {/* ========================================================= */}
              {isBulkMode && (
                <div className="p-4 rounded-xl bg-indigo-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-indigo-950 text-xs font-black">
                    <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>AI Task Extraction Engine</span>
                  </div>
                  <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                    AI will automatically analyze your notes, detect dates and duration estimates,
                    assign optimal energy scores, and present a checklist for your review.
                  </p>
                </div>
              )}

              <div className="h-0.5 bg-slate-900/10 my-1" />

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Extract Tasks via AI Button - always available when text exists */}
                  <button
                    type="button"
                    onClick={handleExtractBulk}
                    disabled={!rawText.trim() || isExtracting}
                    title="Extract tasks via Gemini AI and review in structured list"
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-200 hover:bg-indigo-300 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isExtracting ? (
                      <>
                        <ChronoLoader size="sm" className="text-slate-900" />
                        <span>Processing AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-indigo-700" />
                        <span>Extract Tasks via AI</span>
                      </>
                    )}
                  </button>

                  {!isBulkMode && (
                    <button
                      type="submit"
                      disabled={!rawText.trim()}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                        rawText.trim()
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border-slate-300'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {recurringDates.length > 1
                          ? `Add ${recurringDates.length} Recurring Tasks`
                          : `Add to ${dueDate === todayStr ? 'Today' : 'Board'}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
