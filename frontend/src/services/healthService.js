import { getJson } from './apiClient';

export function getHealth() {
  return getJson('/health');
}

