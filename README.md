# EnergySync - Gamified Cognitive Time-Orchestration Engine

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **EnergySync** is an intelligent, full-stack cognitive time-orchestration and productivity engine. Instead of forcing rigid linear to-do lists that lead to burnout, EnergySync aligns task execution with real-time biological energy states, daily capacity limits, and smart AI assistance — paired with an interactive, Neo-Brutalist virtual desktop pet (**Chrono-Egg**).

---

## 🌟 Key Features

### ⚡ 1. Energy-Aware Time-Blocking & Vitality Pulse
- **Circadian Energy Mapping**: Tasks are categorized across **High**, **Medium**, and **Low** energy bandwidths to match natural cognitive focus states.
- **Dynamic Capacity Ring**: Real-time visualization tracking scheduled focus minutes against configured daily capacity limits (e.g., 480 mins).
- **Overload Rescue Protocol**: Automatically detects cognitive overload and provides single-click intelligent rebalancing of non-critical tasks to future horizons.

### 🤖 2. Server-Side AI Intelligence (Google Gemini API)
- **Zero-Exposure Security Architecture**: All Gemini API calls run strictly on the backend Express proxy server via `process.env.GEMINI_API_KEY`, keeping API secrets completely isolated from the browser bundle.
- **AI Daily Playbook & Smart Planner**: Translates unstructured thoughts, brain dumps, and meeting transcripts into structured actionable tasks.
- **Gmail AI Inbox Triage**: Authenticates via Google OAuth, scans recent unread messages, extracts action items, and recommends priority tags with editable accordion drawers.

### 🐣 3. Chrono-Egg Desktop Companion (Neo-Brutalist Virtual Pet)
- **Living Desk Companion**: A physics-enabled, interactive virtual pet that roams your workspace, perches on UI cards and buttons, balances on edges, and reacts to clicks, drags, and focus sessions.
- **RPG Progression & Level-Ups**: Earn XP and level up from *Chrono-Egg* through *Clock Hatchling*, *Aero-Chronos*, and *Celestial Time-Keeper* as you complete focus sprints.
- **Focus Companion & Mood States**: Reacts dynamically to productivity streaks, task completions, and idle breaks with custom sound chimes powered by the native Web Audio API.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Architecture (SPA)                         │
│       React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion / Framer      │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ (Proxy /api/* calls)
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                           Express.js Backend Proxy                          │
│            Node.js + @google/genai SDK (process.env.GEMINI_API_KEY)         │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
               Google Gemini Developer API     Google Workspace APIs
              (Structured Task Extraction)     (OAuth 2.0 Gmail & Sheets)
```

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Fast, responsive single-page client application |
| **Styling** | Tailwind CSS v4 | High-contrast Neo-Brutalist design system with aurora ambient accents |
| **Motion** | `motion` (Framer Motion v12) | Physics-based animations, drag states, and UI transitions |
| **Icons & Audio** | `lucide-react`, Web Audio API | Standardized modern iconography & client-synthesized harmonic sound effects |
| **Backend** | Express.js, TypeScript, `tsx` | Secure API routing, Vite SSR/SPA middleware, and Gemini AI proxying |
| **AI Integration** | `@google/genai` (Google Gen AI SDK) | Server-side structured schema extraction and cognitive analysis |

---

## 🚀 Getting Started & Local Setup Guide

Follow these simple steps to clone, configure, and run EnergySync locally:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or 20.x+ recommended)
- [npm](https://www.npmjs.com/) (or yarn / pnpm / bun)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/EnergySync.git
cd EnergySync
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (alongside `package.json`):
```bash
touch .env
```

Add your Gemini API key inside `.env`:
```env
# Server-side Gemini AI Key (Required for AI Playbook & Task Extraction)
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> 🔒 **Security Guarantee**: You only need `GEMINI_API_KEY`. The frontend does **not** require any public API keys, ensuring zero risk of credential leaks in client-side bundles.

### 5. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📦 Production Build & Deployment

Before committing or pushing to production, verify that the TypeScript types and Vite bundle compile cleanly:

```bash
# 1. Run TypeScript type check
npm run lint

# 2. Compile full-stack production build (Vite + esbuild Node server)
npm run build

# 3. Start the compiled production server
npm run start
```

---

## 📂 Project Structure

```
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration (protects .env files)
├── index.html                # HTML entry point
├── package.json              # Dependencies and lifecycle scripts
├── server.ts                 # Full-stack Express backend & Gemini API proxy
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite bundler & Tailwind plugin setup
└── src/
    ├── App.tsx               # Main application orchestration component
    ├── main.tsx              # React DOM mounting entry point
    ├── types.ts              # Global TypeScript interfaces & data models
    ├── components/           # Extracted UI components & modals
    │   ├── Header.tsx        # Top navigation & Gmail/Google connection status
    │   ├── VitalityPulseDashboard.tsx # Energy dial & workload capacity ring
    │   ├── TaskList.tsx      # Multi-horizon task list with inline controls
    │   ├── TaskRow.tsx       # Individual task row with priority/energy badges
    │   ├── TimeBlockCalendar.tsx # 24-hour visual schedule grid
    │   ├── WingedClockPet.tsx # Interactive Chrono-Egg desktop companion
    │   ├── PlaybookView.tsx  # AI daily schedule generator & text parser
    │   ├── InboxScanModal.tsx # Gmail AI triage drawer & task importer
    │   └── ...
    ├── services/             # Google Workspace & OAuth API wrappers
    │   ├── gmail.ts          # Gmail REST API client & AI triage proxy
    │   └── googleSheets.ts   # Google Sheets two-way sync client
    └── utils/                # Audio synthesizers, rescue logic & helpers
        ├── audio.ts          # Web Audio API harmonic sound generator
        ├── aiScheduler.ts    # Task extraction & heuristic parsing engine
        └── ...
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
