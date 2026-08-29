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
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-[6px_6px_0px_#0f172a] z-10 animate-in zoom-in-95 duration-200 border-[3px] border-slate-900 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-200 border-2 border-slate-900 text-rose-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#0f172a]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Clear All Tasks?
              </h3>
              <p className="text-xs font-bold text-slate-500">
                Action Board Nuke & Reset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border-2 border-slate-900 space-y-1.5 text-left">
          <p className="text-xs font-black text-rose-900">
            Are you sure you want to delete all tasks? This cannot be undone.
          </p>
          <p className="text-[11px] font-semibold text-rose-800">
            This will permanently remove all {taskCount} task{taskCount !== 1 ? 's' : ''} from your
            local storage and Action Board.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${
              isLocked
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-rose-500 hover:bg-rose-400 text-white cursor-pointer'
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
