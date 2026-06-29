import { useEffect, useState } from 'react';
import { getHealth } from '../services/healthService';

export function useHealth() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  return health;
}

