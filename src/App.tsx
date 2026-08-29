import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  initAuth,
  googleSignIn,
  logout,
} from './services/firebaseAuth';
import {
  getOrCreateEnergySyncSheet,
  loadTasksFromSheet,
  appendTaskToSheet,
  syncAllTasksToSheet,
} from './services/googleSheets';
import { fetchRecentUnreadEmails, analyzeEmailsWithAI } from './services/gmail';
import {
  Task,
  EnergyLevel,
  PriorityLevel,
  TaskBucket,
  EnergyFilterMode,
  PriorityFilterMode,
  GoogleSheetsState,
  EmailMessage,
  ExtractedTaskRecommendation,
  UserCapacitySettings,
} from './types';
import { AuroraBackground } from './components/AuroraBackground';
import { InteractiveParticles } from './components/InteractiveParticles';
import { Header } from './components/Header';
import { CreateTaskModal, TaskCreationData } from './components/CreateTaskModal';
import { TaskList } from './components/TaskList';
import { VitalityPulseDashboard } from './components/VitalityPulseDashboard';
import { InboxScanModal } from './components/InboxScanModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RescuePreviewModal } from './components/RescuePreviewModal';
import { ClearAllModal } from './components/ClearAllModal';
import { PlaybookView } from './components/PlaybookView';
import { WingedClockPet } from './components/WingedClockPet';
import { playCompleteChime, playRescueSound } from './utils/audio';
import { generateRescueDraft } from './rescueEngine';
import { Plus } from 'lucide-react';
import {
  getTodayDateString,
  getTomorrowDateString,
  getNextWeekDateString,
  getLocalDateString,
  isTaskInBucket,
  deriveBucketFromDate,
} from './utils/dateUtils';

// Demo seed tasks (Single tasks, strictly assigned dates, no chunking)
const createInitialDemoTasks = (): Task[] => {
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const nextWeekStr = getLocalDateString(in7Days);

  return [
    {
      id: 'demo_0',
      title: 'CS 480 Distributed Systems & Scalability Lecture',
      description: 'Fixed class schedule (14:00 – 15:30) • Rigid event bypassing energy filtering',
      energyLevel: 'High',
      priority: 'Critical',
      isFixedTime: true,
      startTime: '14:00',
      endTime: '15:30',
      estimatedTime: '1h 30m',
      estimatedMinutes: 90,
      dueDate: todayStr,
      status: 'pending',
      bucket: 'today',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_english',
      title: 'EC2 English class 18:00 - 20:00',
      description: 'Rigid fixed time anchor • Solid time-block pinned to calendar timeline',
      energyLevel: 'Medium',
      priority: 'Critical',
      isFixedTime: true,
      startTime: '18:00',
      endTime: '20:00',
      estimatedTime: '2h',
      estimatedMinutes: 120,
      dueDate: todayStr,
      status: 'pending',
      bucket: 'today',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_1',
      title: 'Write technical Unet architecture specification',
      description: 'Deconstruct encoder-decoder skip connections and compute latency benchmarks.',
      energyLevel: 'High',
      priority: 'Critical',
      estimatedTime: '1h 30m',
      estimatedMinutes: 90,
      dueDate: todayStr,
      status: 'pending',
      bucket: 'today',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_2',
      title: 'Review team pull requests & leave feedback',
      description: 'Collaborative code review on frontend component refactors.',
      energyLevel: 'Medium',
      priority: 'Core',
      estimatedTime: '30m',
      estimatedMinutes: 30,
      dueDate: todayStr,
      status: 'pending',
      bucket: 'today',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_3',
      title: 'Sort inbox emails & archive notifications',
      description: 'Low-friction cleanup requiring minimal mental exertion.',
      energyLevel: 'Low',
      priority: 'Can Wait',
      estimatedTime: '15m',
      estimatedMinutes: 15,
      dueDate: todayStr,
      status: 'pending',
      bucket: 'today',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_4',
      title: 'Sprint planning & backlog grooming',
      description: 'Align task allocations for upcoming milestone releases.',
      energyLevel: 'Medium',
      priority: 'Core',
      estimatedTime: '45m',
      estimatedMinutes: 45,
      dueDate: tomorrowStr,
      status: 'pending',
      bucket: 'tomorrow',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_5',
      title: 'Model evaluation & production cluster deployment',
      description: 'Comprehensive load testing and latency monitoring.',
      energyLevel: 'High',
      priority: 'Critical',
      estimatedTime: '2h',
      estimatedMinutes: 120,
      dueDate: nextWeekStr,
      status: 'pending',
      bucket: 'next_week',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Tab Navigation: Tab 1 (Vitality Pulse Dashboard) vs Tab 2 (Action Board) vs Playbook
  const [activeMainTab, setActiveMainTab] = useState<'vitality' | 'board' | 'playbook'>('vitality');

  // Energy & Priority State
  const [energyScore, setEnergyScore] = useState<number>(75);
  const [filterMode, setFilterMode] = useState<EnergyFilterMode>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterMode>('all');
  const [activeBucket, setActiveBucket] = useState<TaskBucket>('today');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Capacity Settings State
  const [capacitySettings, setCapacitySettings] = useState<UserCapacitySettings>(() => {
    const saved = localStorage.getItem('energysync_capacity_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { dailyCapacityMinutes: 480, workdayEndHour: 18 };
      }
    }
    return { dailyCapacityMinutes: 480, workdayEndHour: 18 };
  });

  // Save capacity settings
  useEffect(() => {
    localStorage.setItem('energysync_capacity_settings', JSON.stringify(capacitySettings));
  }, [capacitySettings]);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('energysync_local_tasks_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return createInitialDemoTasks();
      }
    }
    return createInitialDemoTasks();
  });

  // Google Sheets State
  const [sheetsState, setSheetsState] = useState<GoogleSheetsState>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    spreadsheetTitle: 'EnergySync Tasks (Google Sheets)',
    sheetName: 'EnergySync Tasks',
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  // Modals
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedEmails, setScannedEmails] = useState<EmailMessage[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  const [isSmartRescueOpen, setIsSmartRescueOpen] = useState(false);
  const [isRescuing, setIsRescuing] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Compute current energy level from score
  const getEnergyLevel = (score: number): EnergyLevel => {
    if (score > 70) return 'High';
    if (score >= 30) return 'Medium';
    return 'Low';
  };

  const currentEnergyLevel = getEnergyLevel(energyScore);

  // Save tasks locally
  useEffect(() => {
    localStorage.setItem('energysync_local_tasks_v3', JSON.stringify(tasks));
  }, [tasks]);

  // Sync with Google Sheets helper
  const syncWithGoogleSheets = useCallback(
    async (token: string, currentTasks: Task[]) => {
      setSheetsState((prev) => ({ ...prev, isSyncing: true, error: null }));
      try {
        const sheetInfo = await getOrCreateEnergySyncSheet(token);
        const remoteTasks = await loadTasksFromSheet(token, sheetInfo.spreadsheetId);

        if (remoteTasks.length > 0) {
          setTasks(remoteTasks);
        } else if (currentTasks.length > 0) {
          await syncAllTasksToSheet(token, sheetInfo.spreadsheetId, currentTasks);
        }

        setSheetsState({
          spreadsheetId: sheetInfo.spreadsheetId,
          spreadsheetUrl: sheetInfo.spreadsheetUrl,
          spreadsheetTitle: 'EnergySync Tasks',
          sheetName: 'EnergySync Tasks',
          isSyncing: false,
          lastSyncedAt: new Date(),
          error: null,
        });
      } catch (err: any) {
        console.error('Google Sheets sync error:', err);
        setSheetsState((prev) => ({
          ...prev,
          isSyncing: false,
          error: err.message || 'Failed to sync with Google Sheets',
        }));
      }
    },
    []
  );

  // Init Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(!token);
        if (token) {
          syncWithGoogleSheets(token, tasks);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Manual Login Trigger
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (!res) return;
      const { user: loggedUser, accessToken: token } = res;
      setUser(loggedUser);
      setAccessToken(token);
      setNeedsAuth(false);
      await syncWithGoogleSheets(token, tasks);
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request' &&
        err?.code !== 'auth/user-cancelled'
      ) {
        console.warn('Sign-in status:', err?.message || err);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSheetsState({
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: 'EnergySync Tasks (Google Sheets)',
      sheetName: 'EnergySync Tasks',
      isSyncing: false,
      lastSyncedAt: null,
      error: null,
    });
  };

  const handleRefreshSheets = async () => {
    if (accessToken) {
      await syncWithGoogleSheets(accessToken, tasks);
    } else {
      handleLogin();
    }
  };

  // Add Single or Recurring Cloned Tasks
  const handleAddTask = async (
    payload: TaskCreationData | TaskCreationData[]
  ) => {
    const payloads = Array.isArray(payload) ? payload : [payload];
    if (payloads.length === 0) return;

    const newTasks: Task[] = payloads.map((p, idx) => {
      const assignedDueDate = p.dueDate || getTodayDateString();
      const assignedBucket = deriveBucketFromDate(assignedDueDate);
      return {
        id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        title: p.title,
        description: p.description || '',
        energyLevel: p.energyLevel,
        priority: p.priority || 'Core',
        estimatedTime: p.estimatedTime,
        estimatedMinutes: p.estimatedMinutes,
        dueDate: assignedDueDate,
        isFixedTime: p.isFixedTime,
        startTime: p.startTime,
        endTime: p.endTime,
        isRecurring: p.isRecurring,
        recurringDays: p.recurringDays,
        recurringGroupId: p.recurringGroupId,
        status: 'pending',
        bucket: assignedBucket,
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedToSheets: !!accessToken,
      };
    });

    const updatedTasks = [...newTasks, ...tasks];
    setTasks(updatedTasks);

    // Switch view to the assigned bucket of the first task
    if (newTasks.length > 0) {
      setActiveBucket(newTasks[0].bucket);
    }

    if (accessToken && sheetsState.spreadsheetId) {
      try {
        if (newTasks.length === 1) {
          await appendTaskToSheet(accessToken, sheetsState.spreadsheetId, newTasks[0]);
        } else {
          await syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
        }
      } catch (err) {
        console.warn('Failed to sync to Google Sheet:', err);
      }
    }
  };

  // Safe Clear All Tasks (Nuke Action Board & Storage)
  const handleClearAllTasks = async () => {
    setTasks([]);
    localStorage.removeItem('energysync_local_tasks_v3');
    setIsClearAllModalOpen(false);

    if (accessToken && sheetsState.spreadsheetId) {
      try {
        await syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, []);
      } catch (err) {
        console.warn('Failed to clear Google Sheet:', err);
      }
    }
  };

  // Toggle Task Status (with satisfying audio chime)
  const handleToggleStatus = async (taskId: string, coords?: { startX: number; startY: number }) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const willBeCompleted = targetTask?.status !== 'completed';

    if (willBeCompleted) {
      playCompleteChime(soundEnabled);
      // Dispatch task_completed event with energy level and physical coordinates to animate battery reward flying to pouch
      try {
        window.dispatchEvent(
          new CustomEvent('task_completed', {
            detail: {
              taskId,
              energyLevel: targetTask?.energyLevel || 'medium',
              startX: coords?.startX,
              startY: coords?.startY,
              timestamp: Date.now(),
            },
          })
        );
      } catch (e) {
        console.warn('Could not dispatch task_completed event:', e);
      }
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: (t.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed',
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    if (accessToken && sheetsState.spreadsheetId) {
      syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
    }
  };

  // Update Task (Modifies in-place: either single task or all recurring tasks in series)
  const handleUpdateTask = async (
    updatedTask: Task,
    updateScope: 'single' | 'all_recurring' = 'single'
  ) => {
    let updatedTasks: Task[];

    if (updateScope === 'all_recurring') {
      const original = tasks.find((t) => t.id === updatedTask.id);
      const targetGroupId = updatedTask.recurringGroupId || original?.recurringGroupId;
      const targetTitle = original?.title.trim().toLowerCase() || updatedTask.title.trim().toLowerCase();

      updatedTasks = tasks.map((t) => {
        const isMatch =
          t.id === updatedTask.id ||
          (targetGroupId && t.recurringGroupId === targetGroupId) ||
          (!targetGroupId && t.isRecurring && t.title.trim().toLowerCase() === targetTitle);

        if (isMatch) {
          const assignedDate = t.dueDate || getTodayDateString();
          return {
            ...t,
            title: updatedTask.title,
            description: updatedTask.description,
            energyLevel: updatedTask.energyLevel,
            priority: updatedTask.priority,
            estimatedTime: updatedTask.estimatedTime,
            estimatedMinutes: updatedTask.estimatedMinutes,
            isFixedTime: updatedTask.isFixedTime,
            startTime: updatedTask.startTime,
            endTime: updatedTask.endTime,
            isRecurring: updatedTask.isRecurring,
            recurringDays: updatedTask.recurringDays,
            recurringGroupId: targetGroupId || updatedTask.recurringGroupId,
            dueDate: t.dueDate, // preserve individual calendar occurrence date
            bucket: deriveBucketFromDate(assignedDate), // preserve respective horizon
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });
    } else {
      // Single task update only
      updatedTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    }

    setTasks(updatedTasks);

    if (accessToken && sheetsState.spreadsheetId) {
      try {
        await syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
      } catch (err) {
        console.warn('Failed to sync to Google Sheet:', err);
      }
    }
  };

  // Move Bucket (Synchronizes dueDate strictly with target horizon)
  const handleMoveBucket = async (taskId: string, bucket: TaskBucket) => {
    if (bucket === 'all') return;
    let newDueDate = getTodayDateString();
    if (bucket === 'tomorrow') {
      newDueDate = getTomorrowDateString();
    } else if (bucket === 'next_week') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      newDueDate = getLocalDateString(d);
    } else if (bucket === 'next_month') {
      const d = new Date();
      d.setDate(d.getDate() + 28);
      newDueDate = getLocalDateString(d);
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          bucket,
          dueDate: newDueDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setTasks(updatedTasks);

    if (accessToken && sheetsState.spreadsheetId) {
      syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
    }
  };

  // Delete Task
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const updatedTasks = tasks.filter((t) => t.id !== taskToDelete.id);
    setTasks(updatedTasks);
    setTaskToDelete(null);

    if (accessToken && sheetsState.spreadsheetId) {
      syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
    }
  };

  // AI "Scan Inbox"
  const handleScanInbox = async () => {
    if (!accessToken) {
      try {
        const res = await googleSignIn();
        if (!res) return;
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        performInboxScan(res.accessToken);
      } catch (err: any) {
        if (
          err?.code !== 'auth/popup-closed-by-user' &&
          err?.code !== 'auth/cancelled-popup-request' &&
          err?.code !== 'auth/user-cancelled'
        ) {
          console.warn('Gmail scan sign-in status:', err?.message || err);
        }
      }
      return;
    }

    performInboxScan(accessToken);
  };

  const performInboxScan = async (token: string) => {
    setIsScanning(true);
    setIsScanModalOpen(true);
    setScanError(null);
    setScannedEmails([]);

    try {
      const emails = await fetchRecentUnreadEmails(token);
      const analyzed = await analyzeEmailsWithAI(emails);
      setScannedEmails(analyzed);
    } catch (err: any) {
      console.error('Error in inbox scan:', err);
      setScanError(err.message || 'Failed to read messages from Gmail.');
    } finally {
      setIsScanning(false);
    }
  };

  // Import extracted tasks from Gmail scan
  const handleImportExtractedTasks = async (
    extractedList: ExtractedTaskRecommendation[],
    sourceEmails: EmailMessage[]
  ) => {
    const todayStr = getTodayDateString();
    const newTasks: Task[] = extractedList.map((rec, idx) => {
      const email = sourceEmails[idx];
      return {
        id: `gmail_${email?.id || Date.now()}_${idx}`,
        title: rec.taskName,
        description: rec.description || '',
        energyLevel: rec.energyLevel,
        priority: rec.priority || 'Core',
        estimatedTime: rec.estimatedTime,
        estimatedMinutes: rec.estimatedMinutes,
        dueDate: todayStr,
        status: 'pending',
        bucket: 'today',
        source: 'gmail_scan',
        sourceEmailId: email?.id,
        sourceEmailSubject: email?.subject,
        sourceEmailSender: email?.from,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedToSheets: !!accessToken,
      };
    });

    const updated = [...newTasks, ...tasks];
    setTasks(updated);
    setActiveBucket('today');
    setActiveMainTab('board');

    if (accessToken && sheetsState.spreadsheetId) {
      syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updated);
    }
  };

  // Compute Dynamic Smart Rescue Draft
  const rescueDraft = useMemo(() => {
    return generateRescueDraft(tasks, energyScore, capacitySettings);
  }, [tasks, energyScore, capacitySettings]);

  // Trigger Smart Rescue Modal
  const handleOpenSmartRescue = () => {
    setIsSmartRescueOpen(true);
  };

  // Confirm Smart Rescue Deferral
  const handleConfirmRescueDeferral = async (
    approvedTomorrowIds: string[],
    approvedNextWeekIds: string[]
  ) => {
    if (approvedTomorrowIds.length === 0 && approvedNextWeekIds.length === 0) return;

    setIsRescuing(true);
    playRescueSound(soundEnabled);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981'],
    });

    const tomorrowStr = getTomorrowDateString();
    const nextWeekStr = getNextWeekDateString();

    const updatedTasks = tasks.map((t) => {
      if (approvedTomorrowIds.includes(t.id)) {
        return {
          ...t,
          bucket: 'tomorrow' as TaskBucket,
          dueDate: tomorrowStr,
          updatedAt: new Date().toISOString(),
        };
      }
      if (approvedNextWeekIds.includes(t.id)) {
        return {
          ...t,
          bucket: 'next_week' as TaskBucket,
          dueDate: nextWeekStr,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    if (accessToken && sheetsState.spreadsheetId) {
      try {
        await syncAllTasksToSheet(accessToken, sheetsState.spreadsheetId, updatedTasks);
      } catch (err) {
        console.warn('Rescue sync to Sheets warning:', err);
      }
    }

    setIsRescuing(false);
    setActiveBucket(approvedTomorrowIds.length > 0 ? 'tomorrow' : 'next_week');
    setActiveMainTab('board');
  };

  const todayTasks = tasks.filter((t) => isTaskInBucket(t, 'today'));
  const pendingTodayCount = tasks.filter(
    (t) => isTaskInBucket(t, 'today') && t.status !== 'completed'
  ).length;

  return (
    <div className="relative min-h-screen flex flex-col font-sans text-[#0f172a]">
      {/* Soothing Dynamic Aurora Mesh Gradient Background */}
      <AuroraBackground energyLevel={currentEnergyLevel} energyScore={energyScore} />

      {/* Interactive Mouse Particle Background (Google Antigravity Style) */}
      <InteractiveParticles />

      {/* Top Header Bar with Tab Navigation */}
      <Header
        user={user}
        needsAuth={needsAuth}
        sheetsState={sheetsState}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRefreshSheets={handleRefreshSheets}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        energyLevel={currentEnergyLevel}
        energyScore={energyScore}
        activeMainTab={activeMainTab}
        onSelectMainTab={setActiveMainTab}
        pendingTasksCount={pendingTodayCount}
      />

      {/* Main Content Area based on Selected Tab */}
      <main className="flex-1 flex flex-col items-center w-full">
        {activeMainTab === 'playbook' ? (
          /* Tab 3: Playbook Onboarding Guide */
          <PlaybookView onStartSyncing={() => setActiveMainTab('vitality')} />
        ) : activeMainTab === 'vitality' ? (
          /* Tab 1: Vitality Pulse Dashboard (Slider, Inbox Scan, Smart Rescue, Insights) */
          <VitalityPulseDashboard
            energyScore={energyScore}
            onEnergyScoreChange={setEnergyScore}
            energyLevel={currentEnergyLevel}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            onScanInbox={handleScanInbox}
            isScanning={isScanning}
            onRescueMe={handleOpenSmartRescue}
            isRescuing={isRescuing}
            pendingTodayCount={pendingTodayCount}
            tasks={tasks}
            onNavigateToActionBoard={() => setActiveMainTab('board')}
            onOpenCreateModal={() => setIsCreateTaskModalOpen(true)}
          />
        ) : (
          /* Tab 2: Action Board (Clean Multi-View Action Board) */
          <div className="w-full flex flex-col items-center">
            {/* 5-Horizon Chronologically Grouped Task List */}
            <TaskList
              tasks={tasks}
              activeBucket={activeBucket}
              onActiveBucketChange={setActiveBucket}
              filterMode={filterMode}
              onFilterModeChange={setFilterMode}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              currentEnergyLevel={currentEnergyLevel}
              onToggleStatus={handleToggleStatus}
              onDeleteRequest={(task) => setTaskToDelete(task)}
              onUpdateTask={handleUpdateTask}
              onMoveBucket={handleMoveBucket}
              onOpenCreateModal={() => setIsCreateTaskModalOpen(true)}
              onOpenClearAllModal={() => setIsClearAllModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Glassmorphism Task Creation Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onAddTask={handleAddTask}
        suggestedEnergy={currentEnergyLevel}
      />

      {/* Modals & Dialogs */}
      <InboxScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        emails={scannedEmails}
        isLoading={isScanning}
        error={scanError}
        onImportTasks={handleImportExtractedTasks}
      />

      {/* Single Cognitive Battery Smart Rescue Preview Modal */}
      <RescuePreviewModal
        isOpen={isSmartRescueOpen}
        onClose={() => setIsSmartRescueOpen(false)}
        draft={rescueDraft}
        vitalityScore={energyScore}
        onConfirmRescue={handleConfirmRescueDeferral}
      />

      {/* Safe Clear All (Nuke Data) Confirmation Modal */}
      <ClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirmClearAll={handleClearAllTasks}
        taskCount={tasks.length}
      />

      {/* Single Task Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        task={taskToDelete}
      />

      {/* Interactive Vector Winged-Clock Pet with DOM Perching Physics */}
      <WingedClockPet />
    </div>
  );
}
