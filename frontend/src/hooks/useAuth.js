import { useEffect, useState } from 'react';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/authStorage';

export function useAuth() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [companyDraft, setCompanyDraft] = useState(null);

  useEffect(() => {
    if (auth?.company) setCompanyDraft(auth.company);
  }, [auth]);

  function saveAuth(nextAuth) {
    setStoredAuth(nextAuth);
    setAuth(nextAuth);
    setCompanyDraft(nextAuth.company);
  }

  function logout() {
    clearStoredAuth();
    setAuth(null);
    setCompanyDraft(null);
  }

  function updateCompanyDraft(path, value) {
    setCompanyDraft((currentDraft) => ({ ...currentDraft, [path]: value }));
  }

  return {
    auth,
    companyDraft,
    logout,
    saveAuth,
    setCompanyDraft,
    updateCompanyDraft,
  };
}

