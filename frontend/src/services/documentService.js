import { buildQuery } from '../utils/form';
import { getJson, sendForm, sendJson } from './apiClient';

export function listDocuments(filters, token) {
  const query = buildQuery(filters);
  return getJson(`/api/documents${query ? `?${query}` : ''}`, token);
}

export function getDocument(documentId, token) {
  return getJson(`/api/documents/${documentId}`, token);
}

export function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append('document', file);
  return sendForm('/api/documents/upload', formData, token);
}

export function extractDocument(file, token) {
  const formData = new FormData();
  formData.append('document', file);
  return sendForm('/api/documents/extract', formData, token);
}

export function saveDocumentReview(documentId, data, token) {
  return sendJson(`/api/documents/${documentId}/review`, 'PUT', { data }, token);
}

export function approveDocument(documentId, data, token) {
  return sendJson(`/api/documents/${documentId}/approve`, 'POST', { data }, token);
}

