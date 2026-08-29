import { Task, EnergyLevel, TaskStatus, TaskBucket, TaskSource } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

const SHEET_NAME = 'EnergySync Tasks';
const SPREADSHEET_TITLE = 'EnergySync Tasks (Google Sheets)';

export interface SheetInitResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNew: boolean;
}

/**
 * Searches for an existing "EnergySync Tasks" spreadsheet in the user's Drive or creates one.
 */
export async function getOrCreateEnergySyncSheet(accessToken: string): Promise<SheetInitResult> {
  try {
    // 1. Search for existing spreadsheet by title using Drive API
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        SPREADSHEET_TITLE
      )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          spreadsheetId: file.id,
          spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          isNew: false,
        };
      }
    }

    // 2. Create a new Google Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: SPREADSHEET_TITLE,
        },
        sheets: [
          {
            properties: {
              title: SHEET_NAME,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create spreadsheet: ${err}`);
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 3. Populate Header Row with beautiful formatting
    const headers = [
      'ID',
      'Title',
      'Description',
      'Energy Level',
      'Estimated Time',
      'Estimated Minutes',
      'Due Date',
      'Status',
      'Bucket',
      'Source',
      'Source Details',
      'Created At',
      'Updated At',
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME)}!A1:M1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers],
      }),
    });

    const todayDate = getTodayDateString();
    const initialSampleTasks = [
      [
        'task_init_1',
        'Deep Focus: Review quarterly architecture & roadmap',
        'High energy analysis and strategic prioritization',
        'High',
        '45m',
        '45',
        todayDate,
        'pending',
        'today',
        'manual',
        'Direct Entry',
        new Date().toISOString(),
        new Date().toISOString(),
      ],
      [
        'task_init_2',
        'Team Sync: Align on product sprint deliverables',
        'Collaborative discussion and review comments',
        'Medium',
        '25m',
        '25',
        todayDate,
        'pending',
        'today',
        'manual',
        'Direct Entry',
        new Date().toISOString(),
        new Date().toISOString(),
      ],
      [
        'task_init_3',
        'Clear Inbox & Archive low priority notifications',
        'Light admin work requiring minimal cognitive strain',
        'Low',
        '15m',
        '15',
        todayDate,
        'pending',
        'today',
        'manual',
        'Direct Entry',
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME)}!A2:M4?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: initialSampleTasks,
      }),
    });

    return {
      spreadsheetId,
      spreadsheetUrl,
      isNew: true,
    };
  } catch (error: any) {
    console.error('Error in getOrCreateEnergySyncSheet:', error);
    throw error;
  }
}

/**
 * Reads all tasks from Google Sheets
 */
export async function loadTasksFromSheet(accessToken: string, spreadsheetId: string): Promise<Task[]> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME)}!A2:M500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      // If sheet tab name differs, try reading first sheet range
      const fallbackRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:M500`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!fallbackRes.ok) {
        throw new Error('Could not read tasks from sheet');
      }
      const data = await fallbackRes.json();
      return parseRowsToTasks(data.values || []);
    }

    const data = await res.json();
    return parseRowsToTasks(data.values || []);
  } catch (error: any) {
    console.error('Failed to load tasks from Google Sheets:', error);
    throw error;
  }
}

function parseRowsToTasks(rows: any[][]): Task[] {
  const defaultToday = getTodayDateString();

  return rows
    .filter((row) => row && row.length > 0 && row[1]) // Must have title
    .map((row, idx) => {
      const id = row[0] || `task_${Date.now()}_${idx}`;
      const title = row[1] || 'Untitled Task';
      const description = row[2] || '';
      const rawEnergy = (row[3] || 'Medium').trim();
      const energyLevel: EnergyLevel =
        rawEnergy.toLowerCase() === 'high' ? 'High' : rawEnergy.toLowerCase() === 'low' ? 'Low' : 'Medium';
      const estimatedTime = row[4] || '25m';
      const estimatedMinutes = parseInt(row[5], 10) || 25;

      // Handle 13-column (with Due Date at col 6) vs legacy 12-column sheets
      let dueDate = defaultToday;
      let status: TaskStatus = 'pending';
      let bucket: TaskBucket = 'today';
      let source: TaskSource = 'manual';
      let sourceEmailSubject: string | undefined = undefined;
      let createdAt = new Date().toISOString();
      let updatedAt = new Date().toISOString();

      if (row.length >= 13 || (row[6] && (row[6].includes('-') || row[6].includes('/')))) {
        // 13-column schema: col 6 is dueDate
        dueDate = row[6] || defaultToday;
        const rawStatus = (row[7] || 'pending').toLowerCase();
        status = rawStatus === 'completed' ? 'completed' : 'pending';
        const rawBucket = (row[8] || 'today').toLowerCase().replace(' ', '_');
        bucket =
          rawBucket === 'tomorrow'
            ? 'tomorrow'
            : rawBucket === 'next_week'
            ? 'next_week'
            : rawBucket === 'next_month'
            ? 'next_month'
            : rawBucket === 'completed' || rawBucket === 'someday'
            ? 'completed'
            : 'today';
        source = (row[9] || 'manual') as TaskSource;
        sourceEmailSubject = row[10] || undefined;
        createdAt = row[11] || new Date().toISOString();
        updatedAt = row[12] || new Date().toISOString();
      } else {
        // Legacy 12-column schema: col 6 is status, col 7 is bucket
        const rawStatus = (row[6] || 'pending').toLowerCase();
        status = rawStatus === 'completed' ? 'completed' : 'pending';
        const rawBucket = (row[7] || 'today').toLowerCase().replace(' ', '_');
        bucket =
          rawBucket === 'tomorrow'
            ? 'tomorrow'
            : rawBucket === 'next_week'
            ? 'next_week'
            : rawBucket === 'next_month'
            ? 'next_month'
            : rawBucket === 'completed' || rawBucket === 'someday'
            ? 'completed'
            : 'today';
        source = (row[8] || 'manual') as TaskSource;
        sourceEmailSubject = row[9] || undefined;
        createdAt = row[10] || new Date().toISOString();
        updatedAt = row[11] || new Date().toISOString();
      }

      return {
        id,
        title,
        description,
        energyLevel,
        priority: 'Core' as const,
        estimatedTime,
        estimatedMinutes,
        dueDate,
        status,
        bucket,
        source,
        sourceEmailSubject,
        createdAt,
        updatedAt,
        syncedToSheets: true,
        sheetRowIndex: idx + 2, // 1-indexed row in sheet (Row 1 is headers)
      };
    });
}

/**
 * Appends a new task to Google Sheet
 */
export async function appendTaskToSheet(accessToken: string, spreadsheetId: string, task: Task): Promise<void> {
  const defaultToday = getTodayDateString();
  const rowValues = [
    task.id,
    task.title,
    task.description || '',
    task.energyLevel,
    task.estimatedTime,
    task.estimatedMinutes.toString(),
    task.dueDate || defaultToday,
    task.status,
    task.bucket,
    task.source,
    task.sourceEmailSubject || '',
    task.createdAt,
    task.updatedAt,
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      SHEET_NAME
    )}!A:M:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.warn('Google Sheets append error:', err);
  }
}

/**
 * Overwrites entire task list to keep Google Sheet in clean synchronization
 */
export async function syncAllTasksToSheet(accessToken: string, spreadsheetId: string, tasks: Task[]): Promise<void> {
  const defaultToday = getTodayDateString();
  const rows = tasks.map((task) => [
    task.id,
    task.title,
    task.description || '',
    task.energyLevel,
    task.estimatedTime,
    task.estimatedMinutes.toString(),
    task.dueDate || defaultToday,
    task.status,
    task.bucket,
    task.source,
    task.sourceEmailSubject || '',
    task.createdAt,
    new Date().toISOString(),
  ]);

  // Clear existing rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAME)}!A2:M500:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (rows.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        SHEET_NAME
      )}!A2:M${rows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
  }
}
