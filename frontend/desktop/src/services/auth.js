import api from './api';

const TOKEN_KEY = 'ikhaya_token';
const REFRESH_KEY = 'ikhaya_refresh';
const USER_KEY = 'ikhaya_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function login(username, password) {
  const { data } = await api.post('/api/auth/login', { username, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  try {
    await api.post('/api/auth/logout', {
      refreshToken: localStorage.getItem(REFRESH_KEY),
    });
  } catch {
    // Best-effort logout — always clear local state
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
