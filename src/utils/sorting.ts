import { Task, EnergyLevel, PriorityLevel } from '../types';
import { normalizeEnergy, normalizePriority } from '../components/Badges';

/**
 * Strict Multi-Tier Sorting Logic
 * Tier 1 (Anchors): Fixed-time tasks lock to their designated time.
 * Tier 2 (Priority Rank): Float "Critical 🔥" urgent tasks to the top of the flexible list.
 * Tier 3 (Vitality Alignment): Sort remaining tasks based on active Vitality Slider.
 *   - High Vitality: High-Energy (Green) > Medium (Purple) > Low (Blue)
 *   - Low Vitality: Low-Energy (Blue) > Medium (Purple) > High (Green)
 *   - Medium Vitality: Medium (Purple) > High (Green) > Low (Blue)
 * Tier 4 (Chronological): Sort any remaining tasks by their exact deadline (dueDate).
 */

export const getPriorityRank = (p?: PriorityLevel | string): number => {
  const norm = normalizePriority(p);
  if (norm === 'Critical') return 1;
  if (norm === 'Can Wait') return 3;
  return 2; // Core default
};

export const getEnergyAlignmentScore = (energy?: string, currentVitality?: string): number => {
  const normEnergy = normalizeEnergy(energy);
  const normVitality = normalizeEnergy(currentVitality);

  if (normVitality === 'High') {
    if (normEnergy === 'High') return 1;
    if (normEnergy === 'Medium') return 2;
    return 3;
  }
  if (normVitality === 'Low') {
    if (normEnergy === 'Low') return 1;
    if (normEnergy === 'Medium') return 2;
    return 3;
  }
  // Medium Vitality
  if (normEnergy === 'Medium') return 1;
  if (normEnergy === 'High') return 2;
  return 3;
};

/**
 * Sorts tasks according to the strict 4-Tier logic
 */
export const sortTasksMultiTier = (tasks: Task[], currentVitality: EnergyLevel): Task[] => {
  return [...tasks].sort((a, b) => {
    // Completed status: completed tasks stay in list but settle at the bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    // Tier 1: Fixed Time Anchors vs Flexible Tasks
    // If both are fixed-time, sort by designated start time
    if (a.isFixedTime && b.isFixedTime) {
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      const timeDiff = timeA.localeCompare(timeB);
      if (timeDiff !== 0) return timeDiff;
    }
    // Fixed time tasks float before flexible tasks in linear lists or preserve anchor position
    if (a.isFixedTime && !b.isFixedTime) return -1;
    if (!a.isFixedTime && b.isFixedTime) return 1;

    // Tier 2: Priority Rank (P1 🔥 first -> P2 -> P3 ❄️)
    const priorityA = getPriorityRank(a.priority);
    const priorityB = getPriorityRank(b.priority);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Tier 3: Vitality Alignment (Alignment with active energy score / slider)
    const vitalityA = getEnergyAlignmentScore(a.energyLevel, currentVitality);
    const vitalityB = getEnergyAlignmentScore(b.energyLevel, currentVitality);
    if (vitalityA !== vitalityB) {
      return vitalityA - vitalityB;
    }

    // Tier 4: Chronological Deadline Sort
    const dateA = a.dueDate || '9999-99-99';
    const dateB = b.dueDate || '9999-99-99';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // Fallback: creation time
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
};

/**
 * Sorts flexible tasks specifically (tasks without fixed time) for the Flexible Pool tray
 */
export const sortFlexibleTasks = (tasks: Task[], currentVitality: EnergyLevel): Task[] => {
  return [...tasks].sort((a, b) => {
    // Completed status: completed tasks stay in list but settle at the bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    // Tier 2: Priority Rank (P1 🔥 first)
    const priorityA = getPriorityRank(a.priority);
    const priorityB = getPriorityRank(b.priority);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Tier 3: Vitality Alignment
    const vitalityA = getEnergyAlignmentScore(a.energyLevel, currentVitality);
    const vitalityB = getEnergyAlignmentScore(b.energyLevel, currentVitality);
    if (vitalityA !== vitalityB) {
      return vitalityA - vitalityB;
    }

    // Tier 4: Chronological Deadline
    const dateA = a.dueDate || '9999-99-99';
    const dateB = b.dueDate || '9999-99-99';
    return dateA.localeCompare(dateB);
  });
};
