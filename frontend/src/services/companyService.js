import { sendJson } from './apiClient';

export function getCompanyProfile(token) {
  return sendJson('/api/company', 'GET', undefined, token);
}

export function updateCompany(payload, token) {
  return sendJson('/api/company', 'PUT', payload, token);
}

export function requestSubscriptionPlan(payload, token) {
  return sendJson('/api/company/subscription-requests', 'POST', payload, token);
}
