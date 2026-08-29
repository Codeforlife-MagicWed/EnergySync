import React from 'react';
import { User } from 'firebase/auth';
import { Zap, ExternalLink, RefreshCw, LogOut, Table, Volume2, VolumeX, Activity, LayoutGrid, HelpCircle, BookOpen } from 'lucide-react';
import { GoogleSheetsState, EnergyLevel } from '../types';

interface HeaderProps {
  user: User | null;
  needsAuth: boolean;
  sheetsState: GoogleSheetsState;
  onLogin: () => void;
  onLogout: () => void;
  onRefreshSheets: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  energyLevel: EnergyLevel;
  energyScore: number;
  activeMainTab: 'vitality' | 'board' | 'playbook';
  onSelectMainTab: (tab: 'vitality' | 'board' | 'playbook') => void;
  pendingTasksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  sheetsState,
  onLogin,
  onLogout,
  onRefreshSheets,
  soundEnabled,
  onToggleSound,
  energyLevel,
  energyScore,
  activeMainTab,
  onSelectMainTab,
  pendingTasksCount,
}) => {
  return (
    <header className="relative z-20 w-full max-w-[90rem] mx-auto px-6 sm:px-10 pt-6 pb-4">
      {/* Top Utility & Identity Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#0f172a] pb-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-400 border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] rounded-lg transform -rotate-3 transition-transform hover:rotate-0 flex-shrink-0">
            <Zap className="w-7 h-7 text-slate-900 fill-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif italic font-extrabold tracking-tight text-[#0f172a] leading-none">
                EnergySync
              </h1>
            </div>
          </div>
        </div>

        {/* Right Section: Workspace Badges & User Status */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute audio' : 'Enable audio feedback'}
            className="perchable p-2.5 rounded-xl text-slate-900 bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] active:translate-y-[3px] active:shadow-none cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-900" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Google Sheets Sync Pill */}
          {user && (
            <div className="perchable flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-xs border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex items-center gap-1.5">
                <span className="label-mono text-[10px] text-slate-700 font-bold">Sheets:</span>
                {sheetsState.isSyncing ? (
                  <span className="flex items-center gap-1 text-amber-700 font-bold label-mono text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </span>
                ) : sheetsState.spreadsheetId ? (
                  <a
                    href={sheetsState.spreadsheetUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-black transition-colors underline-offset-2 hover:underline label-mono text-[10px]"
                    title="Open live spreadsheet in Google Sheets"
                  >
                    <span>Connected</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="label-mono text-[10px] text-slate-500 font-bold">Ready</span>
                )}
              </div>
              <button
                type="button"
                onClick={onRefreshSheets}
                disabled={sheetsState.isSyncing}
                title="Force refresh tasks from Google Sheets"
                className="ml-0.5 p-1 text-slate-700 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${sheetsState.isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Playbook Button */}
          <button
            id="playbook-header-btn"
            type="button"
            onClick={() => onSelectMainTab(activeMainTab === 'playbook' ? 'vitality' : 'playbook')}
            title="Open Cognitive Playbook Guide"
            className={`perchable px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-y-[4px] active:shadow-none ${
              activeMainTab === 'playbook'
                ? 'bg-amber-400 text-slate-900'
                : 'bg-white hover:bg-amber-100 text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-900" />
            <span className="label-mono text-[10px] tracking-wider uppercase">Playbook</span>
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full border border-slate-900"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-xs font-black text-slate-900 hidden md:inline max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out of Google"
                  className="p-1 text-slate-500 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-y-[4px] active:shadow-none flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="label-mono text-[10px] uppercase font-black">Connect Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Top-Level Tab Navigation Bar */}
      <nav className="mt-4 flex items-center justify-between">
        <div className="inline-flex p-1.5 rounded-2xl bg-white/95 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] gap-1.5">
          {/* Tab 1: Vitality Pulse (Dashboard) */}
          <button
            type="button"
            onClick={() => onSelectMainTab('vitality')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeMainTab === 'vitality'
                ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-2 border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Vitality Pulse</span>
            <span
              className={`label-mono text-[10px] font-black px-2 py-0.5 rounded-md border ${
                activeMainTab === 'vitality'
                  ? 'bg-emerald-300 text-slate-900 border-slate-900'
                  : 'bg-slate-200 text-slate-900 border-slate-400'
              }`}
            >
              {energyScore}%
            </span>
          </button>

          {/* Tab 2: Action Board */}
          <button
            type="button"
            onClick={() => onSelectMainTab('board')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeMainTab === 'board'
                ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border-2 border-transparent'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Action Board</span>
            {pendingTasksCount > 0 && (
              <span
                className={`label-mono text-[10px] font-black px-2 py-0.5 rounded-md border ${
                  activeMainTab === 'board'
                    ? 'bg-amber-300 text-slate-900 border-slate-900'
                    : 'bg-slate-200 text-slate-900 border-slate-400'
                }`}
              >
                {pendingTasksCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
};
