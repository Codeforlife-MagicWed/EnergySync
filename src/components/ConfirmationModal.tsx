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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl p-6 sm:p-7 bg-white border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4 text-left">
        <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-200 border-2 border-slate-900 text-rose-900 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#0f172a]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Delete Task?</h3>
            <p className="text-xs font-semibold text-slate-500">This action will remove the task permanently.</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100 border-2 border-slate-900">
          <p className="text-xs font-black text-slate-900 line-clamp-2">"{task.title}"</p>
          {task.description && (
            <p className="text-[11px] font-medium text-slate-600 mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};
