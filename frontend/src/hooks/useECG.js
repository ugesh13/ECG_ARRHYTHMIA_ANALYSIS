import { useCallback, useEffect, useState } from 'react';
import { getAnnotations, getErrorMessage, getMetadata, getSignal } from '../services/api.js';

/**
 * Custom hook for streaming and inspecting ECG telemetry windows.
 * Loads record metadata, physical signal channels, and annotation markers.
 * Handles partial failures gracefully (signal loads even if annotations are absent).
 */
export default function useECG(
  recordId,
  { windowStart = 0, windowLength = 10, channelIndex = null } = {}
) {
  const [metadata, setMetadata] = useState(null);
  const [signal, setSignal] = useState(null);
  const [annotations, setAnnotations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [annotationsWarning, setAnnotationsWarning] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Fetch metadata when recordId changes
  useEffect(() => {
    setMetadata(null);
    setSignal(null);
    setAnnotations(null);
    setError(null);
    setAnnotationsWarning(null);

    if (!recordId) return;
    let cancelled = false;

    getMetadata(recordId)
      .then((m) => {
        if (!cancelled) setMetadata(m);
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e));
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, reloadKey]);

  // 2. Fetch signal and annotations for current time window
  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setLoading(true);

    const range = {
      start_s: windowStart,
      end_s: windowStart + windowLength,
      max_points: 5000,
    };

    if (channelIndex !== null && channelIndex !== undefined) {
      range.channels = String(channelIndex);
    }

    // Use Promise.allSettled to guarantee partial data resilience
    Promise.allSettled([
      getSignal(recordId, range),
      getAnnotations(recordId, { start_s: range.start_s, end_s: range.end_s, limit: 1000 }),
    ]).then(([signalResult, annotResult]) => {
      if (cancelled) return;

      if (signalResult.status === 'fulfilled') {
        setSignal(signalResult.value);
        setError(null);
      } else {
        setError(getErrorMessage(signalResult.reason));
      }

      if (annotResult.status === 'fulfilled') {
        setAnnotations(annotResult.value);
        setAnnotationsWarning(null);
      } else {
        setAnnotations(null);
        setAnnotationsWarning('Beat annotations are not available or could not be retrieved for this time window.');
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [recordId, windowStart, windowLength, channelIndex, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    metadata,
    signal,
    annotations,
    loading,
    error,
    annotationsWarning,
    reload,
  };
}
