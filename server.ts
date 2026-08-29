import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'EnergySync Server', timestamp: new Date().toISOString() });
});

// Gemini AI endpoint to analyze emails and extract structured tasks
app.post('/api/analyze-emails', async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'Missing or invalid emails array' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // If API key is not present, return empty so client uses smart local heuristic fallback
    return res.json({ analyzedEmails: null, message: 'No GEMINI_API_KEY configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const emailSummaries = emails.map((e, idx) => ({
      index: idx,
      id: e.id,
      from: e.from,
      subject: e.subject,
      snippet: e.snippet,
      bodySnippet: e.bodySnippet,
    }));

    const prompt = `You are EnergySync's executive AI assistant. Analyze these ${emails.length} recent emails from the user's Gmail inbox.
For each email, extract an actionable, concrete task to accomplish.
Assign:
1. taskName: A clear, action-oriented task title (e.g., "Review and sign vendor NDA", "Reply to Sarah regarding Q3 design sprint", "Pay AWS monthly invoice").
2. description: A helpful summary note of context or what needs to be done.
3. estimatedTime: A realistic time string (e.g., "10m", "15m", "25m", "45m", "1h").
4. estimatedMinutes: An integer number of minutes (e.g. 10, 15, 25, 45, 60).
5. energyLevel: One of 'High', 'Medium', or 'Low'.
   - 'High': Deep focus, strategic writing, debugging, negotiating, making complex decisions (>45 mins or heavy mental load).
   - 'Medium': Replying to important threads, reviewing drafts, scheduling syncs, updating progress (20-40 mins).
   - 'Low': Quick 1-minute acknowledgments, archiving, receipts, quick confirmations, reading newsletters (<15 mins).
6. urgency: 'high', 'medium', or 'low'.
7. reasoning: A 1-sentence explanation why this energy level and time was assigned.
8. confidence: A float between 0.8 and 1.0.

Emails to analyze:
${JSON.stringify(emailSummaries, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER },
              taskName: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedTime: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              energyLevel: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
              urgency: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              reasoning: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['index', 'taskName', 'estimatedTime', 'estimatedMinutes', 'energyLevel', 'urgency'],
          },
        },
      },
    });

    const parsedResults = JSON.parse(response.text || '[]');
    const analyzedEmails = emails.map((email, idx) => {
      const match = parsedResults.find((p: any) => p.index === idx) || parsedResults[idx];
      if (match) {
        return {
          ...email,
          extractedTask: {
            taskName: match.taskName || `Review: ${email.subject}`,
            description: match.description || email.snippet,
            estimatedTime: match.estimatedTime || '20m',
            estimatedMinutes: match.estimatedMinutes || 20,
            energyLevel: match.energyLevel || 'Medium',
            urgency: match.urgency || 'medium',
            reasoning: match.reasoning || 'Extracted via Gemini AI.',
            confidence: match.confidence || 0.95,
          },
        };
      }
      return email;
    });

    return res.json({ analyzedEmails });
  } catch (error: any) {
    console.error('Gemini analyze-emails error:', error);
    return res.json({ analyzedEmails: null, error: error.message });
  }
});

// Gemini AI endpoint to extract tasks from unstructured text
app.post('/api/extract-tasks', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text string' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ tasks: null, message: 'No GEMINI_API_KEY configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are an intelligent task parser. Read the user's unstructured text and extract actionable tasks. Current Date is: ${currentDate}. Output ONLY a raw JSON array of objects. Do not include markdown blocks like \`\`\`json. Each object must exactly match this structure: { "title": "Clear task name", "date": "YYYY-MM-DD", "duration": Number in minutes, "priority": "Critical" | "Core" | "Can Wait", "energy": "High" | "Medium" | "Low" }. Duration is UNRESTRICTED. Calculate the exact minutes based on the user's text. If a task takes 4 hours, output 240. If it takes 10 hours, output 600. DO NOT cap or default to 120 minutes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `${systemPrompt}\n\nUser Text: ${text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              priority: { type: Type.STRING, enum: ['Critical', 'Core', 'Can Wait'] },
              energy: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            },
            required: ['title', 'date', 'duration', 'priority', 'energy'],
          },
        },
      },
    });

    const tasks = JSON.parse(response.text || '[]');
    return res.json({ tasks });
  } catch (error: any) {
    console.error('Gemini extract-tasks error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Vite middleware for dev or static serving for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EnergySync server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
