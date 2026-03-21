import axios from 'axios';
import { dispatchApiError } from '../context/ApiStatusContext';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ikhaya_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 clear token and redirect; report all 4xx/5xx to ApiStatusContext
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    if (status === 401) {
      localStorage.removeItem('ikhaya_token');
      localStorage.removeItem('ikhaya_user');
      window.location.href = '/login';
    } else if (status >= 400) {
      dispatchApiError(status, url);
    }
    return Promise.reject(error);
  }
);

export default api;
