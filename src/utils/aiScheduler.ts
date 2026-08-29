import { EnergyLevel, PriorityLevel, TaskBucket } from '../types';
import { getTodayDateString, deriveBucketFromDate } from './dateUtils';

export interface ParsedTaskResult {
  title: string;
  description?: string;
  energyLevel: EnergyLevel;
  priority: PriorityLevel;
  estimatedTime: string;
  estimatedMinutes: number;
  dueDate: string;
  bucket: TaskBucket;
  aiExplanation?: string;
}

/**
 * AI Priority Suggestion Engine
 * - If input contains "urgent", "asap", "deadline", "emergency", "critical", "fire", "high priority" -> Critical (🔥)
 * - If input contains "defer", "whenever", "someday", "optional", "backlog", "later", "low priority", "can wait" -> Can Wait (⏳)
 * - Otherwise -> Core
 */
export function suggestPriorityLevel(input: string): {
  priority: PriorityLevel;
  reason: string;
} {
  const lower = (input || '').toLowerCase();

  const urgentKeywords = [
    'urgent',
    'asap',
    'deadline',
    'critical',
    'emergency',
    'fire',
    'due today',
    'high priority',
    'blocker',
    'immediately',
    'p1',
  ];

  const deferrableKeywords = [
    'defer',
    'whenever',
    'someday',
    'optional',
    'backlog',
    'later',
    'low priority',
    'can wait',
    'nice to have',
    'non-urgent',
    'freeze',
    'cold',
    'p3',
  ];

  for (const kw of urgentKeywords) {
    if (lower.includes(kw)) {
      return {
        priority: 'Critical',
        reason: `Matched urgent keyword "${kw}"`,
      };
    }
  }

  for (const kw of deferrableKeywords) {
    if (lower.includes(kw)) {
      return {
        priority: 'Can Wait',
        reason: `Matched deferrable keyword "${kw}"`,
      };
    }
  }

  return {
    priority: 'Core',
    reason: 'Standard core priority default',
  };
}

/**
 * AI Energy Suggestion Engine
 * Analyzes task string:
 * - words like "code", "analyze", "write", "design", "unet", "architecture", "algorithm" -> High Energy (Green)
 * - words like "email", "read", "sort", "triage", "clean", "archive" -> Low Energy (Blue)
 */
export function suggestEnergyLevel(input: string): {
  energyLevel: EnergyLevel;
  reason: string;
} {
  const lower = (input || '').toLowerCase();

  const highKeywords = [
    'code',
    'coding',
    'analyze',
    'analysis',
    'write',
    'design',
    'unet',
    'cubicasa5k',
    'architecture',
    'algorithm',
    'refactor',
    'spec',
    'thesis',
    'deep learning',
    'ml',
    'model',
    'benchmark',
    'develop',
    'engineer',
    'debug complex',
    'strategy',
    'finance',
    'architect',
    'train',
    'evaluate',
    'implement',
  ];

  const lowKeywords = [
    'email',
    'read',
    'sort',
    'triage',
    'clean',
    'archive',
    'receipt',
    'quick check',
    'unsubscribe',
    'log',
    'browse',
    'order',
    'ping',
    'schedule meeting',
    'cancel',
    'file expense',
    'inbox',
    'check message',
    'survey',
    'download',
  ];

  for (const kw of highKeywords) {
    if (lower.includes(kw)) {
      return {
        energyLevel: 'High',
        reason: `Matched high-cognition keyword "${kw}"`,
      };
    }
  }

  for (const kw of lowKeywords) {
    if (lower.includes(kw)) {
      return {
        energyLevel: 'Low',
        reason: `Matched lightweight task keyword "${kw}"`,
      };
    }
  }

  if (
    lower.includes('review') ||
    lower.includes('sync') ||
    lower.includes('plan') ||
    lower.includes('update') ||
    lower.includes('organize')
  ) {
    return {
      energyLevel: 'Medium',
      reason: 'Collaborative execution or structured planning',
    };
  }

  return {
    energyLevel: 'Medium',
    reason: 'Standard focus required',
  };
}

export { deriveBucketFromDate };

/**
 * Natural Language helper (Keeps tasks as ONE single task strictly without splitting)
 */
export function parseNaturalLanguageTask(input: string): ParsedTaskResult {
  const cleanInput = input.trim();
  const lower = cleanInput.toLowerCase();
  const today = new Date();

  // 1. Energy
  const { energyLevel } = suggestEnergyLevel(cleanInput);

  // 2. Parse Duration (Multilingual & Unrestricted)
  let estimatedMinutes = 30;
  const hourMatch = lower.match(/(\d+(\.\d+)?)\s*(hours?|hrs?|h\b|tiếng|tieng|giờ|gio)/i);
  const minMatch = lower.match(/(\d+)\s*(minutes?|mins?|m\b|phút|phut)/i);

  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    estimatedMinutes = Math.round(hours * 60);
  } else if (minMatch) {
    estimatedMinutes = parseInt(minMatch[1], 10);
  } else {
    estimatedMinutes = energyLevel === 'High' ? 60 : energyLevel === 'Medium' ? 30 : 15;
  }

  const estimatedTime =
    estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)}h${estimatedMinutes % 60 ? ` ${estimatedMinutes % 60}m` : ''}`
      : `${estimatedMinutes}m`;

  // 3. Parse Date
  let dueDateObj = new Date(today);
  const tomorrowKeywords = ['tomorrow', 'tmrw', 'next day'];
  const nextWeekKeywords = ['next week', 'this friday', 'friday', 'weekend', 'in 7 days'];
  const nextMonthKeywords = ['next month', 'in a month', 'in 30 days'];

  if (nextMonthKeywords.some((kw) => lower.includes(kw))) {
    dueDateObj.setDate(dueDateObj.getDate() + 28);
  } else if (nextWeekKeywords.some((kw) => lower.includes(kw))) {
    dueDateObj.setDate(dueDateObj.getDate() + 7);
  } else if (tomorrowKeywords.some((kw) => lower.includes(kw))) {
    dueDateObj.setDate(dueDateObj.getDate() + 1);
  }

  const year = dueDateObj.getFullYear();
  const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dueDateObj.getDate()).padStart(2, '0');
  const dueDate = `${year}-${month}-${day}`;
  const bucket = deriveBucketFromDate(dueDate);

  const cleanTitle = cleanInput
    .replace(/(,\s*)?(deadline|due|by|for)\s+(next\s+week|next\s+month|tomorrow|today|next\s+\w+|this\s+\w+|\d+\s*days?|\d+\s*weeks?)/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || cleanInput;

  const { priority } = suggestPriorityLevel(cleanInput);

  return {
    title: cleanTitle,
    energyLevel,
    priority,
    estimatedTime,
    estimatedMinutes,
    dueDate,
    bucket,
  };
}

/**
 * Generates intelligent breakdown subtasks for a single task based on its context and action verbs.
 */
export function generateSubtasksForTask(taskTitle: string): string[] {
  const title = (taskTitle || '').trim();
  const lower = title.toLowerCase();

  if (!title) return [];

  // Coding / Tech / Engineering
  if (/\b(build|code|develop|fix|bug|refactor|test|deploy|api|backend|frontend|react|database|schema)\b/.test(lower)) {
    return [
      `[ ] Define requirements and edge cases for "${title}"`,
      `[ ] Implement core code logic and component structure`,
      `[ ] Verify error handling and run test validations`,
      `[ ] Code review, lint, and deploy/commit changes`,
    ];
  }

  // Design / Creative / UI
  if (/\b(design|ui|ux|wireframe|figma|prototype|mockup|graphic|logo|palette|sketch)\b/.test(lower)) {
    return [
      `[ ] Gather design inspirations and review layout references`,
      `[ ] Create initial high-fidelity wireframe & typography draft`,
      `[ ] Refine component spacing, contrast, and interactive states`,
      `[ ] Export final assets and document component tokens`,
    ];
  }

  // Writing / Content / Docs / Blog
  if (/\b(write|blog|post|article|draft|doc|documentation|copy|newsletter|script)\b/.test(lower)) {
    return [
      `[ ] Outline key takeaways and structure headers`,
      `[ ] Write first draft without editing in flow mode`,
      `[ ] Polish tone, clarity, and scan for concise phrasing`,
      `[ ] Final proofread and add supporting links/visuals`,
    ];
  }

  // Meetings / Calls / Sync
  if (/\b(meeting|call|sync|presentation|slide|deck|demo|interview|discuss)\b/.test(lower)) {
    return [
      `[ ] Prepare agenda items and key discussion goals`,
      `[ ] Assemble required materials, data metrics, and slide notes`,
      `[ ] Lead discussion and capture action items`,
      `[ ] Send follow-up summary email with assigned owners`,
    ];
  }

  // Planning / Strategy / Research / Analysis
  if (/\b(plan|strategy|research|analyze|audit|evaluate|roadmap|review)\b/.test(lower)) {
    return [
      `[ ] Clarify primary objectives and success metrics`,
      `[ ] Collect relevant baseline data and user/team feedback`,
      `[ ] Synthesize findings into key actionable takeaways`,
      `[ ] Finalize timeline, milestones, and next milestone checkpoints`,
    ];
  }

  // Email / Admin / Taxes / Finances / Legal
  if (/\b(email|inbox|invoice|tax|budget|finance|receipt|account|pay|bill|contract)\b/.test(lower)) {
    return [
      `[ ] Gather needed documents, numbers, and account credentials`,
      `[ ] Review details for accuracy and verify totals`,
      `[ ] Process submission/payment and record confirmation receipts`,
    ];
  }

  // Default smart fallback steps
  return [
    `[ ] Review scope and prep essential requirements for "${title}"`,
    `[ ] Execute primary task focus block without distractions`,
    `[ ] Validate output quality and finalize deliverables`,
  ];
}

/**
 * Single Task AI Parser: extracts dates, times, durations, energy, priority, and subtasks
 */
export function parseSingleTaskWithAI(input: string): {
  cleanTitle: string;
  dueDate: string;
  durationMinutes: number;
  energyLevel: EnergyLevel;
  priority: PriorityLevel;
  isFixedTime: boolean;
  startTime?: string;
  endTime?: string;
  subtasks: string[];
  explanation: string;
} {
  const clean = input.trim();
  const lower = clean.toLowerCase();
  const today = new Date();

  // 1. Energy & Priority
  const { energyLevel, reason: energyReason } = suggestEnergyLevel(clean);
  const { priority, reason: priorityReason } = suggestPriorityLevel(clean);

  // 2. Duration Detection (Multilingual & Unrestricted)
  let durationMinutes = 30;
  const hourMinMatch = lower.match(/(\d+)\s*(?:hours?|hrs?|h|tiếng|tieng|giờ|gio)\s*(\d+)\s*(?:mins?|minutes?|m|phút|phut)/i);
  const hourMatch = lower.match(/(\d+(\.\d+)?)\s*(?:hours?|hrs?|h\b|tiếng|tieng|giờ|gio)/i);
  const minMatch = lower.match(/(\d+)\s*(?:minutes?|mins?|m\b|phút|phut)/i);

  if (hourMinMatch) {
    durationMinutes = parseInt(hourMinMatch[1], 10) * 60 + parseInt(hourMinMatch[2], 10);
  } else if (hourMatch) {
    durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  } else if (minMatch) {
    durationMinutes = parseInt(minMatch[1], 10);
  } else {
    durationMinutes = energyLevel === 'High' ? 60 : energyLevel === 'Medium' ? 30 : 15;
  }

  // 3. Time Window / Anchor Detection (e.g. "14:00 - 15:30", "2pm to 3:30pm", "at 10:00")
  let isFixedTime = false;
  let startTime: string | undefined = undefined;
  let endTime: string | undefined = undefined;

  const timeRangeMatch = clean.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i);
  const ampmRangeMatch = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

  if (timeRangeMatch) {
    isFixedTime = true;
    startTime = timeRangeMatch[1].padStart(5, '0');
    endTime = timeRangeMatch[2].padStart(5, '0');
  } else if (ampmRangeMatch) {
    isFixedTime = true;
    let startH = parseInt(ampmRangeMatch[1], 10);
    const startM = ampmRangeMatch[2] ? parseInt(ampmRangeMatch[2], 10) : 0;
    const startPeriod = ampmRangeMatch[3].toLowerCase();

    let endH = parseInt(ampmRangeMatch[4], 10);
    const endM = ampmRangeMatch[5] ? parseInt(ampmRangeMatch[5], 10) : 0;
    const endPeriod = ampmRangeMatch[6].toLowerCase();

    if (startPeriod === 'pm' && startH < 12) startH += 12;
    if (startPeriod === 'am' && startH === 12) startH = 0;
    if (endPeriod === 'pm' && endH < 12) endH += 12;
    if (endPeriod === 'am' && endH === 12) endH = 0;

    startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  // 4. Date Detection
  let targetDate = new Date(today);
  if (lower.includes('tomorrow') || lower.includes('tmrw')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes('next week') || lower.includes('in a week') || lower.includes('in 7 days')) {
    targetDate.setDate(targetDate.getDate() + 7);
  } else if (lower.includes('next month') || lower.includes('in a month')) {
    targetDate.setDate(targetDate.getDate() + 28);
  } else {
    // Check day names: monday, tuesday, etc.
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const currentDay = today.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7; // next occurrence
        targetDate.setDate(today.getDate() + diff);
        break;
      }
    }
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dueDateStr = `${year}-${month}-${day}`;

  // 5. Clean Title (remove date, time keywords)
  let cleanTitle = clean
    .replace(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/gi, '')
    .replace(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi, '')
    .replace(/(\d+(\.\d+)?)\s*(?:hours?|hrs?|h\b|minutes?|mins?|m\b)/gi, '')
    .replace(/(,\s*)?(deadline|due|by|for|on)\s+(next\s+week|next\s+month|tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\d+\s*days?)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) cleanTitle = clean;

  // 6. Generate Subtasks
  const subtasks = generateSubtasksForTask(cleanTitle);

  return {
    cleanTitle,
    dueDate: dueDateStr,
    durationMinutes,
    energyLevel,
    priority,
    isFixedTime,
    startTime,
    endTime,
    subtasks,
    explanation: `AI: ${energyLevel} energy (${energyReason}) • ${priority} priority (${priorityReason}) • ${durationMinutes}m duration.`,
  };
}

/**
 * Bulk AI Task Extractor
 * Parses meeting notes, raw dumps, transcripts, and multi-line notes into structured actionable tasks.
 */
export function extractBulkTasksFromText(rawText: string): ParsedTaskResult[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const candidateStrings: string[] = [];

  // Step 1: Collect lines or split paragraphs
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line contains multiple bullet points inline or sentence structures
    // Skip obvious header-only lines like "Attendees:", "Meeting Notes:", "---"
    if (/^(attendees|present|date|agenda|location|notes by|re:)\s*:/i.test(trimmed)) {
      continue;
    }
    if (/^[-=_*]{3,}$/.test(trimmed)) {
      continue;
    }

    // Split on bullet patterns or numbered prefixes
    const cleanLine = trimmed
      .replace(/^(\s*[-*•+]\s*(\[[ xX]?\])?\s*)/, '')
      .replace(/^(\s*\d+[\.\)]\s*(\[[ xX]?\])?\s*)/, '')
      .replace(/^(todo|action|task|next step|follow up|assignee|assigned to)\s*:\s*/i, '')
      .trim();

    if (cleanLine.length > 2) {
      // If line is very long (e.g. a big paragraph with sentences), split by punctuation
      if (cleanLine.length > 180 && cleanLine.includes('. ')) {
        const sentences = cleanLine.split(/(?<=[.?!])\s+/);
        for (const s of sentences) {
          const st = s.trim();
          if (st.length > 5) candidateStrings.push(st);
        }
      } else {
        candidateStrings.push(cleanLine);
      }
    }
  }

  // If no candidates found from line splitting (e.g. one huge block), split by sentences
  if (candidateStrings.length === 0) {
    const sentences = rawText.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
      const st = s.trim();
      if (st.length > 5) candidateStrings.push(st);
    }
  }

  // Step 2: Parse each candidate string using natural language parser
  const results: ParsedTaskResult[] = [];
  const seenTitles = new Set<string>();

  for (const candidate of candidateStrings) {
    // Skip empty or ultra-short noise
    if (candidate.length < 3) continue;

    const parsed = parseNaturalLanguageTask(candidate);
    // Deduplicate identical items
    const normalizedKey = parsed.title.toLowerCase().trim();
    if (seenTitles.has(normalizedKey)) continue;
    seenTitles.add(normalizedKey);

    results.push(parsed);
  }

  // Fallback: If somehow nothing was extracted, return single task from raw text
  if (results.length === 0 && rawText.trim()) {
    results.push(parseNaturalLanguageTask(rawText.trim()));
  }

  return results;
}

export interface ExtractedAITask {
  title: string;
  date: string;
  duration: number;
  priority: 'Critical' | 'Core' | 'Can Wait';
  energy: 'High' | 'Medium' | 'Low';
}

// 1. System Prompt definition used for task parsing structure
export const SYSTEM_PROMPT = `You are an intelligent task parser. Read the user's unstructured text and extract actionable tasks. Current Date is: ${getTodayDateString()}. Output ONLY a raw JSON array of objects. Do not include markdown blocks like \`\`\`json. Each object must exactly match this structure: { "title": "Clear task name", "date": "YYYY-MM-DD", "duration": Number in minutes, "priority": "Critical" | "Core" | "Can Wait", "energy": "High" | "Medium" | "Low" }. Duration is UNRESTRICTED. Calculate the exact minutes based on the user's text. If a task takes 4 hours, output 240. If it takes 10 hours, output 600. DO NOT cap or default to 120 minutes.`;

/**
 * 2. extractTasksFromText(rawText) as an Async Fetch Function
 * Proxies extraction through secure backend /api/extract-tasks (keeping API keys server-side),
 * falling back gracefully to local heuristic extraction if offline or dev server is standalone.
 */
export async function extractTasksFromText(rawText: string): Promise<ExtractedAITask[]> {
  if (!rawText || !rawText.trim()) return [];

  // 1. Secure backend route proxy (API key stored server-side only in process.env)
  try {
    const serverRes = await fetch('/api/extract-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        return data.tasks;
      }
    }
  } catch (err) {
    console.warn('Backend /api/extract-tasks unreachable, using local fallback:', err);
  }

  // 2. Smart local heuristic fallback
  const localBulk = extractBulkTasksFromText(rawText);
  return localBulk.map((t) => ({
    title: t.title,
    date: t.dueDate || getTodayDateString(),
    duration: t.estimatedMinutes || 30,
    priority: t.priority as 'Critical' | 'Core' | 'Can Wait',
    energy: t.energyLevel as 'High' | 'Medium' | 'Low',
  }));
}
