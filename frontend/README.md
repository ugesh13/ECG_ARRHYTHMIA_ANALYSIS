# Frontend

React + Vite. See the root README for setup.

- `src/services/api.js` — the only place that talks to the backend.
- `src/hooks/useECG.js` — loads metadata, signal window and annotations for a record.
- `src/components/PredictionCard.jsx` — placeholder; accept a `prediction` prop when a model exists.
- `src/components/ECGChart.jsx` — one chart per channel; TODO zoom and annotation markers.
