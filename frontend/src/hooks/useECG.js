import { useCallback, useEffect, useState } from 'react';
import { getAnnotations, getErrorMessage, getMetadata, getSignal } from '../services/api.js';

/**
 * Loads metadata once per record, then signal + annotations for the current time window.
 * TODO: cache windows, abort in-flight requests, add channel selection.
 */
export default function useECG(recordId, { windowStart = 0, windowLength = 10 } = {}) {
  const [metadata, setMetadata] = useState(null);
  const [signal, setSignal] = useState(null);
  const [annotations, setAnnotations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setMetadata(null);
    setSignal(null);
    setAnnotations(null);
    setError(null);
    if (!recordId) return;
    let cancelled = false;
    getMetadata(recordId)
      .then((m) => !cancelled && setMetadata(m))
      .catch((e) => !cancelled && setError(getErrorMessage(e)));
    return () => { cancelled = true; };
  }, [recordId, reloadKey]);

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    setLoading(true);
    const range = { start_s: windowStart, end_s: windowStart + windowLength };
    Promise.all([getSignal(recordId, range), getAnnotations(recordId, { ...range, limit: 2000 })])
      .then(([s, a]) => { if (!cancelled) { setSignal(s); setAnnotations(a); setError(null); } })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [recordId, windowStart, windowLength, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { metadata, signal, annotations, loading, error, reload };
}
