import axios from 'axios';

// Central axios instance — all API calls go through here
// This way we only configure base URL and auth headers once
const api = axios.create({
  baseURL: '/api',  // Vite proxy forwards this to http://localhost:5000/api
});

// Request interceptor — automatically adds JWT token to every request
// Instead of manually adding token in every component, we do it here once
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — if token expired, log user out automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
