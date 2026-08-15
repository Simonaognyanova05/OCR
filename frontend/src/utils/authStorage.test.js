import { clearStoredAuth, getStoredAuth, setStoredAuth } from './authStorage';

const storageKey = 'ocr-auth';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

test('stores auth payload only in sessionStorage and clears legacy localStorage auth', () => {
  window.localStorage.setItem(storageKey, JSON.stringify({ token: 'legacy-token' }));

  setStoredAuth({ token: 'session-token', user: { id: 'user-1' } });

  expect(window.localStorage.getItem(storageKey)).toBeNull();
  expect(JSON.parse(window.sessionStorage.getItem(storageKey))).toEqual({
    token: 'session-token',
    user: { id: 'user-1' }
  });
  expect(getStoredAuth()).toEqual({
    token: 'session-token',
    user: { id: 'user-1' }
  });
});

test('clears corrupt auth payload instead of returning unsafe data', () => {
  window.sessionStorage.setItem(storageKey, '{bad-json');

  expect(getStoredAuth()).toBeNull();
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
});

test('clearStoredAuth removes session and legacy localStorage auth payloads', () => {
  window.sessionStorage.setItem(storageKey, JSON.stringify({ token: 'session-token' }));
  window.localStorage.setItem(storageKey, JSON.stringify({ token: 'legacy-token' }));

  clearStoredAuth();

  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  expect(window.localStorage.getItem(storageKey)).toBeNull();
});
