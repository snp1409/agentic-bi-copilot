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