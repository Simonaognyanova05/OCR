const AUTH_STORAGE_KEY = 'ocr-auth';

function getBrowserStorage(storageName) {
  if (typeof window === 'undefined') return null;

  try {
    return window[storageName];
  } catch {
    return null;
  }
}

function clearLegacyLocalAuth() {
  const legacyStorage = getBrowserStorage('localStorage');
  if (!legacyStorage) return;

  try {
    legacyStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function getStoredAuth() {
  const storage = getBrowserStorage('sessionStorage');
  clearLegacyLocalAuth();
  if (!storage) return null;

  try {
    const rawAuth = storage.getItem(AUTH_STORAGE_KEY);
    return rawAuth ? JSON.parse(rawAuth) : null;
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function setStoredAuth(auth) {
  const storage = getBrowserStorage('sessionStorage');
  if (!storage) return;

  try {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    clearLegacyLocalAuth();
  } catch {
    clearStoredAuth();
  }
}

export function clearStoredAuth() {
  const storage = getBrowserStorage('sessionStorage');

  try {
    storage?.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }

  clearLegacyLocalAuth();
}
