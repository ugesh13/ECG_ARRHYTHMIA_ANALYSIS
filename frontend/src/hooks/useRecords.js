import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, listRecords } from '../services/api.js';

export default function useRecords() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listRecords()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshIndex]);

  const refresh = useCallback(() => setRefreshIndex((k) => k + 1), []);

  return {
    records: data?.records || [],
    count: data?.count || 0,
    loading,
    error,
    refresh,
  };
}
