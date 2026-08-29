export type EnergyLevel = 'High' | 'Medium' | 'Low';
export type PriorityLevel = 'Critical' | 'Core' | 'Can Wait';
export type TaskStatus = 'pending' | 'completed';
export type TaskBucket = 'all' | 'today' | 'tomorrow' | 'next_week' | 'next_month' | 'completed';
export type TaskSource = 'manual' | 'gmail_scan' | 'ai_generated' | 'ai_command';

export interface Task {
  id: string;
  title: string;
  description?: string;
  energyLevel: EnergyLevel;
  priority: PriorityLevel; // Critical (🔥 Urgent/Blocker), Core (Standard execution), Can Wait (Deferrable/Later)
  estimatedTime: string; // e.g. "15m", "30m", "45m", "1h"
  estimatedMinutes: number; // e.g. 15, 30, 45, 60
  dueDate?: string; // YYYY-MM-DD (Strict single source of truth for date horizons)
  isFixedTime?: boolean; // Rigid fixed schedule event (bypasses energy slider filtering)
  startTime?: string; // e.g. "14:00"
  endTime?: string; // e.g. "15:30"
  isRecurring?: boolean; // Weekly recurring fixed task
  recurringDays?: string[]; // e.g. ['Mon', 'Wed', 'Fri']
  recurringGroupId?: string; // Identifier connecting all cloned tasks in a recurring series
  status: TaskStatus;
  bucket: TaskBucket;
  source: TaskSource;
  sourceEmailId?: string;
  sourceEmailSubject?: string;
  sourceEmailSender?: string;
  createdAt: string;
  updatedAt: string;
  syncedToSheets?: boolean;
  sheetRowIndex?: number | null;
}

export type EnergyFilterMode = 'auto' | 'all' | 'high' | 'medium' | 'low';
export type PriorityFilterMode = 'all' | 'Critical' | 'Core' | 'Can Wait';

export interface UserCapacitySettings {
  dailyCapacityMinutes: number; // e.g. 480 (8 hours)
  workdayEndHour: number; // 24-hr format, e.g. 18 for 6 PM
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  bodySnippet?: string;
  extractedTask?: ExtractedTaskRecommendation;
}

export interface ExtractedTaskRecommendation {
  taskName: string;
  description: string;
  estimatedTime: string;
  estimatedMinutes: number;
  energyLevel: EnergyLevel;
  priority: PriorityLevel;
  urgency: 'high' | 'medium' | 'low';
  reasoning: string;
  confidence: number;
}

export interface GoogleSheetsState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string;
  sheetName: string;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

export interface RescueDraft {
  toTomorrow: Task[];
  toNextWeek: Task[];
  totalCognitiveLoad: number;
  safeCapacityMinutes: number;
  highEnergyAllowanceMinutes: number;
  overloadMinutes: number;
  reasoning: string;
}
