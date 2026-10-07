/**
 * Centralized API service layer for ECG Arrhythmia Analysis Platform.
 * All backend HTTP calls are isolated in this module.
 */

import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000, // 2 minutes for processing complete 30-minute records
});

/** Convert any Axios error into a safe, human-readable message without raw tracebacks. */
export function getErrorMessage(err) {
  if (err?.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail || err.response.data?.message;

    if (status === 400) return detail || 'Invalid record ID or malformed request.';
    if (status === 404) return detail || 'ECG record was not found.';
    if (status === 422) return detail || 'The ECG record could not be processed due to invalid parameters.';
    if (status === 503) return detail || 'The requested analysis or experimental artifact is currently unavailable.';
    if (status >= 500) return 'An unexpected server error occurred. Please try again.';
    return detail || `Request failed with HTTP status ${status}.`;
  }
  if (err?.request) return 'Backend API is unreachable. Please verify the backend server is running on port 8000.';
  return err?.message || 'An unexpected error occurred.';
}

const unwrap = (promise) => promise.then((res) => res.data);

// ============================================================================
// System Health & Diagnostics
// ============================================================================
export const checkHealth = () => unwrap(client.get('/health'));
export const healthApi = checkHealth;

// ============================================================================
// ECG Records & Raw Signals
// ============================================================================
export const listRecords = () => unwrap(client.get('/ecg/records'));
export const getRecords = listRecords;

export const getRecordMetadata = (recordId) => unwrap(client.get(`/ecg/${recordId}/metadata`));
export const getMetadata = getRecordMetadata;

export const getRecordSignal = (recordId, params = {}) =>
  unwrap(client.get(`/ecg/${recordId}/signal`, { params }));
export const getSignal = getRecordSignal;

export const getRecordAnnotations = (recordId, params = {}) =>
  unwrap(client.get(`/ecg/${recordId}/annotations`, { params }));
export const getAnnotations = getRecordAnnotations;

// ============================================================================
// Arrhythmia Analysis & Inference
// ============================================================================
export const analyzeRecord = (recordId, forceRefresh = false) =>
  unwrap(client.post(`/analysis/${recordId}${forceRefresh ? '?force_refresh=true' : ''}`));
export const analyzeECGRecord = analyzeRecord;
export const runAnalysis = analyzeRecord;

export const getAnalysisSummary = (recordId) =>
  unwrap(client.get(`/analysis/${recordId}/summary`));

export const getAnalysisBeats = (recordId, params = {}) =>
  unwrap(client.get(`/analysis/${recordId}/beats`, { params }));

export const getBeatDetail = (recordId, beatIndex) =>
  unwrap(client.get(`/analysis/${recordId}/beats/${beatIndex}`));

// ============================================================================
// Model Provenance & Experimental Benchmarks (Phase 17)
// ============================================================================
export const getModelInfo = () => unwrap(client.get('/model/info'));

export const getBenchmark = () => unwrap(client.get('/experiments/benchmark'));

export const getGeneralization = () => unwrap(client.get('/experiments/generalization'));

export const getFeatureImportance = () => unwrap(client.get('/experiments/feature-importance'));

export const getRecordBreakdown = (params = {}) =>
  unwrap(client.get('/experiments/record-breakdown', { params }));

export const getDatasetDistribution = () => unwrap(client.get('/experiments/dataset-distribution'));

export const getExperimentArtifacts = () => unwrap(client.get('/experiments/artifacts'));

// ============================================================================
// Record Upload & Session History
// ============================================================================
export const getHistory = () => unwrap(client.get('/history'));

/** Upload WFDB record files (.hea, .dat, .atr) */
export function uploadRecord(files, onProgress) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return unwrap(
    client.post('/upload', form, {
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded * 100) / e.total)),
    })
  );
}
