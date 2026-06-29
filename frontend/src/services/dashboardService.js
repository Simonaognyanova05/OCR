import { getJson } from './apiClient';

export function getDashboard(token) {
  return getJson('/api/dashboard', token);
}

