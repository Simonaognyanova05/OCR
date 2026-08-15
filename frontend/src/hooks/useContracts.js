import { useCallback, useState } from 'react';
import { listContracts } from '../services/contractService';

export const initialContractFilters = {
  status: '',
  contractType: '',
};

export function useContracts(auth, onError) {
  const [contracts, setContracts] = useState([]);
  const [contractFilters, setContractFilters] = useState(initialContractFilters);

  const loadContracts = useCallback(async (filters = contractFilters) => {
    if (!auth?.token) return;

    try {
      const data = await listContracts(filters, auth.token);
      setContracts(data.contracts || []);
    } catch (error) {
      onError(error.message);
    }
  }, [auth?.token, contractFilters, onError]);

  return {
    contractFilters,
    contracts,
    loadContracts,
    setContractFilters,
  };
}
