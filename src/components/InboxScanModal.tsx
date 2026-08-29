import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Sparkles,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Flame,
  Zap,
  Clock,
  Activity,
  Leaf,
} from 'lucide-react';
import { EmailMessage, ExtractedTaskRecommendation, EnergyLevel, PriorityLevel } from '../types';
import { EnergyBadge, PriorityBadge, TimeDurationBadge } from './Badges';
import { ChronoLoader } from './ChronoLoader';

interface InboxScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailMessage[];
  isScanning?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRescan?: () => void;
  onImportTasks: (tasks: ExtractedTaskRecommendation[], emails: EmailMessage[]) => void;
}

const COMMON_DURATIONS = ['15m', '25m', '45m', '60m', '90m'];

export const InboxScanModal: React.FC<InboxScanModalProps> = ({
  isOpen,
  onClose,
  emails,
  isScanning = false,
  isLoading = false,
  isFetching = false,
  error = null,
  onRescan,
  onImportTasks,
}) => {
  const [localEmails, setLocalEmails] = useState<EmailMessage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const activeLoading = isScanning || isLoading || isFetching;

  // Sync local copy of emails when prop changes
  useEffect(() => {
    setLocalEmails(emails);
    if (emails.length > 0) {
      const validIndices = emails
        .map((e, idx) => (e.extractedTask ? idx : -1))
        .filter((i) => i !== -1);
      setSelectedIndices(validIndices);
    } else {
      setSelectedIndices([]);
    }
  }, [emails]);

  if (!isOpen) return null;

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleExpand = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const selectAll = () => {
    const validIndices = localEmails
      .map((e, idx) => (e.extractedTask ? idx : -1))
      .filter((i) => i !== -1);
    setSelectedIndices(validIndices);
  };

  const deselectAll = () => {
    setSelectedIndices([]);
  };

  const handleUpdateTask = (
    emailIndex: number,
    updates: Partial<ExtractedTaskRecommendation>
  ) => {
    setLocalEmails((prev) => {
      const next = [...prev];
      const targetEmail = next[emailIndex];
      if (targetEmail && targetEmail.extractedTask) {
        next[emailIndex] = {
          ...targetEmail,
          extractedTask: {
            ...targetEmail.extractedTask,
            ...updates,
          },
        };
      }
      return next;
    });
  };

  const handleImport = () => {
    const selectedEmails = selectedIndices.map((i) => localEmails[i]).filter(Boolean);
    const tasks = selectedEmails
      .map((e) => e.extractedTask)
      .filter((t): t is ExtractedTaskRecommendation => !!t);

    onImportTasks(tasks, selectedEmails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white border-[3px] border-slate-900 shadow-[8px_8px_0px_#0f172a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b-[3px] border-slate-900 bg-amber-50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-300 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Gmail AI Inbox Triage
                </h3>
                <span className="label-mono text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-300 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                  Live Sync
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Review & edit extracted actionable tasks before importing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRescan && (
              <button
                type="button"
                onClick={onRescan}
                disabled={activeLoading}
                title="Rescan Inbox"
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 text-slate-900 ${activeLoading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close modal"
              className="p-2 rounded-xl bg-white hover:bg-rose-100 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar bg-slate-100/60">
          {activeLoading ? (
            <div className="space-y-4 py-2">
              {/* Dedicated Center Loading View */}
              <div className="py-6 text-center space-y-3 bg-white border-2 border-slate-900 rounded-xl p-6 shadow-[3px_3px_0px_#0f172a]">
                <ChronoLoader size="xl" className="text-slate-900 mx-auto" />
                <h4 className="text-base font-black text-slate-900 tracking-tight">
                  Scanning your inbox...
                </h4>
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
                  AI is extracting actionable tasks, estimating durations, and classifying cognitive load.
                </p>
              </div>

              {/* Neo-brutalist pulsing skeleton cards */}
              <div className="space-y-3">
                {[1, 2, 3].map((skeletonId) => (
                  <div
                    key={skeletonId}
                    className="p-4 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] animate-pulse space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-20 bg-slate-200 border border-slate-400 rounded-full" />
                      <div className="h-5 w-16 bg-slate-200 border border-slate-400 rounded-full" />
                      <div className="h-4 w-28 bg-slate-200 rounded ml-auto" />
                    </div>
                    <div className="h-4 w-3/4 bg-slate-300 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-5/6 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3 bg-rose-50 border-2 border-slate-900 rounded-xl p-6 shadow-[3px_3px_0px_#0f172a]">
              <div className="w-10 h-10 rounded-xl bg-rose-300 border-2 border-slate-900 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#0f172a]">
                <AlertTriangle className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
              </div>
              <h4 className="text-sm font-black text-slate-900">Could not sync with Gmail</h4>
              <p className="text-xs font-bold text-slate-700 max-w-sm mx-auto">{error}</p>
              {onRescan && (
                <button
                  type="button"
                  onClick={onRescan}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] font-black text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Try Again</span>
                </button>
              )}
            </div>
          ) : localEmails.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-white border-2 border-slate-900 rounded-xl p-6 shadow-[3px_3px_0px_#0f172a]">
              <div className="w-10 h-10 rounded-xl bg-slate-200 border-2 border-slate-900 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#0f172a]">
                <Mail className="w-5 h-5 text-slate-700" strokeWidth={2.5} />
              </div>
              <h4 className="text-sm font-black text-slate-900">No unread emails found</h4>
              <p className="text-xs font-bold text-slate-600">Your Gmail inbox has 0 pending unread messages.</p>
            </div>
          ) : (
            <>
              {/* Batch Select Controls */}
              <div className="flex items-center justify-between px-1">
                <span className="label-mono text-xs font-black text-slate-800">
                  {localEmails.filter((e) => !!e.extractedTask).length} Tasks Detected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="label-mono text-[11px] font-black text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-400 font-bold">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="label-mono text-[11px] font-black text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {localEmails.map((email, idx) => {
                const isSelected = selectedIndices.includes(idx);
                const isExpanded = expandedIndices.includes(idx);
                const task = email.extractedTask;
                if (!task) return null;

                return (
                  <div
                    key={email.id || idx}
                    className={`rounded-xl transition-all duration-150 border-2 border-slate-900 overflow-hidden ${
                      isSelected
                        ? 'bg-amber-100/90 shadow-[4px_4px_0px_#0f172a] -translate-y-0.5'
                        : 'bg-white hover:bg-slate-50 opacity-90 shadow-[2px_2px_0px_#0f172a]'
                    }`}
                  >
                    {/* Main Clickable Header Area */}
                    <div
                      onClick={() => toggleSelect(idx)}
                      className="p-4 cursor-pointer flex items-start gap-3.5"
                    >
                      {/* Selection Checkbox */}
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 border-slate-900 flex items-center justify-center transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-[1px_1px_0px_#0f172a]'
                            : 'bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>

                      {/* Task Card Summary */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <EnergyBadge energy={task.energyLevel} useLongLabel size="sm" />
                          <PriorityBadge priority={task.priority || 'Core'} size="sm" />
                          <TimeDurationBadge duration={task.estimatedTime} size="sm" />

                          <span className="label-mono text-[10px] font-bold text-slate-600 truncate max-w-[150px] sm:max-w-[200px] ml-auto">
                            From: {email.from}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug mb-1">
                          {task.taskName}
                        </h4>

                        {!isExpanded && task.description && (
                          <p className="text-xs font-bold text-slate-700 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {!isExpanded && task.reasoning && (
                          <div className="mt-2 text-[11px] font-black text-indigo-950 bg-indigo-100/80 border border-slate-900 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1.5 shadow-[1px_1px_0px_#0f172a]">
                            <Sparkles className="w-3 h-3 text-indigo-700 flex-shrink-0" strokeWidth={2.5} />
                            <span>{task.reasoning}</span>
                          </div>
                        )}
                      </div>

                      {/* Accordion Expand / Edit Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(idx, e)}
                        title={isExpanded ? 'Collapse card' : 'Edit task & view email snippet'}
                        className={`p-1.5 rounded-lg border-2 border-slate-900 transition-all cursor-pointer flex-shrink-0 ${
                          isExpanded
                            ? 'bg-slate-900 text-white shadow-none'
                            : 'bg-white hover:bg-slate-100 text-slate-900 shadow-[1px_1px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" strokeWidth={2.5} />
                            <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Expandable Content Area (Email Context + Inline Edit Form) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="border-t-2 border-slate-900 bg-white/90 p-4 sm:p-5 space-y-4"
                        >
                          {/* 1. Email Snippet Context Box */}
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-900" strokeWidth={2.5} />
                              <span>Original Email Context</span>
                            </div>
                            <div className="bg-slate-100 border-l-4 border-slate-900 p-2.5 rounded-r-xl text-xs text-slate-700 italic shadow-[inset_1px_1px_0px_rgba(0,0,0,0.06)]">
                              <div className="font-black text-[11px] text-slate-900 not-italic mb-1">
                                Subject: <span className="font-semibold">{email.subject || '(No Subject)'}</span>
                              </div>
                              <p className="line-clamp-3 leading-relaxed">
                                "{email.snippet || 'No email snippet preview available.'}"
                              </p>
                            </div>
                          </div>

                          {/* 2. Inline Edit Form */}
                          <div className="space-y-3.5">
                            {/* Task Title Input */}
                            <div>
                              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                                Correct Task Title
                              </label>
                              <input
                                type="text"
                                value={task.taskName}
                                onChange={(e) =>
                                  handleUpdateTask(idx, { taskName: e.target.value })
                                }
                                placeholder="Enter action-oriented task title..."
                                className="bg-white border-2 border-slate-900 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 w-full shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>

                            {/* Description Input */}
                            <div>
                              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                                Task Notes / Description
                              </label>
                              <input
                                type="text"
                                value={task.description || ''}
                                onChange={(e) =>
                                  handleUpdateTask(idx, { description: e.target.value })
                                }
                                placeholder="Add any details, links or instructions..."
                                className="bg-white border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 w-full shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>

                            {/* Property Selectors: Priority, Energy & Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {/* Priority Pill Selector */}
                              <div>
                                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">
                                  Priority Level
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(['Critical', 'Core', 'Can Wait'] as PriorityLevel[]).map((pri) => (
                                    <button
                                      key={pri}
                                      type="button"
                                      onClick={() => handleUpdateTask(idx, { priority: pri })}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                                        (task.priority || 'Core') === pri
                                          ? pri === 'Critical'
                                            ? 'bg-rose-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                            : pri === 'Core'
                                            ? 'bg-amber-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                            : 'bg-slate-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                          : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_#0f172a]'
                                      }`}
                                    >
                                      {pri === 'Critical' ? (
                                        <Flame className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      ) : pri === 'Core' ? (
                                        <Zap className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      ) : (
                                        <Clock className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      )}
                                      <span>{pri}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Energy Level Pill Selector */}
                              <div>
                                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">
                                  Energy Level
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {(['High', 'Medium', 'Low'] as EnergyLevel[]).map((eng) => (
                                    <button
                                      key={eng}
                                      type="button"
                                      onClick={() => handleUpdateTask(idx, { energyLevel: eng })}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border-2 border-slate-900 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                                        task.energyLevel === eng
                                          ? eng === 'High'
                                            ? 'bg-emerald-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                            : eng === 'Medium'
                                            ? 'bg-purple-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                            : 'bg-sky-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                          : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_#0f172a]'
                                      }`}
                                    >
                                      {eng === 'High' ? (
                                        <Zap className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      ) : eng === 'Medium' ? (
                                        <Activity className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      ) : (
                                        <Leaf className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" strokeWidth={2.5} />
                                      )}
                                      <span>{eng}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Estimated Duration Presets & Input */}
                            <div>
                              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">
                                Estimated Duration
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {COMMON_DURATIONS.map((dur) => (
                                  <button
                                    key={dur}
                                    type="button"
                                    onClick={() => handleUpdateTask(idx, { estimatedTime: dur })}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black border-2 border-slate-900 transition-all cursor-pointer ${
                                      task.estimatedTime === dur
                                        ? 'bg-amber-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                        : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_#0f172a]'
                                    }`}
                                  >
                                    {dur}
                                  </button>
                                ))}
                                <div className="flex items-center gap-1 ml-1">
                                  <span className="text-[11px] font-bold text-slate-600">Custom:</span>
                                  <input
                                    type="text"
                                    value={task.estimatedTime}
                                    onChange={(e) =>
                                      handleUpdateTask(idx, { estimatedTime: e.target.value })
                                    }
                                    className="w-16 bg-white border-2 border-slate-900 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 shadow-[inset_1px_1px_0px_rgba(0,0,0,0.1)] focus:outline-none"
                                    placeholder="e.g. 35m"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t-[3px] border-slate-900 bg-white">
          <span className="label-mono text-xs font-black text-slate-900">
            {selectedIndices.length} of {localEmails.filter((e) => !!e.extractedTask).length} task{selectedIndices.length === 1 ? '' : 's'} selected
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-800 hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedIndices.length === 0 || activeLoading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-amber-300 hover:bg-amber-400 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[1px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Add {selectedIndices.length} to Today's List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


