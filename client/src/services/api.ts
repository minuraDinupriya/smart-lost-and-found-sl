import axios from 'axios';

// Initialize global Axios instance targeting our Express backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Read the token securely from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, inject it into the Authorization header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
