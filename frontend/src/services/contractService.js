import { buildQuery } from '../utils/form';
import { downloadBlob, getJson, sendForm } from './apiClient';

export function listContracts(filters, token) {
  const query = buildQuery(filters);
  return getJson(`/api/contracts${query ? `?${query}` : ''}`, token);
}

export function getContract(contractId, token) {
  return getJson(`/api/contracts/${contractId}`, token);
}

export function getContractFile(contractId, token) {
  return downloadBlob(`/api/contracts/${contractId}/file`, token, 'Файлът не може да бъде зареден.');
}

export function uploadContract(file, token) {
  const formData = new FormData();
  formData.append('document', file);
  return sendForm('/api/contracts/upload', formData, token);
}

export function extractContract(file, token) {
  const formData = new FormData();
  formData.append('document', file);
  return sendForm('/api/contracts/extract', formData, token);
}
