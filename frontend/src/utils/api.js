import axios from 'axios';

// Use env in production, fallback for local
const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // important for cookies if used
});

// 🔐 Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Token error:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired / invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Optional: handle server down
    if (!error.response) {
      console.error('Server not reachable');
    }

    return Promise.reject(error);
  }
);

export default api;