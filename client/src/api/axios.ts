import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Extremely important: this ensures cookies are sent with every request
});

api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;
    // Don't retry auth routes to prevent loops
    if (originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Hitting refresh will yield a new accessToken cookie via Set-Cookie headers
        await axios.post('http://localhost:3000/api/auth/refresh', {}, { withCredentials: true });
        
        // Since we are using HTTP-Only cookies, simply retrying the request is enough.
        // The browser will automatically attach the newly minted access token cookie.
        return api(originalRequest);
      } catch (err) {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
