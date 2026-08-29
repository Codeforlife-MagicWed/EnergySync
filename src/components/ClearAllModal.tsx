import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearAll: () => void;
  taskCount: number;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  onConfirmClearAll,
  taskCount,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = countdown > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frameless Backdrop with Smooth Fade Blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/20 z-10 animate-in zoom-in-95 duration-200 border border-white/40 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-[#0f172a] dark:text-white">
                Clear All Tasks?
              </h3>
              <p className="text-xs font-semibold text-[#0f172a]/60 dark:text-slate-400">
                Action Board Nuke & Reset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#0f172a]/40 hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
          <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
            Are you sure you want to delete all tasks? This cannot be undone.
          </p>
          <p className="text-[11px] font-medium text-rose-800/80 dark:text-rose-300/80">
            This will permanently remove all {taskCount} task{taskCount !== 1 ? 's' : ''} from your
            local storage and Action Board.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#0f172a]/60 dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) {
                onConfirmClearAll();
                onClose();
              }
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border-none ${
              isLocked
                ? 'bg-black/10 dark:bg-white/10 text-[#0f172a]/40 dark:text-slate-500 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isLocked ? `Wait ${countdown}s...` : 'Yes, Delete All'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
