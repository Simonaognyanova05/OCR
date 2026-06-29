import { sendJson } from './apiClient';

export function login(payload) {
  return sendJson('/api/auth/login', 'POST', payload);
}

export function register(payload) {
  return sendJson('/api/auth/register', 'POST', payload);
}

