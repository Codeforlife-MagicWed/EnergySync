import { Task, RescueDraft, UserCapacitySettings } from './types';
import { isTaskInBucket } from './utils/dateUtils';

/**
 * STEP A: Non-Linear Biometric Capacity Curve
 * Converts Vitality (1-100%) to focus minutes with a depreciation curve:
 * - High Vitality (70-100%): 100% allowance for Deep Work/High-Energy tasks
 * - Medium Vitality (40-69%): 60% allowance for High-Energy tasks
 * - Low Vitality (0-39%): 20-30% allowance for High-Energy tasks (protects burnout)
 */
export function calculateBiometricCapacity(
  vitalityScore: number,
  baseDailyCapacityMinutes = 480
): {
  safeTotalCapacityMinutes: number;
  highEnergyAllowanceMinutes: number;
  highEnergyRatio: number;
} {
  const clampedVitality = Math.max(1, Math.min(100, vitalityScore));
  const baseScale = clampedVitality / 100;
  const safeTotalCapacityMinutes = Math.round(baseDailyCapacityMinutes * baseScale);

  let highEnergyRatio = 1.0;
  if (clampedVitality >= 70) {
    // 70-100%: 100% allowance for Deep Work / High-Energy
    highEnergyRatio = 1.0;
  } else if (clampedVitality >= 40) {
    // 40-69%: 60% allowance for High-Energy tasks
    highEnergyRatio = 0.6;
  } else {
    // 0-39%: 25% allowance for High-Energy tasks to prevent cognitive exhaustion
    highEnergyRatio = 0.25;
  }

  const highEnergyAllowanceMinutes = Math.round(safeTotalCapacityMinutes * highEnergyRatio);

  return {
    safeTotalCapacityMinutes,
    highEnergyAllowanceMinutes,
    highEnergyRatio,
  };
}

/**
 * Helper to get sanitized task duration with fallback rule:
 * If any task has estimatedMinutes === 0, null, or undefined, artificially assign 30 mins.
 */
export function getSanitizedTaskMinutes(task: Task): number {
  if (
    typeof task.estimatedMinutes !== 'number' ||
    isNaN(task.estimatedMinutes) ||
    task.estimatedMinutes <= 0
  ) {
    return 30;
  }
  return task.estimatedMinutes;
}

/**
 * STEP B: Global Load Assessment & Fallback
 * Calculates totalCognitiveLoad by summing estimatedMinutes of ALL incomplete tasks for "Today",
 * ignoring categories, with mandatory 30m fallback.
 */
export function calculateGlobalCognitiveLoad(tasks: Task[]): {
  totalCognitiveLoad: number;
  highEnergyLoad: number;
  mediumEnergyLoad: number;
  lowEnergyLoad: number;
  incompleteTodayTasks: Task[];
} {
  const incompleteTodayTasks = tasks.filter(
    (t) => isTaskInBucket(t, 'today') && t.status !== 'completed'
  );

  let totalCognitiveLoad = 0;
  let highEnergyLoad = 0;
  let mediumEnergyLoad = 0;
  let lowEnergyLoad = 0;

  for (const task of incompleteTodayTasks) {
    const mins = getSanitizedTaskMinutes(task);
    totalCognitiveLoad += mins;

    if (task.energyLevel === 'High') {
      highEnergyLoad += mins;
    } else if (task.energyLevel === 'Medium') {
      mediumEnergyLoad += mins;
    } else {
      lowEnergyLoad += mins;
    }
  }

  return {
    totalCognitiveLoad,
    highEnergyLoad,
    mediumEnergyLoad,
    lowEnergyLoad,
    incompleteTodayTasks,
  };
}

/**
 * STEP C: Bi-Directional Triage Matrix (The Sorting & Draft Generation Logic)
 * Context-aware sorting algorithm to generate a RescueDraft without auto-executing.
 *
 * Rules:
 * - Fixed-time events (isFixedTime: true) are always protected in Today.
 * - If Vitality is LOW (<40%): Prioritize deferring High-energy tasks to tomorrow/next week to prevent cognitive exhaustion.
 * - If Vitality is HIGH (>=70%): Prioritize deferring Low-energy / admin / Can Wait tasks to tomorrow to ruthlessly protect schedule for Deep Work.
 * - If Vitality is MEDIUM (40-69%): Balance by deferring 'Can Wait' tasks first, followed by excessive High-energy tasks exceeding the 60% allowance.
 * - Predictive Horizon Balancing: If Tomorrow is already overloaded (exceeds standard daily capacity), excess tasks are pushed to `toNextWeek`.
 */
export function generateRescueDraft(
  allTasks: Task[],
  vitalityScore: number,
  capacitySettings: UserCapacitySettings = { dailyCapacityMinutes: 480, workdayEndHour: 18 }
): RescueDraft {
  const { safeTotalCapacityMinutes, highEnergyAllowanceMinutes } = calculateBiometricCapacity(
    vitalityScore,
    capacitySettings.dailyCapacityMinutes
  );

  const { totalCognitiveLoad, highEnergyLoad, incompleteTodayTasks } =
    calculateGlobalCognitiveLoad(allTasks);

  // Incomplete tasks already planned for Tomorrow
  const existingTomorrowLoad = allTasks
    .filter((t) => isTaskInBucket(t, 'tomorrow') && t.status !== 'completed')
    .reduce((sum, t) => sum + getSanitizedTaskMinutes(t), 0);

  const tomorrowCapacity = capacitySettings.dailyCapacityMinutes;
  let simulatedTomorrowLoad = existingTomorrowLoad;

  const totalOverload = Math.max(0, totalCognitiveLoad - safeTotalCapacityMinutes);
  const highEnergyOverload = Math.max(0, highEnergyLoad - highEnergyAllowanceMinutes);

  const isLowVitality = vitalityScore < 40;
  const isHighVitality = vitalityScore >= 70;

  // Separate non-deferrable fixed-time tasks from triage candidates
  const fixedTasks: Task[] = [];
  const triageCandidates: Task[] = [];

  for (const task of incompleteTodayTasks) {
    if (task.isFixedTime) {
      fixedTasks.push(task);
    } else {
      triageCandidates.push(task);
    }
  }

  // Bi-directional sorting function
  const sortedCandidates = [...triageCandidates].sort((a, b) => {
    // 1. Priority scoring: 'Can Wait' (1) should defer before 'Core' (2), before 'Critical' (3)
    const priorityWeight = (p?: string) => (p === 'Can Wait' ? 1 : p === 'Core' ? 2 : 3);
    const pA = priorityWeight(a.priority);
    const pB = priorityWeight(b.priority);

    if (isLowVitality) {
      // LOW VITALITY: Defer High-Energy exhaustion risks first!
      const energyWeight = (e: string) => (e === 'High' ? 1 : e === 'Medium' ? 2 : 3);
      const eDiff = energyWeight(a.energyLevel) - energyWeight(b.energyLevel);
      if (eDiff !== 0) return eDiff;
      return pA - pB;
    } else if (isHighVitality) {
      // HIGH VITALITY: Ruthlessly clear Low-Energy / admin fluff to protect Deep Work!
      const energyWeight = (e: string) => (e === 'Low' ? 1 : e === 'Medium' ? 2 : 3);
      const eDiff = energyWeight(a.energyLevel) - energyWeight(b.energyLevel);
      if (eDiff !== 0) return eDiff;
      return pA - pB;
    } else {
      // MEDIUM VITALITY: Standard triage - Can Wait first, then High energy overload
      if (pA !== pB) return pA - pB;
      const energyWeight = (e: string) => (e === 'High' ? 1 : e === 'Low' ? 2 : 3);
      return energyWeight(a.energyLevel) - energyWeight(b.energyLevel);
    }
  });

  const toTomorrow: Task[] = [];
  const toNextWeek: Task[] = [];

  let accumulatedDeferredMinutes = 0;
  let remainingHighEnergyLoad = highEnergyLoad;
  const targetDeferralMinutes = Math.max(totalOverload, highEnergyOverload);

  for (const candidate of sortedCandidates) {
    const mins = getSanitizedTaskMinutes(candidate);
    const isNeededForTotalOverload = accumulatedDeferredMinutes < targetDeferralMinutes;
    const isNeededForDeepWorkProtection =
      isHighVitality && candidate.energyLevel === 'Low' && candidate.priority === 'Can Wait';
    const isNeededForBurnoutProtection =
      isLowVitality && candidate.energyLevel === 'High' && remainingHighEnergyLoad > highEnergyAllowanceMinutes;

    if (isNeededForTotalOverload || isNeededForDeepWorkProtection || isNeededForBurnoutProtection) {
      accumulatedDeferredMinutes += mins;
      if (candidate.energyLevel === 'High') {
        remainingHighEnergyLoad -= mins;
      }

      // Check predictive capacity of Tomorrow vs Next Week
      if (simulatedTomorrowLoad + mins <= tomorrowCapacity * 1.15) {
        toTomorrow.push(candidate);
        simulatedTomorrowLoad += mins;
      } else {
        toNextWeek.push(candidate);
      }
    }
  }

  // If overloaded but nothing was selected (e.g. slight deficit), defer at least the most deferrable candidate
  if (totalOverload > 0 && toTomorrow.length === 0 && toNextWeek.length === 0 && sortedCandidates.length > 0) {
    const first = sortedCandidates[0];
    toTomorrow.push(first);
  }

  let reasoning = '';
  if (isLowVitality) {
    reasoning = `Vitality is low (${vitalityScore}%). We've protected your single cognitive battery by prioritizing high-energy deferrals.`;
  } else if (isHighVitality) {
    reasoning = `Vitality is high (${vitalityScore}%). We've cleared low-energy administrative tasks so you can focus on Deep Work.`;
  } else {
    reasoning = `Vitality is moderate (${vitalityScore}%). Balanced deferrals applied to match your safe ${safeTotalCapacityMinutes}m daily capacity.`;
  }

  return {
    toTomorrow,
    toNextWeek,
    totalCognitiveLoad,
    safeCapacityMinutes: safeTotalCapacityMinutes,
    highEnergyAllowanceMinutes,
    overloadMinutes: totalOverload,
    reasoning,
  };
}
