import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Task } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  task: Task | null;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  task,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 bg-white/10 backdrop-blur-2xl border-none shadow-none space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">Delete Task?</h3>
            <p className="text-xs text-[#0f172a]/60">This action will remove the task permanently.</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/20">
          <p className="text-xs font-bold text-[#0f172a] line-clamp-2">"{task.title}"</p>
          {task.description && (
            <p className="text-[11px] text-[#0f172a]/60 mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#0f172a]/50 hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
