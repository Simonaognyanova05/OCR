export function getFieldValue(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

export function setFieldValue(object, path, value) {
  const keys = path.split('.');
  const next = structuredClone(object);
  let current = next;

  for (const key of keys.slice(0, -1)) {
    current[key] = current[key] || {};
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return next;
}

export function parseValue(value, type) {
  if (value === '') return null;
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value);
  });
  return query.toString();
}

