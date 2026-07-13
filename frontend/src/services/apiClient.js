import { API_BASE_URL } from '../config/api';

async function parseJsonResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Заявката не беше успешна.');
  }
  return data;
}

export function authHeaders(token, extraHeaders = {}) {
  return { ...extraHeaders, Authorization: `Bearer ${token}` };
}

export async function getJson(path, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? authHeaders(token) : undefined,
  });
  return parseJsonResponse(response);
}

export async function sendJson(path, method, body, token) {
  const options = {
    method,
    headers: token
      ? authHeaders(token, { 'Content-Type': 'application/json' })
      : { 'Content-Type': 'application/json' },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  return parseJsonResponse(response);
}

export async function sendForm(path, formData, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  return parseJsonResponse(response);
}

export async function downloadBlob(path, token, fallbackMessage) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data?.error?.message || fallbackMessage);
  }

  return response.blob();
}

export function downloadBrowserFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
