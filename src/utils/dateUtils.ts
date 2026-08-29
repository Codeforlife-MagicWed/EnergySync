import { Task, TaskBucket } from '../types';

/**
 * Local Date Formatter (YYYY-MM-DD)
 * Avoids UTC timezone drift issues when converting Date objects
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return getLocalDateString(new Date());
}

export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
}

export function getNextWeekDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return getLocalDateString(d);
}

/**
 * Computes calendar day difference between target date and base date (default today).
 * diff === 0 -> Today
 * diff < 0  -> Past/Overdue (rendered in Today tab)
 * diff === 1 -> Tomorrow
 * diff > 1 && diff <= 7 -> Next Week
 * diff > 7  -> Next Month
 */
export function getDaysDifference(targetDateStr: string, baseDateStr?: string): number {
  const base = baseDateStr || getTodayDateString();
  const [bYear, bMonth, bDay] = base.split('-').map(Number);
  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);

  const baseDate = new Date(bYear, bMonth - 1, bDay);
  const targetDate = new Date(tYear, tMonth - 1, tDay);

  baseDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - baseDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Derive time horizon bucket strictly from the assigned Date string (YYYY-MM-DD)
 */
export function deriveBucketFromDate(dueDateStr?: string): TaskBucket {
  if (!dueDateStr) return 'today';

  const todayStr = getTodayDateString();
  const diffDays = getDaysDifference(dueDateStr, todayStr);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return 'next_week';
  return 'next_month';
}

/**
 * Single Source of Truth for Tab/Horizon Filtering:
 * The assigned Date is the ONLY truth for which tab a task belongs to.
 * If a task has a date in the future (e.g. Aug 27), it must NEVER render in "Today".
 */
export function isTaskInBucket(task: Task, bucket: TaskBucket): boolean {
  if (bucket === 'all') {
    return true;
  }

  if (bucket === 'completed') {
    return task.status === 'completed';
  }

  const todayStr = getTodayDateString();
  const taskDate = task.dueDate || todayStr;
  const diffDays = getDaysDifference(taskDate, todayStr);

  switch (bucket) {
    case 'today':
      // Strictly today or overdue/unassigned. Future dates MUST NEVER render here.
      return diffDays <= 0 && taskDate <= todayStr;
    case 'tomorrow':
      return diffDays === 1;
    case 'next_week':
      return diffDays > 1 && diffDays <= 7;
    case 'next_month':
      return diffDays > 7;
    default:
      return false;
  }
}

/**
 * Dynamic Date Subtitle for Active Horizon Tabs
 * e.g. "MONDAY, AUG 24, 2026"
 */
export function getTabDateSubtitle(bucket: TaskBucket): string {
  const now = new Date();

  if (bucket === 'all') {
    return 'ALL SCHEDULED & ACTIVE TASKS';
  }

  if (bucket === 'today') {
    return now
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
  }

  if (bucket === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
  }

  if (bucket === 'next_week') {
    const start = new Date(now);
    start.setDate(start.getDate() + 2);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const endYear = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${endYear}`.toUpperCase();
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`.toUpperCase();
  }

  if (bucket === 'next_month') {
    const start = new Date(now);
    start.setDate(start.getDate() + 8);
    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} & BEYOND`.toUpperCase();
  }

  if (bucket === 'completed') {
    return 'ARCHIVED & COMPLETED ACTIONS';
  }

  return '';
}

/**
 * Day of week name mapping for recurring weekly tasks
 */
export const DAY_OF_WEEK_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const ORDERED_DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Generates all calendar dates (YYYY-MM-DD) from startDateStr to endDateStr (inclusive)
 * that match the selected recurring days of the week.
 */
export function generateRecurringDates(
  startDateStr: string,
  endDateStr: string,
  selectedDays: string[]
): string[] {
  if (!startDateStr || !endDateStr || !selectedDays || selectedDays.length === 0) {
    return [startDateStr || getTodayDateString()];
  }

  const selectedDayNums = new Set(selectedDays.map((d) => DAY_OF_WEEK_MAP[d]));

  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  const start = new Date(sYear, sMonth - 1, sDay);
  const end = new Date(eYear, eMonth - 1, eDay);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [startDateStr];
  }

  if (start > end) {
    if (selectedDayNums.has(start.getDay())) {
      return [startDateStr];
    }
    return [startDateStr];
  }

  const resultDates: string[] = [];
  const current = new Date(start);

  // Safety cap at 365 iterations
  let iterations = 0;
  while (current <= end && iterations < 366) {
    if (selectedDayNums.has(current.getDay())) {
      resultDates.push(getLocalDateString(current));
    }
    current.setDate(current.getDate() + 1);
    iterations++;
  }

  if (resultDates.length === 0) {
    resultDates.push(startDateStr);
  }

  return resultDates;
}

