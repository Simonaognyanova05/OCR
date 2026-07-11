import { getJson, sendJson } from './apiClient';

export function listSubscriptionRequests(token, status = 'pending') {
  return getJson(`/api/admin/subscription-requests?status=${status}`, token);
}

export function approveSubscriptionRequest(id, token) {
  return sendJson(`/api/admin/subscription-requests/${id}/approve`, 'POST', undefined, token);
}

export function rejectSubscriptionRequest(id, token) {
  return sendJson(`/api/admin/subscription-requests/${id}/reject`, 'POST', undefined, token);
}
