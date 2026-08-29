import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, ArrowRight, X, AlertTriangle, ShieldCheck, Zap, BatteryCharging, CheckCircle2 } from 'lucide-react';
import { Task, RescueDraft } from '../types';
import { EnergyBadge, PriorityBadge } from './Badges';
import { getSanitizedTaskMinutes } from '../rescueEngine';

interface RescuePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: RescueDraft;
  vitalityScore: number;
  onConfirmRescue: (approvedTomorrowIds: string[], approvedNextWeekIds: string[]) => void;
}

export const RescuePreviewModal: React.FC<RescuePreviewModalProps> = ({
  isOpen,
  onClose,
  draft,
  vitalityScore,
  onConfirmRescue,
}) => {
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [nextWeekTasks, setNextWeekTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTomorrowTasks(draft.toTomorrow);
      setNextWeekTasks(draft.toNextWeek);
    }
  }, [isOpen, draft]);

  if (!isOpen) return null;

  const handleRemoveFromTomorrow = (taskId: string) => {
    setTomorrowTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleRemoveFromNextWeek = (taskId: string) => {
    setNextWeekTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const totalFreedMinutes = [...tomorrowTasks, ...nextWeekTasks].reduce(
    (sum, t) => sum + getSanitizedTaskMinutes(t),
    0
  );

  const totalProposedCount = tomorrowTasks.length + nextWeekTasks.length;
  const initialProposedCount = draft.toTomorrow.length + draft.toNextWeek.length;
  const overriddenCount = Math.max(0, initialProposedCount - totalProposedCount);

  const handleConfirm = () => {
    const tomorrowIds = tomorrowTasks.map((t) => t.id);
    const nextWeekIds = nextWeekTasks.map((t) => t.id);
    onConfirmRescue(tomorrowIds, nextWeekIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#fffefc] dark:bg-[#1e293b] rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 sm:p-8 space-y-6 text-left max-h-[90vh] flex flex-col justify-between">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-300 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-slate-900 fill-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="label-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-900 text-white rounded">
                  Cognitive Battery Triage
                </span>
                <span className="label-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                  Vitality: {vitalityScore}%
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Rescue Plan Proposed
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Diagnostic Status Box */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-slate-800/80 border-2 border-slate-900 text-xs text-slate-800 dark:text-slate-200 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Safe Daily Focus: <strong>{draft.safeCapacityMinutes}m</strong></span>
            </span>
            <span className="font-mono text-[11px] bg-slate-900 text-white px-2 py-0.5 rounded">
              Current Load: {draft.totalCognitiveLoad}m
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[12px] leading-relaxed">
            {draft.reasoning}
          </p>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            💡 Review the proposed horizon transfers below. Click <strong>[ ✕ ]</strong> on any task to override and keep it in Today.
          </div>
        </div>

        {/* Scrollable Lists Area */}
        <div className="space-y-5 overflow-y-auto flex-1 pr-1.5 py-1">
          {/* Section 1: Proposed to Tomorrow */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-900 dark:text-white" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Defer to Tomorrow ({tomorrowTasks.length})
                </h4>
              </div>
              <span className="label-mono text-[11px] text-slate-500 font-bold">
                {tomorrowTasks.reduce((sum, t) => sum + getSanitizedTaskMinutes(t), 0)} mins
              </span>
            </div>

            {tomorrowTasks.length === 0 ? (
              <div className="p-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 font-medium">
                No tasks queued for Tomorrow.
              </div>
            ) : (
              <div className="space-y-2">
                {tomorrowTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 border border-slate-900 flex items-center justify-center flex-shrink-0 font-mono font-bold text-[10px]">
                        →
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {t.title}
                        </span>
                        <span className="label-mono text-[10px] text-slate-500">
                          {getSanitizedTaskMinutes(t)} mins
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={t.priority} size="sm" />
                      <EnergyBadge energy={t.energyLevel} size="sm" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFromTomorrow(t.id)}
                        title="Override: Keep this task in Today"
                        className="p-1.5 rounded-lg border-2 border-slate-900 bg-rose-100 hover:bg-rose-200 text-rose-800 transition-transform active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Proposed to Next Week (Overload Spillover) */}
          {nextWeekTasks.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Spillover to Next Week ({nextWeekTasks.length})
                  </h4>
                </div>
                <span className="label-mono text-[11px] text-slate-500 font-bold">
                  {nextWeekTasks.reduce((sum, t) => sum + getSanitizedTaskMinutes(t), 0)} mins
                </span>
              </div>

              <div className="space-y-2">
                {nextWeekTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-purple-50 dark:bg-slate-800/90 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-purple-200 border border-slate-900 flex items-center justify-center flex-shrink-0 font-mono font-bold text-[10px]">
                        📅
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {t.title}
                        </span>
                        <span className="label-mono text-[10px] text-slate-500">
                          {getSanitizedTaskMinutes(t)} mins (Tomorrow full)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={t.priority} size="sm" />
                      <EnergyBadge energy={t.energyLevel} size="sm" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFromNextWeek(t.id)}
                        title="Override: Keep this task in Today"
                        className="p-1.5 rounded-lg border-2 border-slate-900 bg-rose-100 hover:bg-rose-200 text-rose-800 transition-transform active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalProposedCount === 0 && (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-slate-800 border-2 border-slate-900 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h5 className="font-black text-slate-900 dark:text-white text-base">
                All proposed tasks kept in Today!
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You have overridden all deferrals. Your today schedule will remain unchanged.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t-2 border-slate-900 flex-shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span>Approved deferrals: </span>
            <strong className="text-slate-900 dark:text-white font-bold">
              {totalProposedCount} tasks
            </strong>{' '}
            (<span className="font-mono font-bold text-emerald-600">{totalFreedMinutes}m</span> freed)
            {overriddenCount > 0 && (
              <span className="text-rose-600 font-semibold ml-1.5">
                • {overriddenCount} overridden
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={totalProposedCount === 0}
              className="px-6 py-2.5 rounded-xl border-2 border-slate-900 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-black text-xs shadow-[3px_3px_0px_#0f172a] transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>Confirm & Rescue ({totalProposedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
