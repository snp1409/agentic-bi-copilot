# 🚀 Autonomous Agentic BI Copilot

An enterprise-ready, AI-driven Business Intelligence Copilot that translates natural language and speech into validated SQL, executes queries against enterprise databases, dynamically generates multi-chart dashboards, provides executive narratives, and exports executive PDF reports.

---

## 🌟 Key Features

- **🎙️ Real-time Voice-to-Analytics:** Native voice typing input with continuous feedback, audio visualizer states, and fallback error handling.
- **🧠 Natural Language to SQL Translation:** Agentic query orchestration using Google Gemini LLM grounded exclusively on database schema definitions.
- **🛡️ Enterprise Security Model:**
  - Strict read-only database connectivity to avoid unintended data modifications.
  - AST-level validation blocking destructive commands (`DROP`, `DELETE`, `ALTER`, `UPDATE`).
  - Zero PII exposure: raw user records never leave the database VPC; only aggregated metrics are passed to the reasoning layer.
- **📊 Dynamic Visual Dashboards:** Automated chart dispatching (Bar Charts, Line/Area Trajectories, Donut Percentage Breakdowns) rendered through Recharts.
- **🔍 SQL Transparency Inspector:** Collapsible execution drawer providing auditable SQL inspection and one-click copy functionality.
- **📑 Executive PDF Report Generation:** Instant single-page executive reporting using `html2canvas` and `jsPDF` with high-DPI rasterization and lossless asset packaging.

---

## 🏗️ System Architecture

```text
[ User Voice / Prompt ]
         │
         ▼
[ React + Vite Frontend ] (Hardware Audio API / Tailored Dashboards)
         │
         ▼ (HTTP POST / REST)
[ FastAPI Backend Engine ]
         │
         ├──► [ Gemini Agent Reasoning ] ── (Grounded Schema Translation)
         │
         ├──► [ AST SQL Query Guard ] ──── (Read-Only Enforcement)
         │
         ▼
[ MySQL Relational DB ] ──► (Execute Aggregation Query)
         │
         ▼
[ Response Payload ] ──► (Narrative Summary + Dynamic Charts + Raw SQL)
         │
         ▼
[ Recharts & jsPDF Export Engine ]

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts, html2canvas, jsPDF
- **Backend:** Python 3.11, FastAPI, Uvicorn, SQLAlchemy, PyMySQL
- **AI / LLM:** Google Gemini API
- **Database:** MySQL Relational Database Engine

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL Server running locally or in cloud

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend

2. Create and activate a Python virtual environment:

   ```Bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate

3. Install backend dependencies:

   ```Bash
   pip install fastapi uvicorn sqlalchemy pymysql google-generativeai python-dotenv
   Configure your .env file in the backend/ directory:

   Code snippet
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/spotify_bi
   
4. Seed the database with sample Spotify catalog records:

   ```Bash
    python seed_spotify.py

5. Start the FastAPI backend server:

   ```Bash
    uvicorn main:app --reload --port 8000
    
### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

   ```Bash
    cd frontend
    
2. Install frontend dependencies:

   ```Bash
    npm install

3. Start the Vite development server:

   ```Bash
    npm run dev
 
4. Open http://localhost:5173 in your browser.

### 🔮 Roadmap (Version 2.0)
[ ] Multi-Tenant Database Connectors: Dynamic UI onboarding for external MySQL, PostgreSQL, and Snowflake instances.

[ ] Runtime Schema Reflection: Automatic table and relationship discovery using SQLAlchemy inspection utilities.

[ ] JWT User Authentication: Role-based access control with encrypted password hashing.

[ ] Headless Chromium PDF Pipeline: Backend Playwright/Puppeteer rendering service for pure vector PDF generation.

📄 License
This project is licensed under the MIT License.