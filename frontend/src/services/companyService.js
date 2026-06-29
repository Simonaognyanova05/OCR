import { sendJson } from './apiClient';

export function updateCompany(payload, token) {
  return sendJson('/api/company', 'PUT', payload, token);
}

