// All backend communication lives here. Components never call axios directly.
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 120000, // 2 minutes for processing complete 30-minute records
});

/** Convert any axios error into a safe, human-readable message. */
export function getErrorMessage(err) {
  if (err?.response) {
    const status = err.response.status;
    const msg = err.response.data?.message;

    if (status === 400) return msg || 'Invalid record ID or malformed request.';
    if (status === 404) return 'ECG record was not found.';
    if (status === 422) return msg || 'The ECG record could not be analyzed because annotation or signal data is invalid.';
    if (status === 503) return 'The arrhythmia classification model is currently unavailable.';
    if (status >= 500) return 'An unexpected server error occurred during analysis. Please try again.';
    return msg || `Request failed with HTTP ${status}.`;
  }
  if (err?.request) return 'Backend unavailable. Is the API server running on port 8000?';
  return err?.message || 'An unexpected error occurred.';
}

const data = (p) => p.then((r) => r.data);

export const checkHealth = () => data(client.get('/health'));
export const listRecords = () => data(client.get('/ecg/records'));
export const getMetadata = (id) => data(client.get(`/ecg/${id}/metadata`));
export const getSignal = (id, params = {}) => data(client.get(`/ecg/${id}/signal`, { params }));
export const getAnnotations = (id, params = {}) =>
  data(client.get(`/ecg/${id}/annotations`, { params }));

/** Execute complete arrhythmia analysis on an ECG record. */
export const analyzeECGRecord = (id, forceRefresh = false) =>
  data(client.post(`/analysis/${id}${forceRefresh ? '?force_refresh=true' : ''}`));

/** Backward-compatible alias for existing components. */
export const runAnalysis = analyzeECGRecord;

export const getHistory = () => data(client.get('/history'));

/** files: File[] (.hea + .dat [+ .atr]). onProgress receives 0-100. */
export function uploadRecord(files, onProgress) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return data(
    client.post('/upload', form, {
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded * 100) / e.total)),
    })
  );
}
