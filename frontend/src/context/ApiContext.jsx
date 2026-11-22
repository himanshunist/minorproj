import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getHealth, getModelInfo } from '../api/client';

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const healthData = await getHealth();
      setHealth(healthData);
      const info = await getModelInfo();
      setModelInfo(info);
      setError(null);
    } catch (err) {
      setHealth(null);
      setModelInfo(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ health, modelInfo, loading, error, ready: Boolean(health?.model_ready && modelInfo), refresh }),
    [health, modelInfo, loading, error, refresh],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApi must be used inside ApiProvider');
  return context;
}
