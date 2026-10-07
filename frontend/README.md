# Frontend Architecture & Design System (Phase 18)

React 18 + Vite modern web application for ECG signal processing, morphology analysis, and arrhythmia detection.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
   The application runs at `http://localhost:5173`. In development, Vite automatically proxies `/api` requests to the FastAPI backend at `http://127.0.0.1:8000`.

3. Build production bundle:
   ```bash
   npm run build
   ```

## Configuration

Set the backend API endpoint via environment variable in `.env` or `.env.local`:
```env
VITE_API_BASE_URL=/api
```
If unset, it defaults to `/api` (leveraging Vite's dev proxy to `http://127.0.0.1:8000`).

## Application Route Structure

| Route | Page Component | Description |
|---|---|---|
| `/` | `Dashboard.jsx` | Platform overview, live health & model KPI cards, locked DS2 benchmark metrics |
| `/records` | `Records.jsx` | ECG Record Explorer with search, ANSI partition filters (DS1 train/val, DS2 test), and direct actions |
| `/waveform/:recordId` | `WaveformViewer.jsx` | Multi-lead waveform telemetry, configurable time-window controls, signal visualization |
| `/beat/:recordId/:beatIndex` | `BeatInspector.jsx` | Single beat diagnostic view with 200 morphology samples and 9 bidirectional RR interval features |
| `/analysis/:recordId` | `ECGAnalysis.jsx` | End-to-end full-record arrhythmia analysis, beat classification table, and confidence gauges |
| `/prediction/:recordId/:beatIndex` | `PredictionConfidence.jsx` | Posterior probability distribution across ANSI/AAMI classes `[N, S, V, F]` and confidence breakdown |
| `/benchmark` | `BenchmarkDashboard.jsx` | Locked Phase 8 DS2 experimental benchmark metrics, 4×4 confusion matrix, and generalization delta table |
| `/interpretability` | `Interpretability.jsx` | Model-level Random Forest Gini feature importances (Top 15 ranking, 26.38% temporal total) |
| `/error-analysis` | `ErrorAnalysis.jsx` | Held-out DS2 error analysis, top misclassification transitions (N→S, N→V), and record breakdown |
| `/history` | `History.jsx` | Chronological session history and upload audit trail |
| `/upload` | `UploadECG.jsx` | Drag-and-drop WFDB archive upload (.hea, .dat, optional .atr) |
| `/about` | `About.jsx` | System architecture, ANSI/AAMI EC57 diagnostic taxonomy details, and academic disclaimers |

## Design System & Theme Foundations

- **Dark-First Telemetry Aesthetic**: Optimized for high contrast, clean signal inspection, and clinical telemetry readability (`#090d16` background, `#0f172a` card surfaces, subtle borders).
- **ANSI/AAMI EC57 Semantic Color Mapping**:
  - `Class N` (Normal): Emerald Green (`#10b981`)
  - `Class S` (Supraventricular Ectopic): Amber Orange (`#f59e0b`)
  - `Class V` (Ventricular Ectopic): Crimson Red (`#ef4444`)
  - `Class F` (Fusion Beat): Violet Purple (`#a855f7`)
  - `Edge Beat` (Boundary Exclusion): Slate Gray (`#64748b`)
- **Accessibility**: Multi-modal labeling combining color + text code + description (e.g. `[N] Normal / Non-ectopic`). Keyboard-focusable elements and WCAG AA contrast compliance.

## Component Library (`src/components/`)

- **Layout**:
  - `AppShell.jsx` — Responsive root shell with top navigation and sidebar
  - `Navbar.jsx` — Header with API connection status, Model Operational badge, and mobile drawer toggle
  - `Sidebar.jsx` — SVG-icon navigation with active route highlights and section grouping
  - `PageContainer.jsx` — Standard page wrapper with breadcrumb navigation and action headers
- **UI System**:
  - `Card.jsx` — Rounded surface container with header, subtitle, actions, and footer
  - `StatCard.jsx` — Prominent KPI card with tabular numbers, subtitle, and badges
  - `DataTable.jsx` — Responsive table with empty states, loading indicators, and row click handlers
  - `StatusIndicator.jsx` — Real-time pulsing dot indicator for backend API connectivity
  - `LoadingState.jsx` / `ErrorState.jsx` — Controlled feedback states with retry actions
- **ECG Domain**:
  - `ClassBadge.jsx` — Standardized badge for the 4 AAMI diagnostic classes + edge beats
  - `ECGLegend.jsx` — Color and taxonomy guide for cardiologist reference labels
  - `ECGChart.jsx` — Recharts SVG waveform renderer
  - `AnalysisCard.jsx` / `PredictionCard.jsx` / `BeatTableCard.jsx` — Full-record arrhythmia inspection components

## Services & Hooks

- `src/services/api.js`: Centralized Axios client with error-message sanitization; exposes health, record discovery, live inference, and Phase 17 experimental benchmark endpoints.
- `src/hooks/`:
  - `useHealth()` — Live API and ML model loading state
  - `useRecords()` — Record list and caching
  - `useECG()` — Waveform decimation streaming and annotation loading
  - `useBenchmark()` — Locked Phase 8 DS2 benchmark and confusion matrix
  - `useModelInfo()` — Model provenance, hyperparameters, and partition specifications
  - `useFeatureImportance()` — Top 15 feature importances and temporal contribution
