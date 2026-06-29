import { useCallback, useState } from 'react';
import { getDashboard } from '../services/dashboardService';

export function useDashboard(auth, onError) {
  const [dashboard, setDashboard] = useState(null);

  const loadDashboard = useCallback(async () => {
    if (!auth?.token) return;

    try {
      const data = await getDashboard(auth.token);
      setDashboard(data);
    } catch (error) {
      onError(error.message);
    }
  }, [auth?.token, onError]);

  return {
    dashboard,
    loadDashboard,
  };
}

