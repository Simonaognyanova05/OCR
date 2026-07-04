const configuredApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');
